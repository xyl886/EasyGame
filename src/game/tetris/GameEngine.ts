import type { BaseGame } from '../base/BaseGame'
import type { Direction, Rotation, ActivePiece, TetrisState, TetrisConfig } from './types'
import {
  TETROMINOES,
  SPEED_INTERVAL,
  MIN_TICK_INTERVAL,
  SPEEDUP_PER_LEVEL,
  LINES_PER_LEVEL,
  LINE_SCORES,
  SOFT_DROP_SCORE,
  HARD_DROP_SCORE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SPAWN_X,
  SPAWN_Y,
  clampPreviewCount,
  clampSpeed,
  clampTargetLines,
  DEFAULT_CONFIG,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_SCORE_KEY_PREFIX = 'easygame-tetris-best'

/** 7 种方块 id 列表（用于 Bag-7 随机器） */
const PIECE_IDS = [1, 2, 3, 4, 5, 6, 7]

/** Bag-7 随机器：每 7 个为一袋，洗牌后顺序消费 */
function shuffleBag(): number[] {
  const bag = [...PIECE_IDS]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

/** 取方块在指定旋转号下的所有单元格偏移 */
function cellsOf(piece: { type: number; rotation: number }): Array<[number, number]> {
  return TETROMINOES[piece.type].rotations[piece.rotation]
}

/**
 * 俄罗斯方块核心引擎
 * 纯 TS 实现，不依赖 Vue/DOM，可直接迁移到小程序。
 * 实现 BaseGame 接口；额外暴露 step() 供视图层 tick 调用、rotate()/hardDrop()/hold() 等专属方法。
 */
export class TetrisEngine implements BaseGame<TetrisState, Direction> {
  private config: TetrisConfig
  private grid: number[][]
  private current: ActivePiece | null = null
  private nextQueue: number[] = []
  private heldPiece: number | null = null
  private canHold = true
  private score = 0
  private bestScore = 0
  private bestScoreKey: string
  private level = 1
  private lines = 0
  private over = false
  private won = false
  private paused = false
  private moveCount = 0
  private startTime = 0
  private tickInterval: number
  private readonly width = BOARD_WIDTH
  private readonly height = BOARD_HEIGHT

  constructor(config: Partial<TetrisConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
    this.config.speed = clampSpeed(this.config.speed)
    this.config.targetLines = clampTargetLines(this.config.targetLines)
    this.config.previewCount = clampPreviewCount(this.config.previewCount)
    // 最高分按速度+目标分键（不同维度不可比）
    this.bestScoreKey = `${BEST_SCORE_KEY_PREFIX}-${this.config.speed}-${this.config.targetLines}`
    const stored = StorageAdapter.get<number>(this.bestScoreKey)
    this.bestScore = stored ?? 0
    this.tickInterval = SPEED_INTERVAL[this.config.speed]
    this.grid = this.emptyGrid()
    this.init()
  }

  getConfig(): TetrisConfig {
    return { ...this.config }
  }

  private emptyGrid(): number[][] {
    return Array.from({ length: this.height }, () => Array<number>(this.width).fill(0))
  }

  /** 初始化/重置游戏状态 */
  private init(): void {
    this.grid = this.emptyGrid()
    this.nextQueue = []
    this.refillQueue()
    this.heldPiece = null
    this.canHold = true
    this.score = 0
    this.level = 1
    this.lines = 0
    this.over = false
    this.won = false
    this.paused = false
    this.moveCount = 0
    this.startTime = Date.now()
    this.tickInterval = SPEED_INTERVAL[this.config.speed]
    this.spawnNext()
  }

  /** 把队列补足到至少 7 个（保持 bag-7 特性） */
  private refillQueue(): void {
    while (this.nextQueue.length < 7) {
      this.nextQueue.push(...shuffleBag())
    }
  }

  /** 从队列取出下一个方块，并触发 spawn */
  private spawnNext(): void {
    this.refillQueue()
    const type = this.nextQueue.shift() as number
    this.refillQueue()
    this.current = {
      type,
      rotation: 0,
      x: SPAWN_X,
      y: SPAWN_Y,
    }
    this.canHold = true
    // spawn 即碰撞 → game over
    if (this.collides(this.current)) {
      this.over = true
    }
    // 胜利判定（消除行数达标）
    if (!this.over && this.config.targetLines > 0 && this.lines >= this.config.targetLines) {
      this.won = true
      this.over = true
    }
  }

  /** 检测方块在指定位置/旋转下是否碰撞（墙/底/已锁定格） */
  private collides(piece: ActivePiece): boolean {
    const cells = cellsOf(piece)
    for (const [dx, dy] of cells) {
      const x = piece.x + dx
      const y = piece.y + dy
      if (x < 0 || x >= this.width || y >= this.height) return true
      if (y >= 0 && this.grid[y][x] !== 0) return true
    }
    return false
  }

  /** 尝试把当前方块平移 (dx, dy)，返回是否成功 */
  private tryShift(dx: number, dy: number): boolean {
    if (!this.current) return false
    const moved: ActivePiece = { ...this.current, x: this.current.x + dx, y: this.current.y + dy }
    if (this.collides(moved)) return false
    this.current = moved
    return true
  }

  /**
   * 旋转当前方块，带简易墙踢（wall kick）：
   * 依次尝试原位、(-1,0)、(1,0)、(0,-1)、(-1,-1)、(1,-1)、(-2,0)、(2,0) 偏移。
   * O 方块永远不变。
   */
  rotate(dir: Rotation): boolean {
    if (this.over || this.paused || !this.current) return false
    if (this.current.type === 2) return false // O 不旋转
    const newRotation = (this.current.rotation + (dir === 'cw' ? 1 : 3)) % 4
    const candidate: ActivePiece = { ...this.current, rotation: newRotation }
    const kicks: Array<[number, number]> = [
      [0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [2, 0],
    ]
    for (const [kx, ky] of kicks) {
      const test = { ...candidate, x: candidate.x + kx, y: candidate.y + ky }
      if (!this.collides(test)) {
        this.current = test
        this.moveCount++
        return true
      }
    }
    return false
  }

  /** 玩家输入方向：left/right 为水平移动，down 为软降 */
  move(direction: Direction): boolean {
    if (this.over || this.paused || !this.current) return false
    let ok = false
    if (direction === 'left') ok = this.tryShift(-1, 0)
    else if (direction === 'right') ok = this.tryShift(1, 0)
    else if (direction === 'down') {
      ok = this.tryShift(0, 1)
      if (ok) {
        this.score += SOFT_DROP_SCORE
        this.updateBestScore()
      }
    }
    if (ok) this.moveCount++
    return ok
  }

  /** 硬降：直接落到底并锁定，每下降 1 格 +2 分 */
  hardDrop(): boolean {
    if (this.over || this.paused || !this.current) return false
    let drop = 0
    while (this.tryShift(0, 1)) drop++
    this.score += drop * HARD_DROP_SCORE
    this.moveCount++
    this.lockPiece()
    return true
  }

  /** Hold：把当前方块与 hold 槽交换，每个方块只能 hold 一次 */
  hold(): boolean {
    if (this.over || this.paused || !this.current || !this.config.holdPiece || !this.canHold) return false
    const currentType = this.current.type
    if (this.heldPiece === null) {
      this.heldPiece = currentType
      this.spawnNext()
    } else {
      const swapType = this.heldPiece
      this.heldPiece = currentType
      this.current = {
        type: swapType,
        rotation: 0,
        x: SPAWN_X,
        y: SPAWN_Y,
      }
      if (this.collides(this.current)) this.over = true
    }
    this.canHold = false
    this.moveCount++
    return true
  }

  /** 锁定当前方块到 grid，并清除满行 */
  private lockPiece(): void {
    if (!this.current) return
    const cells = cellsOf(this.current)
    for (const [dx, dy] of cells) {
      const x = this.current.x + dx
      const y = this.current.y + dy
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        this.grid[y][x] = this.current.type
      }
    }
    this.current = null
    const cleared = this.clearLines()
    if (cleared > 0) {
      this.lines += cleared
      this.score += LINE_SCORES[cleared] * this.level
      // 等级提升
      const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1
      if (newLevel > this.level) {
        this.level = newLevel
        this.tickInterval = Math.max(MIN_TICK_INTERVAL, this.tickInterval - SPEEDUP_PER_LEVEL)
      }
    }
    this.updateBestScore()
    // 胜利判定
    if (!this.over && this.config.targetLines > 0 && this.lines >= this.config.targetLines) {
      this.won = true
      this.over = true
      return
    }
    this.spawnNext()
  }

  /** 清除满行并把上方下移，返回清除的行数 */
  private clearLines(): number {
    let cleared = 0
    for (let y = this.height - 1; y >= 0; y--) {
      if (this.grid[y].every((c) => c !== 0)) {
        this.grid.splice(y, 1)
        this.grid.unshift(Array<number>(this.width).fill(0))
        cleared++
        y++ // 同一索引继续检查（因为上方下移了）
      }
    }
    return cleared
  }

  /** 计算鬼影方块的落点 y */
  private computeGhostY(): number {
    if (!this.current) return -1
    let ghost: ActivePiece = { ...this.current }
    while (!this.collides({ ...ghost, y: ghost.y + 1 })) {
      ghost = { ...ghost, y: ghost.y + 1 }
    }
    return ghost.y
  }

  /**
   * 推进一帧（由视图层 setInterval/setTimeout 调用）
   * - 若未暂停/未结束，尝试让当前方块下落 1 格
   * - 不能下落则锁定并生成下一个方块
   * @returns 是否发生变化
   */
  step(): boolean {
    if (this.over || this.paused) return false
    if (!this.current) {
      this.spawnNext()
      return true
    }
    if (!this.tryShift(0, 1)) {
      // 软降失败 → 锁定
      this.lockPiece()
    }
    this.moveCount++
    return true
  }

  togglePause(): void {
    if (this.over) return
    this.paused = !this.paused
  }

  isPaused(): boolean {
    return this.paused
  }

  getTickInterval(): number {
    return this.tickInterval
  }

  getState(): TetrisState {
    return {
      grid: this.grid.map((row) => [...row]),
      current: this.current ? { ...this.current } : null,
      next: [...this.nextQueue],
      hold: this.heldPiece,
      canHold: this.canHold,
      ghostY: this.config.ghostPiece ? this.computeGhostY() : -1,
      score: this.score,
      bestScore: this.bestScore,
      level: this.level,
      lines: this.lines,
      over: this.over,
      won: this.won,
      paused: this.paused,
      tickInterval: this.tickInterval,
      moveCount: this.moveCount,
      startTime: this.startTime,
      width: this.width,
      height: this.height,
      speed: this.config.speed,
      targetLines: this.config.targetLines,
      hardDrop: this.config.hardDrop,
      ghostPiece: this.config.ghostPiece,
      holdPiece: this.config.holdPiece,
      previewCount: this.config.previewCount,
    }
  }

  loadState(state: TetrisState): void {
    this.grid = state.grid.map((row) => [...row])
    this.current = state.current ? { ...state.current } : null
    this.nextQueue = [...state.next]
    this.heldPiece = state.hold
    this.canHold = state.canHold
    this.score = state.score
    this.bestScore = state.bestScore
    this.level = state.level
    this.lines = state.lines
    this.over = state.over
    this.won = state.won
    this.paused = state.paused
    this.tickInterval = state.tickInterval
    this.moveCount = state.moveCount
    this.startTime = state.startTime
  }

  isGameOver(): boolean {
    return this.over
  }

  isWin(): boolean {
    return this.won
  }

  reset(): void {
    this.init()
  }

  getScore(): number {
    return this.score
  }

  private updateBestScore(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
  }
}

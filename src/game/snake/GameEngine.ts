import type { BaseGame } from '../base/BaseGame'
import type { Direction, SnakeState, SnakeConfig, Point, Food, Obstacle } from './types'
import {
  SPEED_INTERVAL,
  SPEEDUP_PER_FOOD,
  MIN_TICK_INTERVAL,
  MULTI_FOOD_COUNT,
  BONUS_FOOD_RATIO,
  BONUS_SCORE,
  clampSize,
  DEFAULT_CONFIG,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_SCORE_KEY_PREFIX = 'easygame-snake-best'

let foodIdCounter = 1
let obstacleIdCounter = 1

function nextFoodId(): number {
  return foodIdCounter++
}
function nextObstacleId(): number {
  return obstacleIdCounter++
}

const DIR_DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

/**
 * 贪吃蛇核心引擎
 * 纯 TS 实现，不依赖 Vue/DOM，可直接迁移到小程序。
 * 实现 BaseGame 接口；额外暴露 step() 供视图层 tick 调用。
 */
export class SnakeEngine implements BaseGame<SnakeState, Direction> {
  private config: SnakeConfig
  private size: number
  private snake: Point[] = []
  private foods: Food[] = []
  private obstacles: Obstacle[] = []
  private direction: Direction = 'right'
  private nextDirection: Direction = 'right'
  private score = 0
  private bestScore = 0
  private bestScoreKey: string
  private over = false
  private won = false
  private paused = false
  private moveCount = 0
  private startTime = 0
  private tickInterval: number

  constructor(config: Partial<SnakeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.config.size = clampSize(this.config.size)
    this.size = this.config.size
    // 最高分按尺寸+速度分键
    this.bestScoreKey = `${BEST_SCORE_KEY_PREFIX}-${this.size}-${this.config.speed}`
    const stored = StorageAdapter.get<number>(this.bestScoreKey)
    this.bestScore = stored ?? 0
    this.tickInterval = SPEED_INTERVAL[this.config.speed]
    this.init()
  }

  getConfig(): SnakeConfig {
    return { ...this.config }
  }

  /** 初始化/重置游戏状态 */
  private init(): void {
    const mid = Math.floor(this.size / 2)
    // 蛇从棋盘左侧 1/4 处出发，水平向右生长 3 节，给玩家充足反应空间
    const startX = Math.max(2, Math.floor(this.size / 4))
    this.snake = [
      { x: startX, y: mid },
      { x: startX - 1, y: mid },
      { x: startX - 2, y: mid },
    ]
    this.direction = 'right'
    this.nextDirection = 'right'
    this.score = 0
    this.over = false
    this.won = false
    this.paused = false
    this.moveCount = 0
    this.startTime = Date.now()
    this.tickInterval = SPEED_INTERVAL[this.config.speed]
    this.foods = []
    this.obstacles = []
    this.generateObstacles()
    this.refillFoods()
  }

  /** 随机生成障碍物：避开蛇身和蛇头前方 3 格内 */
  private generateObstacles(): void {
    const count = this.config.obstacleCount
    if (count <= 0) return
    const occupied = new Set(this.snake.map((p) => `${p.x},${p.y}`))
    const head = this.snake[0]
    const candidates: Point[] = []
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (occupied.has(`${x},${y}`)) continue
        // 避免紧贴蛇头（曼哈顿距离 < 3）
        if (Math.abs(x - head.x) + Math.abs(y - head.y) < 3) continue
        candidates.push({ x, y })
      }
    }
    // Fisher-Yates 洗牌
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      this.obstacles.push({ id: nextObstacleId(), pos: candidates[i] })
    }
  }

  /** 取当前所有空位（非蛇身/食物/障碍） */
  private get emptyCells(): Point[] {
    const occupied = new Set<string>()
    for (const p of this.snake) occupied.add(`${p.x},${p.y}`)
    for (const f of this.foods) occupied.add(`${f.pos.x},${f.pos.y}`)
    for (const o of this.obstacles) occupied.add(`${o.pos.x},${o.pos.y}`)
    const empties: Point[] = []
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!occupied.has(`${x},${y}`)) empties.push({ x, y })
      }
    }
    return empties
  }

  private spawnFood(): void {
    const empties = this.emptyCells
    if (empties.length === 0) return
    const pos = empties[Math.floor(Math.random() * empties.length)]
    this.foods.push({
      id: nextFoodId(),
      pos,
      type: Math.random() < BONUS_FOOD_RATIO ? 'bonus' : 'normal',
    })
  }

  /** 把食物补到目标数量（普通模式 1 个，多食物模式 3 个） */
  private refillFoods(): void {
    const target = this.config.multiFood ? MULTI_FOOD_COUNT : 1
    while (this.foods.length < target) {
      const before = this.foods.length
      this.spawnFood()
      if (this.foods.length === before) break // 棋盘满了
    }
  }

  /**
   * 推进一帧（由视图层 setInterval/setTimeout 调用）
   * @returns 是否发生变化
   */
  step(): boolean {
    if (this.over || this.paused) return false
    this.direction = this.nextDirection
    const delta = DIR_DELTA[this.direction]
    const head = this.snake[0]
    let newHead: Point
    if (this.config.wallThrough) {
      newHead = {
        x: (head.x + delta.x + this.size) % this.size,
        y: (head.y + delta.y + this.size) % this.size,
      }
    } else {
      newHead = { x: head.x + delta.x, y: head.y + delta.y }
      if (
        newHead.x < 0 ||
        newHead.x >= this.size ||
        newHead.y < 0 ||
        newHead.y >= this.size
      ) {
        this.over = true
        return true
      }
    }
    // 撞自己：尾巴下一帧会移动，所以最后一节不算（除非即将吃食物导致不缩短）
    // 简化处理：检查除尾巴外的所有节
    const bodyToCheck = this.snake.slice(0, -1)
    if (bodyToCheck.some((p) => p.x === newHead.x && p.y === newHead.y)) {
      this.over = true
      return true
    }
    // 撞障碍
    if (this.obstacles.some((o) => o.pos.x === newHead.x && o.pos.y === newHead.y)) {
      this.over = true
      return true
    }

    this.snake.unshift(newHead)
    // 检查吃食物
    const foodIdx = this.foods.findIndex(
      (f) => f.pos.x === newHead.x && f.pos.y === newHead.y,
    )
    if (foodIdx >= 0) {
      const food = this.foods[foodIdx]
      this.score += food.type === 'bonus' ? BONUS_SCORE : 1
      this.foods.splice(foodIdx, 1)
      this.refillFoods()
      // 加速
      this.tickInterval = Math.max(MIN_TICK_INTERVAL, this.tickInterval - SPEEDUP_PER_FOOD)
      // 胜利判定
      if (this.config.winLength > 0 && this.snake.length >= this.config.winLength) {
        this.won = true
        this.over = true
      }
    } else {
      this.snake.pop()
    }

    this.moveCount++
    this.updateBestScore()
    return true
  }

  /** 玩家输入方向。返回是否接受（拒绝反向或游戏结束） */
  move(direction: Direction): boolean {
    if (this.over) return false
    // 防止蛇头直接掉头
    if (isOpposite(direction, this.direction)) return false
    this.nextDirection = direction
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

  getState(): SnakeState {
    return {
      snake: this.snake.map((p) => ({ ...p })),
      foods: this.foods.map((f) => ({ ...f, pos: { ...f.pos } })),
      obstacles: this.obstacles.map((o) => ({ ...o, pos: { ...o.pos } })),
      direction: this.direction,
      nextDirection: this.nextDirection,
      score: this.score,
      bestScore: this.bestScore,
      over: this.over,
      won: this.won,
      tickInterval: this.tickInterval,
      size: this.size,
      paused: this.paused,
      moveCount: this.moveCount,
      startTime: this.startTime,
      speed: this.config.speed,
      wallThrough: this.config.wallThrough,
      multiFood: this.config.multiFood,
      obstacleCount: this.config.obstacleCount,
      winLength: this.config.winLength,
    }
  }

  loadState(state: SnakeState): void {
    this.size = state.size
    this.config.size = state.size
    this.snake = state.snake.map((p) => ({ ...p }))
    this.foods = state.foods.map((f) => ({ ...f, pos: { ...f.pos } }))
    this.obstacles = state.obstacles.map((o) => ({ ...o, pos: { ...o.pos } }))
    this.direction = state.direction
    this.nextDirection = state.nextDirection
    this.score = state.score
    this.bestScore = state.bestScore
    this.over = state.over
    this.won = state.won
    this.paused = state.paused
    this.moveCount = state.moveCount
    this.startTime = state.startTime
    this.tickInterval = state.tickInterval
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

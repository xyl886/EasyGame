/**
 * 华容道（数字滑块 / 15-puzzle）核心引擎
 * 纯 TS 实现，不依赖 Vue/DOM，可直接迁移到小程序。
 *
 * 规则：N×N 棋盘上编号 1..N²-1 的数字 + 1 个空格，
 * 通过滑动把数字按顺序排好（1 在左上角，空格在右下角）即获胜。
 *
 * 方向语义：方向 = 「数字」移动的方向，空格向反方向移动一格。
 * 例：按 ← = 空格右边的数字向左移入空格（空格右移一格）。
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  KlotskiState,
  KlotskiConfig,
  KlotskiDirection,
} from './types'
import {
  SHUFFLE_STEPS,
  clampSize,
  DEFAULT_CONFIG,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-klotski-best'

const OPPOSITE: Record<KlotskiDirection, KlotskiDirection> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
}

/** 生成解状态棋盘 */
function solvedBoard(size: number): number[] {
  const board: number[] = []
  for (let i = 1; i < size * size; i++) board.push(i)
  board.push(0) // 空格在右下角
  return board
}

export class KlotskiEngine implements BaseGame<KlotskiState, KlotskiDirection> {
  private config: KlotskiConfig
  private size: number
  private board: number[] = []
  private emptyIndex = 0
  private moves = 0
  private startTime = 0
  private won = false
  private bestMoves = 0
  private bestMovesKey: string
  /** 撤销历史：记录每次移动前的空格位置 */
  private history: number[] = []

  constructor(config: Partial<KlotskiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.config.size = clampSize(this.config.size)
    this.size = this.config.size
    this.bestMovesKey = `${BEST_KEY_PREFIX}-${this.size}-${this.config.difficulty}`
    this.bestMoves = StorageAdapter.get<number>(this.bestMovesKey) ?? 0
    this.init()
  }

  getConfig(): KlotskiConfig {
    return { ...this.config }
  }

  /** 初始化/重置：从解状态随机打乱（保证可解） */
  private init(): void {
    this.board = solvedBoard(this.size)
    this.emptyIndex = this.size * this.size - 1
    this.shuffle(SHUFFLE_STEPS[this.size][this.config.difficulty])
    this.moves = 0
    this.startTime = Date.now()
    this.won = false
    this.history = []
  }

  /** 随机打乱：做 steps 次随机合法移动，避免无意义往返 */
  private shuffle(steps: number): void {
    let lastDir: KlotskiDirection | null = null
    for (let i = 0; i < steps; i++) {
      const dirs = this.validNumDirs()
      let pool: KlotskiDirection[] = dirs
      if (lastDir !== null) {
        const opposite = OPPOSITE[lastDir]
        const filtered = dirs.filter((d) => d !== opposite)
        if (filtered.length > 0) pool = filtered
      }
      const dir = pool[Math.floor(Math.random() * pool.length)]
      this.applyMove(dir)
      lastDir = dir
    }
  }

  /** 当前空格可用的「数字移动方向」 */
  private validNumDirs(): KlotskiDirection[] {
    const row = Math.floor(this.emptyIndex / this.size)
    const col = this.emptyIndex % this.size
    const dirs: KlotskiDirection[] = []
    if (col < this.size - 1) dirs.push('left') // 右边有数字，可左移
    if (col > 0) dirs.push('right') // 左边有数字，可右移
    if (row < this.size - 1) dirs.push('up') // 下方有数字，可上移
    if (row > 0) dirs.push('down') // 上方有数字，可下移
    return dirs
  }

  /** 数字朝 dir 移动后，空格应移到的目标位置；非法返回 -1 */
  private targetEmpty(dir: KlotskiDirection): number {
    const row = Math.floor(this.emptyIndex / this.size)
    const col = this.emptyIndex % this.size
    switch (dir) {
      case 'left':
        return col < this.size - 1 ? this.emptyIndex + 1 : -1
      case 'right':
        return col > 0 ? this.emptyIndex - 1 : -1
      case 'up':
        return row < this.size - 1 ? this.emptyIndex + this.size : -1
      case 'down':
        return row > 0 ? this.emptyIndex - this.size : -1
    }
  }

  private swap(a: number, b: number): void {
    const tmp = this.board[a]
    this.board[a] = this.board[b]
    this.board[b] = tmp
  }

  /** 执行一次移动（不计数，用于打乱） */
  private applyMove(dir: KlotskiDirection): void {
    const target = this.targetEmpty(dir)
    if (target < 0) return
    this.swap(this.emptyIndex, target)
    this.emptyIndex = target
  }

  private isSolved(): boolean {
    const total = this.size * this.size
    for (let i = 0; i < total - 1; i++) {
      if (this.board[i] !== i + 1) return false
    }
    return this.board[total - 1] === 0
  }

  private updateBest(): void {
    if (this.bestMoves === 0 || this.moves < this.bestMoves) {
      this.bestMoves = this.moves
      StorageAdapter.set(this.bestMovesKey, this.bestMoves)
    }
  }

  /** 执行一步（方向 = 数字移动方向）。返回是否发生变化 */
  move(dir: KlotskiDirection): boolean {
    if (this.won) return false
    const target = this.targetEmpty(dir)
    if (target < 0) return false
    this.history.push(this.emptyIndex)
    this.swap(this.emptyIndex, target)
    this.emptyIndex = target
    this.moves++
    if (this.isSolved()) {
      this.won = true
      this.updateBest()
    }
    return true
  }

  /** 撤销一步（仅未完成时可用） */
  undo(): boolean {
    if (this.won || this.history.length === 0) return false
    const prevEmpty = this.history.pop()!
    this.swap(this.emptyIndex, prevEmpty)
    this.emptyIndex = prevEmpty
    this.moves--
    return true
  }

  canUndo(): boolean {
    return !this.won && this.history.length > 0
  }

  getState(): KlotskiState {
    return {
      board: [...this.board],
      size: this.size,
      moves: this.moves,
      startTime: this.startTime,
      bestMoves: this.bestMoves,
      won: this.won,
      over: this.won,
      difficulty: this.config.difficulty,
    }
  }

  loadState(state: KlotskiState): void {
    this.size = state.size
    this.config.size = state.size
    this.board = [...state.board]
    this.emptyIndex = this.board.indexOf(0)
    this.moves = state.moves
    this.startTime = state.startTime
    this.won = state.won
    this.history = []
    // 重新读取历史最少步数（存档不携带，避免被篡改）
    this.bestMovesKey = `${BEST_KEY_PREFIX}-${this.size}-${state.difficulty}`
    this.config.difficulty = state.difficulty
    this.bestMoves = StorageAdapter.get<number>(this.bestMovesKey) ?? 0
  }

  isGameOver(): boolean {
    return this.won
  }

  isWin(): boolean {
    return this.won
  }

  reset(): void {
    this.init()
  }

  getScore(): number {
    return this.moves
  }
}

/**
 * 数独引擎（纯 TS，无 DOM 依赖）
 *
 * 规则：9×9 盘面，每行/列/3×3 宫填入 1-9 不重复。
 * 初始给定提示格不可改；玩家填入其余格，全部填对即获胜。
 * 提供冲突检测（红色标记）、撤销、最快完成用时持久化。
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  SudokuState,
  SudokuConfig,
} from './types'
import { SIZE, HOLES_BY_DIFFICULTY, DEFAULT_SUDOKU_CONFIG } from './types'
import { generatePuzzle } from './generator'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-sudoku-best'

/** 返回与给定格同行/列/宫的冲突格集合（含给定格自身），用于红色高亮 */
export function findConflicts(
  grid: number[][],
  r: number,
  c: number,
): Set<string> {
  const conflicts = new Set<string>()
  const v = grid[r][c]
  if (v === 0) return conflicts
  const add = (i: number, j: number) => {
    if ((i !== r || j !== c) && grid[i][j] === v) {
      conflicts.add(`${i},${j}`)
      conflicts.add(`${r},${c}`)
    }
  }
  for (let i = 0; i < SIZE; i++) {
    add(r, i)
    add(i, c)
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = br; i < br + 3; i++) {
    for (let j = bc; j < bc + 3; j++) {
      add(i, j)
    }
  }
  return conflicts
}

export class SudokuEngine implements BaseGame<SudokuState, number> {
  private config: SudokuConfig
  private grid: number[][] = []
  private given: boolean[][] = []
  private solution: number[][] = []
  private selected: { row: number; col: number } | null = null
  private moves = 0
  private startTime = 0
  private won = false
  private bestTime = 0
  private bestTimeKey: string
  private history: Array<{ row: number; col: number; prev: number; next: number }> = []

  constructor(config: Partial<SudokuConfig> = {}) {
    this.config = { ...DEFAULT_SUDOKU_CONFIG, ...config }
    this.bestTimeKey = `${BEST_KEY_PREFIX}-${this.config.difficulty}`
    this.bestTime = StorageAdapter.get<number>(this.bestTimeKey) ?? 0
    this.init()
  }

  getConfig(): SudokuConfig {
    return { ...this.config }
  }

  private init(): void {
    const { puzzle, solution } = generatePuzzle(HOLES_BY_DIFFICULTY[this.config.difficulty])
    this.grid = puzzle.map((row) => [...row])
    this.given = puzzle.map((row) => row.map((v) => v !== 0))
    this.solution = solution
    this.selected = null
    this.moves = 0
    this.startTime = Date.now()
    this.won = false
    this.history = []
  }

  /** 选中格子（null 取消） */
  select(row: number, col: number): void {
    if (this.won) return
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
      this.selected = null
      return
    }
    this.selected = { row, col }
  }

  getSelected(): { row: number; col: number } | null {
    return this.selected
  }

  /** 在选中格填入数字（给定格不可改）。返回是否变化 */
  input(num: number): boolean {
    if (this.won || !this.selected) return false
    const { row, col } = this.selected
    if (this.given[row][col]) return false
    if (num < 1 || num > 9 || this.grid[row][col] === num) return false
    this.history.push({ row, col, prev: this.grid[row][col], next: num })
    this.grid[row][col] = num
    this.moves++
    if (this.isSolved()) {
      this.won = true
      this.updateBest()
    }
    return true
  }

  /** BaseGame 接口：move = 在选中格填数 */
  move(num: number): boolean {
    return this.input(num)
  }

  /** 擦除选中格数字（给定格不可擦）。返回是否变化 */
  erase(): boolean {
    if (this.won || !this.selected) return false
    const { row, col } = this.selected
    if (this.given[row][col] || this.grid[row][col] === 0) return false
    this.history.push({ row, col, prev: this.grid[row][col], next: 0 })
    this.grid[row][col] = 0
    this.moves++
    return true
  }

  /** 撤销一步（仅未完成时可用） */
  undo(): boolean {
    if (this.won || this.history.length === 0) return false
    const last = this.history.pop()!
    this.grid[last.row][last.col] = last.prev
    this.moves--
    return true
  }

  canUndo(): boolean {
    return !this.won && this.history.length > 0
  }

  /** 当前所有冲突格（红标） */
  conflictCells(): Set<string> {
    const all = new Set<string>()
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === 0) continue
        const set = findConflicts(this.grid, r, c)
        for (const k of set) all.add(k)
      }
    }
    return all
  }

  private isSolved(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.grid[r][c] !== this.solution[r][c]) return false
      }
    }
    return true
  }

  private updateBest(): void {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000)
    if (this.bestTime === 0 || elapsed < this.bestTime) {
      this.bestTime = elapsed
      StorageAdapter.set(this.bestTimeKey, this.bestTime)
    }
  }

  getState(): SudokuState {
    return {
      grid: this.grid.map((row) => [...row]),
      given: this.given.map((row) => [...row]),
      selected: this.selected ? { ...this.selected } : null,
      moves: this.moves,
      startTime: this.startTime,
      bestTime: this.bestTime,
      won: this.won,
      over: this.won,
      difficulty: this.config.difficulty,
      history: this.history.map((h) => ({ ...h })),
    }
  }

  loadState(state: SudokuState): void {
    this.grid = state.grid.map((row) => [...row])
    this.given = state.given.map((row) => [...row])
    this.selected = state.selected ? { ...state.selected } : null
    this.moves = state.moves
    this.startTime = state.startTime
    this.won = state.won
    this.history = state.history.map((h) => ({ ...h }))
    this.config.difficulty = state.difficulty
    this.bestTimeKey = `${BEST_KEY_PREFIX}-${state.difficulty}`
    this.bestTime = StorageAdapter.get<number>(this.bestTimeKey) ?? 0
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

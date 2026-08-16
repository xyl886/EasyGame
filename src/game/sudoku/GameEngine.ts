/**
 * 数独引擎（纯 TS，无 DOM 依赖）
 * 支持 4×4 / 6×6 / 9×9 三种尺寸。
 *
 * 规则：size×size 盘面，每行/列/宫（boxRows×boxCols）填入 1..size 不重复。
 * 提供：候选笔记、冲突检测、错误计数、智能提示（限次）、校验、撤销、
 * 最快完成用时持久化、自动存档。
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  SudokuState,
  SudokuConfig,
  SudokuSpec,
} from './types'
import { specOf, HOLES_BY_DIFFICULTY, DEFAULT_SUDOKU_CONFIG, MAX_HINTS } from './types'
import { generatePuzzle, canPlace } from './generator'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-sudoku-best'

/** 返回与给定格同行/列/宫数值相同的冲突格集合（含给定格自身） */
export function findConflicts(
  grid: number[][],
  spec: SudokuSpec,
  r: number,
  c: number,
): Set<string> {
  const conflicts = new Set<string>()
  const v = grid[r][c]
  if (v === 0) return conflicts
  const n = spec.size
  const add = (i: number, j: number) => {
    if ((i !== r || j !== c) && grid[i][j] === v) {
      conflicts.add(`${i},${j}`)
      conflicts.add(`${r},${c}`)
    }
  }
  for (let i = 0; i < n; i++) {
    add(r, i)
    add(i, c)
  }
  const br = Math.floor(r / spec.boxRows) * spec.boxRows
  const bc = Math.floor(c / spec.boxCols) * spec.boxCols
  for (let i = br; i < br + spec.boxRows; i++) {
    for (let j = bc; j < bc + spec.boxCols; j++) {
      add(i, j)
    }
  }
  return conflicts
}

export class SudokuEngine implements BaseGame<SudokuState, number> {
  private config: SudokuConfig
  private spec: SudokuSpec
  private grid: number[][] = []
  private given: boolean[][] = []
  private solution: number[][] = []
  private notes: number[][][] = []
  private selected: { row: number; col: number } | null = null
  private moves = 0
  private mistakes = 0
  private hintsUsed = 0
  private startTime = 0
  private won = false
  private bestTime = 0
  private bestTimeKey: string
  private history: Array<{ row: number; col: number; prev: number; next: number }> = []

  constructor(config: Partial<SudokuConfig> = {}) {
    this.config = { ...DEFAULT_SUDOKU_CONFIG, ...config }
    this.spec = specOf(this.config.size)
    this.bestTimeKey = `${BEST_KEY_PREFIX}-${this.config.size}-${this.config.difficulty}`
    this.bestTime = StorageAdapter.get<number>(this.bestTimeKey) ?? 0
    this.init()
  }

  getConfig(): SudokuConfig {
    return { ...this.config }
  }

  getSpec(): SudokuSpec {
    return this.spec
  }

  private emptyNotes(): number[][][] {
    return Array.from({ length: this.spec.size }, () =>
      Array.from({ length: this.spec.size }, () => [] as number[]),
    )
  }

  private init(): void {
    const { puzzle, solution } = generatePuzzle(
      this.spec,
      HOLES_BY_DIFFICULTY[this.spec.size][this.config.difficulty],
    )
    this.grid = puzzle.map((row) => [...row])
    this.given = puzzle.map((row) => row.map((v) => v !== 0))
    this.solution = solution
    this.notes = this.emptyNotes()
    this.selected = null
    this.moves = 0
    this.mistakes = 0
    this.hintsUsed = 0
    this.startTime = Date.now()
    this.won = false
    this.history = []
  }

  /** 选中格子（null/越界取消） */
  select(row: number, col: number): void {
    if (this.won) return
    const n = this.spec.size
    if (row < 0 || row >= n || col < 0 || col >= n) {
      this.selected = null
      return
    }
    this.selected = { row, col }
  }

  getSelected(): { row: number; col: number } | null {
    return this.selected
  }

  /** 在选中格填入数字（给定格不可改）。填错计入 mistakes。返回是否变化 */
  input(num: number): boolean {
    if (this.won || !this.selected) return false
    const { row, col } = this.selected
    if (this.given[row][col]) return false
    if (num < 1 || num > this.spec.size || this.grid[row][col] === num) return false
    this.history.push({ row, col, prev: this.grid[row][col], next: num })
    this.grid[row][col] = num
    this.moves++
    // 填错计数（与答案不同）
    if (num !== this.solution[row][col]) this.mistakes++
    // 填入后清除该格笔记，并自动清理同行/同列/同宫的 num 候选
    this.notes[row][col] = []
    this.removeNoteCandidates(row, col, num)
    if (this.isSolved()) {
      this.won = true
      this.updateBest()
    }
    return true
  }

  /** 填入 num 后，清理同行/同列/同宫空格中的 num 候选（标准数独辅助） */
  private removeNoteCandidates(row: number, col: number, num: number): void {
    const n = this.spec.size
    const clear = (r: number, c: number) => {
      if (this.grid[r][c] !== 0) return
      const list = this.notes[r][c]
      const idx = list.indexOf(num)
      if (idx >= 0) list.splice(idx, 1)
    }
    for (let i = 0; i < n; i++) {
      clear(row, i)
      clear(i, col)
    }
    const br = Math.floor(row / this.spec.boxRows) * this.spec.boxRows
    const bc = Math.floor(col / this.spec.boxCols) * this.spec.boxCols
    for (let i = br; i < br + this.spec.boxRows; i++) {
      for (let j = bc; j < bc + this.spec.boxCols; j++) {
        clear(i, j)
      }
    }
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

  /** 切换候选笔记：选中空格上切换 num 的候选标记 */
  toggleNote(num: number): boolean {
    if (this.won || !this.selected) return false
    const { row, col } = this.selected
    if (this.given[row][col] || this.grid[row][col] !== 0) return false
    if (num < 1 || num > this.spec.size) return false
    const list = this.notes[row][col]
    const idx = list.indexOf(num)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(num)
    return true
  }

  /** 当前格是否标记了 num 候选 */
  hasNote(row: number, col: number, num: number): boolean {
    return this.notes[row][col].includes(num)
  }

  /**
   * 智能提示：找第一个空格填入正确数字（限 MAX_HINTS 次）。
   * @returns 填入的格子位置，或 null（无空格/次数用完）
   */
  hint(): { row: number; col: number } | null {
    if (this.won || this.hintsUsed >= MAX_HINTS) return null
    const n = this.spec.size
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (this.grid[r][c] === 0 && !this.given[r][c]) {
          const v = this.solution[r][c]
          this.history.push({ row: r, col: c, prev: 0, next: v })
          this.grid[r][c] = v
          this.moves++
          this.notes[r][c] = []
          this.removeNoteCandidates(r, c, v)
          this.hintsUsed++
          if (this.isSolved()) {
            this.won = true
            this.updateBest()
          }
          return { row: r, col: c }
        }
      }
    }
    return null
  }

  /** 校验当前盘面：冲突数 / 空格数 / 是否完整且正确 */
  check(): { conflicts: number; empty: number; complete: boolean } {
    const n = this.spec.size
    let conflicts = 0
    let empty = 0
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (this.grid[r][c] === 0) {
          empty++
          continue
        }
        if (!canPlace(this.grid, this.spec, r, c, this.grid[r][c])) conflicts++
      }
    }
    return { conflicts, empty, complete: empty === 0 && conflicts === 0 }
  }

  /** 撤销一步（仅未完成时可用） */
  undo(): boolean {
    if (this.won || this.history.length === 0) return false
    const last = this.history.pop()!
    this.grid[last.row][last.col] = last.prev
    // 撤销错误计数：若撤的是首次填错，回退 mistakes（简单策略：重算）
    if (last.prev === 0) {
      // 重算 mistakes：统计当前与答案不同的已填格数
      this.mistakes = this.countMistakes()
    }
    this.moves--
    return true
  }

  private countMistakes(): number {
    const n = this.spec.size
    let m = 0
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (this.grid[r][c] !== 0 && this.grid[r][c] !== this.solution[r][c]) m++
    return m
  }

  canUndo(): boolean {
    return !this.won && this.history.length > 0
  }

  /** 当前所有冲突格（红标） */
  conflictCells(): Set<string> {
    const all = new Set<string>()
    const n = this.spec.size
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (this.grid[r][c] === 0) continue
        for (const k of findConflicts(this.grid, this.spec, r, c)) all.add(k)
      }
    }
    return all
  }

  private isSolved(): boolean {
    const n = this.spec.size
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
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
      notes: this.notes.map((row) => row.map((list) => [...list])),
      selected: this.selected ? { ...this.selected } : null,
      moves: this.moves,
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      startTime: this.startTime,
      bestTime: this.bestTime,
      won: this.won,
      over: this.won,
      size: this.spec.size,
      difficulty: this.config.difficulty,
      history: this.history.map((h) => ({ ...h })),
    }
  }

  loadState(state: SudokuState): void {
    this.spec = specOf(state.size)
    this.grid = state.grid.map((row) => [...row])
    this.given = state.given.map((row) => [...row])
    this.notes = state.notes.map((row) => row.map((list) => [...list]))
    this.selected = state.selected ? { ...state.selected } : null
    this.moves = state.moves
    this.mistakes = state.mistakes
    this.hintsUsed = state.hintsUsed
    this.startTime = state.startTime
    this.won = state.won
    this.history = state.history.map((h) => ({ ...h }))
    this.config.size = state.size
    this.config.difficulty = state.difficulty
    this.bestTimeKey = `${BEST_KEY_PREFIX}-${state.size}-${state.difficulty}`
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

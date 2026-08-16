/**
 * 扫雷引擎（纯 TS，无 DOM 依赖）
 *
 * 规则：翻开所有非雷格即获胜；踩雷失败。
 * - 首次翻开时布雷（首击及其周围 3×3 必安全）
 * - 翻开空格递归展开相邻区域
 * - 旗子/问号标记；数字格 chord（双击/右键）快速展开
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  MineState,
  MineConfig,
  MineCell,
  FlagState,
  MineStatus,
} from './types'
import { MINE_PRESETS, DEFAULT_MINE_CONFIG } from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-minesweeper-best'

export class MinesweeperEngine implements BaseGame<MineState, number> {
  private config: MineConfig
  private rows: number
  private cols: number
  private mineCount: number
  private cells: MineCell[] = []
  private flags = 0
  private status: MineStatus = 'ready'
  private moves = 0
  private startTime = 0
  private bestTime = 0
  private bestTimeKey: string
  /** 已布雷标志（首击后） */
  private mined = false

  constructor(config: Partial<MineConfig> = {}) {
    this.config = { ...DEFAULT_MINE_CONFIG, ...config }
    const p = MINE_PRESETS[this.config.difficulty]
    this.rows = p.rows
    this.cols = p.cols
    this.mineCount = p.mines
    this.bestTimeKey = `${BEST_KEY_PREFIX}-${this.config.difficulty}`
    this.bestTime = StorageAdapter.get<number>(this.bestTimeKey) ?? 0
    this.init()
  }

  getConfig(): MineConfig {
    return { ...this.config }
  }

  private init(): void {
    this.cells = Array.from({ length: this.rows * this.cols }, () => ({
      isMine: false,
      revealed: false,
      flag: 'none' as FlagState,
      adjacent: 0,
    }))
    this.flags = 0
    this.status = 'ready'
    this.moves = 0
    this.mined = false
    this.startTime = 0
  }

  private idx(r: number, c: number): number {
    return r * this.cols + c
  }

  private neighbors(r: number, c: number): number[] {
    const list: number[] = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          list.push(this.idx(nr, nc))
        }
      }
    }
    return list
  }

  /** 布雷：排除首击格及其周围（保证首击安全） */
  private plantMines(safeIdx: number): void {
    const safe = new Set<number>([safeIdx, ...this.neighbors(Math.floor(safeIdx / this.cols), safeIdx % this.cols)])
    const candidates: number[] = []
    for (let i = 0; i < this.cells.length; i++) {
      if (!safe.has(i)) candidates.push(i)
    }
    // Fisher-Yates 洗牌取前 mineCount 个
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    for (let k = 0; k < Math.min(this.mineCount, candidates.length); k++) {
      this.cells[candidates[k]].isMine = true
    }
    // 计算 adjacent
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = this.idx(r, c)
        if (this.cells[i].isMine) continue
        let n = 0
        for (const ni of this.neighbors(r, c)) {
          if (this.cells[ni].isMine) n++
        }
        this.cells[i].adjacent = n
      }
    }
    this.mined = true
  }

  private revealFrom(r: number, c: number): void {
    const i = this.idx(r, c)
    const cell = this.cells[i]
    if (cell.revealed || cell.flag === 'flag') return
    cell.revealed = true
    if (cell.flag === 'question') {
      cell.flag = 'none'
      this.flags--
    }
    this.moves++
    // 空格递归展开
    if (cell.adjacent === 0 && !cell.isMine) {
      for (const ni of this.neighbors(r, c)) {
        const nb = this.cells[ni]
        if (!nb.revealed && nb.flag !== 'flag') {
          this.revealFrom(Math.floor(ni / this.cols), ni % this.cols)
        }
      }
    }
  }

  /**
   * 翻开一格。返回动作结果。
   * 首击：布雷（保证安全）并开始计时。
   */
  reveal(r: number, c: number): MineStatus {
    if (this.status === 'won' || this.status === 'lost') return this.status
    const i = this.idx(r, c)
    const cell = this.cells[i]
    if (cell.revealed || cell.flag === 'flag') return this.status

    if (!this.mined) {
      this.plantMines(i)
      this.startTime = Date.now()
      this.status = 'playing'
    }

    if (cell.isMine) {
      // 踩雷：翻开所有雷，失败
      for (const cell2 of this.cells) {
        if (cell2.isMine) cell2.revealed = true
      }
      this.status = 'lost'
      this.updateBestIfWon() // 无操作
      return this.status
    }

    this.revealFrom(r, c)
    this.checkWin()
    return this.status
  }

  /**
   * BaseGame 接口：move = 按格子 index 翻开（展开语义）
   */
  move(idx: number): boolean {
    if (idx < 0 || idx >= this.cells.length) return false
    if (this.status === 'won' || this.status === 'lost') return false
    const before = this.status
    const beforeMoves = this.moves
    this.reveal(Math.floor(idx / this.cols), idx % this.cols)
    return this.status !== before || this.moves !== beforeMoves
  }

  /** 循环标记：旗子 → 问号 → 无 */
  toggleFlag(r: number, c: number): void {
    if (this.status === 'won' || this.status === 'lost') return
    const i = this.idx(r, c)
    const cell = this.cells[i]
    if (cell.revealed) return
    if (cell.flag === 'none') {
      cell.flag = 'flag'
      this.flags++
    } else if (cell.flag === 'flag') {
      cell.flag = 'question'
      this.flags--
    } else {
      cell.flag = 'none'
    }
  }

  /** 标记为旗子（长按/快捷键） */
  setFlag(r: number, c: number, on: boolean): void {
    if (this.status === 'won' || this.status === 'lost') return
    const i = this.idx(r, c)
    const cell = this.cells[i]
    if (cell.revealed) return
    if (on && cell.flag !== 'flag') {
      if (cell.flag === 'question') this.flags--
      cell.flag = 'flag'
      this.flags++
    } else if (!on && cell.flag === 'flag') {
      cell.flag = 'none'
      this.flags--
    }
  }

  /**
   * Chord：数字格上，若周围旗子数 ≥ 数字则翻开周围未标记格（快速展开）。
   * 若旗子数 ≠ 数字则不动作。
   */
  chord(r: number, c: number): MineStatus {
    if (this.status === 'won' || this.status === 'lost') return this.status
    const i = this.idx(r, c)
    const cell = this.cells[i]
    if (!cell.revealed || cell.isMine || cell.adjacent === 0) return this.status
    let flagCount = 0
    for (const ni of this.neighbors(r, c)) {
      if (this.cells[ni].flag === 'flag') flagCount++
    }
    if (flagCount < cell.adjacent) return this.status
    // 翻开周围未标记格
    for (const ni of this.neighbors(r, c)) {
      const nb = this.cells[ni]
      if (nb.revealed || nb.flag === 'flag') continue
      const nr = Math.floor(ni / this.cols)
      const nc = ni % this.cols
      if (nb.isMine) {
        // 踩雷
        for (const cell2 of this.cells) {
          if (cell2.isMine) cell2.revealed = true
        }
        this.status = 'lost'
        return this.status
      }
      this.revealFrom(nr, nc)
    }
    this.checkWin()
    return this.status
  }

  private checkWin(): void {
    if (this.status !== 'playing') return
    for (const cell of this.cells) {
      if (!cell.isMine && !cell.revealed) return
    }
    this.status = 'won'
    this.updateBestIfWon()
  }

  private updateBestIfWon(): void {
    if (this.status !== 'won') return
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000)
    if (this.bestTime === 0 || elapsed < this.bestTime) {
      this.bestTime = elapsed
      StorageAdapter.set(this.bestTimeKey, this.bestTime)
    }
  }

  getState(): MineState {
    return {
      rows: this.rows,
      cols: this.cols,
      mines: this.mineCount,
      cells: this.cells.map((c) => ({ ...c })),
      flags: this.flags,
      status: this.status,
      moves: this.moves,
      startTime: this.startTime,
      bestTime: this.bestTime,
      difficulty: this.config.difficulty,
    }
  }

  loadState(state: MineState): void {
    this.rows = state.rows
    this.cols = state.cols
    this.mineCount = state.mines
    this.cells = state.cells.map((c) => ({ ...c }))
    this.flags = state.flags
    this.status = state.status
    this.moves = state.moves
    this.startTime = state.startTime
    this.mined = this.status !== 'ready'
    this.config.difficulty = state.difficulty
    this.bestTimeKey = `${BEST_KEY_PREFIX}-${state.difficulty}`
    this.bestTime = StorageAdapter.get<number>(this.bestTimeKey) ?? 0
  }

  isGameOver(): boolean {
    return this.status === 'won' || this.status === 'lost'
  }

  isWin(): boolean {
    return this.status === 'won'
  }

  reset(): void {
    this.init()
  }

  getScore(): number {
    return this.moves
  }
}

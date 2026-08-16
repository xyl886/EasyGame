/**
 * 三国华容道核心引擎
 * 纯 TS 实现，不依赖 Vue/DOM。
 *
 * 规则：4×5 棋盘，把曹操（2×2）通过腾挪移动到棋盘底部中央出口（(2,1) 起 2×2 区域）即获胜。
 * 操作模型：点击选中棋子 → 方向键/滑动移动；未选中时自动选择该方向可动的棋子。
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  ClassicState,
  ClassicConfig,
  ClassicDirection,
  Piece,
  PieceKind,
} from './types'
import {
  PIECE_SIZE,
  ROWS,
  COLS,
  LAYOUTS,
  DEFAULT_CLASSIC_CONFIG,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-klotski-classic-best'

const OPPOSITE: Record<ClassicDirection, ClassicDirection> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
}

/**
 * 可解开局（曹操已在出口，且上方留空可移动）→ 随机打乱保证可解。
 * 标准配置：曹操 2×2 + 关羽 2×1 + 四将 1×2 + 四兵 1×1 = 18 格 + 2 空格。
 *   关 关 兵 赵 黄
 *   兵 ·  · 赵 黄
 *   张 曹 曹 马 兵
 *   兵 曹 曹 马 兵
 */
function solvedPieces(): Piece[] {
  return [
    { id: 1, kind: 'guanyu', row: 0, col: 0, name: '关羽' },
    { id: 2, kind: 'soldier', row: 0, col: 2 },
    { id: 3, kind: 'general', row: 0, col: 3, name: '赵云' },
    { id: 4, kind: 'general', row: 0, col: 4, name: '黄忠' },
    { id: 5, kind: 'soldier', row: 1, col: 0 },
    { id: 6, kind: 'general', row: 2, col: 0, name: '张飞' },
    { id: 7, kind: 'caocao', row: 2, col: 1, name: '曹操' },
    { id: 8, kind: 'general', row: 2, col: 3, name: '马超' },
    { id: 9, kind: 'soldier', row: 2, col: 4 },
    { id: 10, kind: 'soldier', row: 3, col: 4 },
  ]
}

export class ClassicKlotskiEngine implements BaseGame<ClassicState, ClassicDirection> {
  private config: ClassicConfig
  private pieces: Piece[] = []
  private moves = 0
  private startTime = 0
  private won = false
  private bestMoves = 0
  private bestMovesKey: string
  private selectedId: number | null = null
  /** 撤销历史：记录每次移动的（棋子, 方向） */
  private history: Array<{ pieceId: number; dir: ClassicDirection }> = []
  private nextId = 1

  constructor(config: Partial<ClassicConfig> = {}) {
    this.config = { ...DEFAULT_CLASSIC_CONFIG, ...config }
    this.bestMovesKey = `${BEST_KEY_PREFIX}-${this.config.layout}`
    this.bestMoves = StorageAdapter.get<number>(this.bestMovesKey) ?? 0
    this.init()
  }

  getConfig(): ClassicConfig {
    return { ...this.config }
  }

  private init(): void {
    this.pieces = this.buildPieces()
    this.moves = 0
    this.startTime = Date.now()
    this.won = false
    this.selectedId = null
    this.history = []
  }

  private buildPieces(): Piece[] {
    if (this.config.layout === 'random') {
      return this.randomLayout()
    }
    const def = LAYOUTS.find((l) => l.id === this.config.layout)
    if (!def) return this.randomLayout()
    this.nextId = 1
    return def.pieces.map((p) => ({
      id: this.nextId++,
      kind: p.kind,
      row: p.row,
      col: p.col,
      name: p.name,
    }))
  }

  /** 随机可解开局：从解状态做 80 步随机合法移动，并确保曹操离开出口 */
  private randomLayout(): Piece[] {
    let attempts = 0
    do {
      this.pieces = solvedPieces()
      this.nextId = 11
      let last: ClassicDirection | null = null
      for (let i = 0; i < 80; i++) {
        const movable = this.movablePieces()
        let pool = movable
        if (last !== null) {
          const opposite = OPPOSITE[last]
          const filtered = movable.filter((m) => m.dir !== opposite)
          if (filtered.length > 0) pool = filtered
        }
        const choice = pool[Math.floor(Math.random() * pool.length)]
        this.applyMove(choice.pieceId, choice.dir)
        last = choice.dir
      }
      attempts++
    } while (this.isCaocaoOut() && attempts < 8)
    return this.pieces.map((p) => ({ ...p }))
  }

  private pieceSize(kind: PieceKind): { w: number; h: number } {
    return PIECE_SIZE[kind]
  }

  /** 目标位置（新左上角）是否合法：界内且不与任何其他棋子重叠 */
  private canPlace(piece: Piece, row: number, col: number): boolean {
    const { w, h } = this.pieceSize(piece.kind)
    if (row < 0 || col < 0 || row + h > ROWS || col + w > COLS) return false
    for (const other of this.pieces) {
      if (other.id === piece.id) continue
      const os = this.pieceSize(other.kind)
      const overlapX = col < other.col + os.w && col + w > other.col
      const overlapY = row < other.row + os.h && row + h > other.row
      if (overlapX && overlapY) return false
    }
    return true
  }

  private canMove(piece: Piece, dir: ClassicDirection): boolean {
    const { w, h } = this.pieceSize(piece.kind)
    let nr = piece.row
    let nc = piece.col
    switch (dir) {
      case 'up':
        nr = piece.row - 1
        break
      case 'down':
        nr = piece.row + 1
        break
      case 'left':
        nc = piece.col - 1
        break
      case 'right':
        nc = piece.col + 1
        break
    }
    // 整体移动一格后目标区域要仍在界内（用新左上角 + 原尺寸判断）
    if (nr < 0 || nc < 0 || nr + h > ROWS || nc + w > COLS) return false
    return this.canPlace(piece, nr, nc)
  }

  /** 所有可移动的棋子及方向 */
  private movablePieces(): Array<{ pieceId: number; dir: ClassicDirection }> {
    const result: Array<{ pieceId: number; dir: ClassicDirection }> = []
    for (const p of this.pieces) {
      for (const dir of ['up', 'down', 'left', 'right'] as ClassicDirection[]) {
        if (this.canMove(p, dir)) result.push({ pieceId: p.id, dir })
      }
    }
    return result
  }

  private applyMove(pieceId: number, dir: ClassicDirection): void {
    const p = this.pieces.find((x) => x.id === pieceId)
    if (!p) return
    switch (dir) {
      case 'up':
        p.row--
        break
      case 'down':
        p.row++
        break
      case 'left':
        p.col--
        break
      case 'right':
        p.col++
        break
    }
  }

  /** 曹操是否已到达出口（底部中央 (2,1) 起 2×2） */
  private isCaocaoOut(): boolean {
    const cao = this.pieces.find((p) => p.kind === 'caocao')
    return !!cao && cao.row === ROWS - 2 && cao.col === 1
  }

  private updateBest(): void {
    if (this.bestMoves === 0 || this.moves < this.bestMoves) {
      this.bestMoves = this.moves
      StorageAdapter.set(this.bestMovesKey, this.bestMoves)
    }
  }

  /** 选中棋子（null 取消选中） */
  select(id: number | null): void {
    if (this.won) return
    if (id === null) {
      this.selectedId = null
      return
    }
    if (this.pieces.some((p) => p.id === id)) {
      this.selectedId = id
    }
  }

  getSelectedId(): number | null {
    return this.selectedId
  }

  /** 执行一步：优先移动选中棋子，否则自动选该方向可动的棋子。返回是否发生变化 */
  move(dir: ClassicDirection): boolean {
    if (this.won) return false
    let piece: Piece | undefined =
      this.selectedId !== null ? this.pieces.find((p) => p.id === this.selectedId) : undefined
    if (!piece) {
      const movable = this.movablePieces().filter((m) => m.dir === dir)
      if (movable.length === 0) return false
      const target = movable[0]
      piece = this.pieces.find((p) => p.id === target.pieceId)
      this.selectedId = target.pieceId
    }
    if (!piece || !this.canMove(piece, dir)) return false
    this.history.push({ pieceId: piece.id, dir })
    this.applyMove(piece.id, dir)
    this.moves++
    if (this.isCaocaoOut()) {
      this.won = true
      this.updateBest()
    }
    return true
  }

  /** 撤销一步（仅未完成时可用） */
  undo(): boolean {
    if (this.won || this.history.length === 0) return false
    const last = this.history.pop()!
    this.applyMove(last.pieceId, OPPOSITE[last.dir])
    this.moves--
    return true
  }

  canUndo(): boolean {
    return !this.won && this.history.length > 0
  }

  getState(): ClassicState {
    return {
      pieces: this.pieces.map((p) => ({ ...p })),
      moves: this.moves,
      startTime: this.startTime,
      bestMoves: this.bestMoves,
      won: this.won,
      over: this.won,
      selectedId: this.selectedId,
      layout: this.config.layout,
    }
  }

  loadState(state: ClassicState): void {
    this.pieces = state.pieces.map((p) => ({ ...p }))
    this.moves = state.moves
    this.startTime = state.startTime
    this.won = state.won
    this.selectedId = state.selectedId
    this.history = []
    this.config.layout = state.layout
    this.bestMovesKey = `${BEST_KEY_PREFIX}-${state.layout}`
    this.bestMoves = StorageAdapter.get<number>(this.bestMovesKey) ?? 0
    this.nextId = Math.max(...this.pieces.map((p) => p.id), 0) + 1
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

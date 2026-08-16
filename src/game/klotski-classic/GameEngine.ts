/**
 * 三国华容道核心引擎
 * 纯 TS 实现，不依赖 Vue/DOM。
 *
 * 规则：5×4 棋盘（ROWS=5, COLS=4），把曹操（2×2）通过腾挪移动到棋盘底部中央出口
 * （顶行 row===2 且 col===1 即占底部中间 2×2）即获胜。
 * 内置 40 种经典布局 + 演示解法（levels.ts），支持随机可解开局。
 * 操作模型：点击选中/直接移动 → 方向键/滑动；演示用 demoMove 按棋子移动。
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  ClassicState,
  ClassicConfig,
  ClassicDirection,
  Piece,
} from './types'
import { PIECE_SIZE, ROWS, COLS, DEFAULT_CLASSIC_CONFIG } from './types'
import { findLevel } from './levels'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-klotski-classic-best'

const OPPOSITE: Record<ClassicDirection, ClassicDirection> = {
  left: 'right',
  right: 'left',
  up: 'down',
  down: 'up',
}

/** 随机开局用的可解解状态（曹操已在出口 (2,1)，上方留空可移动）：
 *   关 关 兵 赵
 *   兵 ·  · 赵
 *   黄 曹 曹 马
 *   黄 曹 曹 马
 *   兵 兵 张 张
 */
function solvedPieces(): Piece[] {
  return [
    { id: 6, kind: 'guanyu', row: 0, col: 0, w: 2, h: 1, name: '关羽' },
    { id: 7, kind: 'soldier', row: 0, col: 2, w: 1, h: 1, name: '兵' },
    { id: 3, kind: 'general', row: 0, col: 3, w: 1, h: 2, name: '赵云' },
    { id: 8, kind: 'soldier', row: 1, col: 0, w: 1, h: 1, name: '兵' },
    { id: 5, kind: 'general', row: 2, col: 0, w: 1, h: 2, name: '黄忠' },
    { id: 1, kind: 'caocao', row: 2, col: 1, w: 2, h: 2, name: '曹操' },
    { id: 4, kind: 'general', row: 2, col: 3, w: 1, h: 2, name: '马超' },
    { id: 9, kind: 'soldier', row: 4, col: 0, w: 1, h: 1, name: '兵' },
    { id: 10, kind: 'soldier', row: 4, col: 1, w: 1, h: 1, name: '兵' },
    { id: 2, kind: 'general', row: 4, col: 2, w: 2, h: 1, name: '张飞' },
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
    const level = findLevel(this.config.layout)
    if (!level) return this.randomLayout()
    return level.pieces.map((p) => ({ ...p }))
  }

  /** 随机可解开局：从解状态做 80 步随机合法移动，并确保曹操离开出口 */
  private randomLayout(): Piece[] {
    let attempts = 0
    do {
      this.pieces = solvedPieces()
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

  /** 棋子实际尺寸（per-piece 覆盖 kind 默认） */
  private pieceSizeOf(piece: Piece): { w: number; h: number } {
    const def = PIECE_SIZE[piece.kind]
    return {
      w: piece.w ?? def.w,
      h: piece.h ?? def.h,
    }
  }

  /** 目标位置（新左上角）是否合法：界内且不与任何其他棋子重叠 */
  private canPlace(piece: Piece, row: number, col: number): boolean {
    const { w, h } = this.pieceSizeOf(piece)
    if (row < 0 || col < 0 || row + h > ROWS || col + w > COLS) return false
    for (const other of this.pieces) {
      if (other.id === piece.id) continue
      const os = this.pieceSizeOf(other)
      const overlapX = col < other.col + os.w && col + w > other.col
      const overlapY = row < other.row + os.h && row + h > other.row
      if (overlapX && overlapY) return false
    }
    return true
  }

  private canMove(piece: Piece, dir: ClassicDirection): boolean {
    const { w, h } = this.pieceSizeOf(piece)
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

  /** 曹操是否已到达出口（底部中央两列，顶行 row===ROWS-2，占底部两行） */
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

  /** 查询某个棋子当前可移动的方向列表（视图点击交互用） */
  movableDirs(pieceId: number): ClassicDirection[] {
    const p = this.pieces.find((x) => x.id === pieceId)
    if (!p) return []
    return (['up', 'down', 'left', 'right'] as ClassicDirection[]).filter((d) =>
      this.canMove(p, d),
    )
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

  /**
   * 按棋子 id + 方向移动（自动演示用；不改选中状态）
   */
  demoMove(pieceId: number, dir: ClassicDirection): boolean {
    if (this.won) return false
    const p = this.pieces.find((x) => x.id === pieceId)
    if (!p || !this.canMove(p, dir)) return false
    this.applyMove(pieceId, dir)
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

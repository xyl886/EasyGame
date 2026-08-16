/**
 * 三国华容道（经典滑块）类型定义
 *
 * 规则：4×5 棋盘上放置曹操（2×2）、关羽（2×1 横）、五虎将（1×2 竖）、小兵（1×1），
 * 通过腾挪把曹操移动到棋盘底部中央的出口即获胜（曹操败走华容道）。
 */

/** 移动方向：指棋子移动的方向 */
export type ClassicDirection = 'up' | 'down' | 'left' | 'right'

export type PieceKind = 'caocao' | 'guanyu' | 'general' | 'soldier'

/** 棋子：id 用于选中/撤销；row/col 为左上角坐标 */
export interface Piece {
  id: number
  kind: PieceKind
  row: number
  col: number
  /** 显示名（经典布局可指定，随机局为空则用 kind 默认名） */
  name?: string
}

/** 棋子尺寸（宽×高，单位：格） */
export const PIECE_SIZE: Record<PieceKind, { w: number; h: number }> = {
  caocao: { w: 2, h: 2 },
  guanyu: { w: 2, h: 1 },
  general: { w: 1, h: 2 },
  soldier: { w: 1, h: 1 },
}

/** 棋盘规格 */
export const ROWS = 4
export const COLS = 5

/** 棋子默认显示名 */
export const PIECE_LABEL: Record<PieceKind, string> = {
  caocao: '曹操',
  guanyu: '关羽',
  general: '将',
  soldier: '兵',
}

export type ClassicLayoutId = 'hengdaolima' | 'random'

export interface LayoutDef {
  id: ClassicLayoutId
  name: string
  pieces: Array<{ kind: PieceKind; row: number; col: number; name?: string }>
}

/**
 * 内置经典布局（坐标：row 0~3 上→下，col 0~4 左→右）
 * 横刀立马：曹操居上，关羽横刀当道，经典残局
 */
export const LAYOUTS: LayoutDef[] = [
  {
    id: 'hengdaolima',
    name: '横刀立马',
    pieces: [
      { kind: 'general', row: 0, col: 0, name: '张飞' },
      { kind: 'caocao', row: 0, col: 1, name: '曹操' },
      { kind: 'general', row: 0, col: 3, name: '赵云' },
      { kind: 'soldier', row: 0, col: 4, name: '兵' },
      { kind: 'general', row: 2, col: 0, name: '马超' },
      { kind: 'guanyu', row: 2, col: 1, name: '关羽' },
      { kind: 'general', row: 2, col: 3, name: '黄忠' },
      { kind: 'soldier', row: 3, col: 1, name: '兵' },
      { kind: 'soldier', row: 3, col: 2, name: '兵' },
      { kind: 'soldier', row: 3, col: 4, name: '兵' },
    ],
  },
]

export function layoutName(id: ClassicLayoutId): string {
  const def = LAYOUTS.find((l) => l.id === id)
  return def ? def.name : id === 'random' ? '随机开局' : id
}

export interface ClassicConfig {
  layout: ClassicLayoutId
}

export interface ClassicState {
  pieces: Piece[]
  moves: number
  startTime: number
  /** 该布局历史最少步数（0=尚未完成过） */
  bestMoves: number
  won: boolean
  over: boolean
  selectedId: number | null
  layout: ClassicLayoutId
}

/** 通关得分：步数越少分越高（1200 分封顶，步数 ≥ 1200 保底 1 分） */
export const CLASSIC_SCORE_BASE = 1200

export function classicScoreForMoves(moves: number): number {
  return Math.max(1, CLASSIC_SCORE_BASE - moves)
}

export const DEFAULT_CLASSIC_CONFIG: ClassicConfig = {
  layout: 'hengdaolima',
}

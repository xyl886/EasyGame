/**
 * 三国华容道（经典滑块）类型定义
 *
 * 规则：4×5 棋盘上放置曹操（2×2）、关羽（2×1 横）、五虎将（1×2 竖）、小兵（1×1），
 * 通过腾挪把曹操移动到棋盘底部中央的出口即获胜（曹操败走华容道）。
 * 注：内置 40 种经典布局中将军有横有竖，棋子尺寸以实际占格（w/h）为准。
 */

/** 移动方向：指棋子移动的方向 */
export type ClassicDirection = 'up' | 'down' | 'left' | 'right'

export type PieceKind = 'caocao' | 'guanyu' | 'general' | 'soldier'

/** 棋子：id 用于选中/撤销/演示；row/col 为左上角坐标；w/h 为占格尺寸 */
export interface Piece {
  id: number
  kind: PieceKind
  row: number
  col: number
  /** 占格宽/高（经典布局的将军横竖不一，以此为准；缺省用 kind 默认） */
  w: number
  h: number
  /** 显示名 */
  name?: string
}

/** 棋子默认尺寸（宽×高，单位：格） */
export const PIECE_SIZE: Record<PieceKind, { w: number; h: number }> = {
  caocao: { w: 2, h: 2 },
  guanyu: { w: 2, h: 1 },
  general: { w: 1, h: 2 },
  soldier: { w: 1, h: 1 },
}

/** 棋盘规格 */
export const ROWS = 5
export const COLS = 4

/** 棋子默认显示名 */
export const PIECE_LABEL: Record<PieceKind, string> = {
  caocao: '曹操',
  guanyu: '关羽',
  general: '将',
  soldier: '兵',
}

/** 布局 id：内置 40 种经典布局用中文名，另有 'random' 随机开局 */
export type ClassicLayoutId = string

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
  layout: '横刀立马',
}

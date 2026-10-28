/** 五子棋（联机版）类型定义 */

export type Stone = 'black' | 'white'
export type Cell = Stone | null

export interface GomokuConfig {
  /** 棋盘边长（15 表示 15×15） */
  size: number
  /** 连成多少子获胜 */
  winLength: number
}

export const DEFAULT_CONFIG: GomokuConfig = {
  size: 15,
  winLength: 5,
}

export interface GomokuState {
  config: GomokuConfig
  /** 长度 = size × size，索引 = row * size + col */
  board: Cell[]
  /** 当前轮到谁 */
  current: Stone
  /** 最近一步的索引 */
  lastMove: number | null
  /** 胜者 */
  winner: Stone | null
  /** 获胜连线的格子索引 */
  winningLine: number[]
  /** 已落子数 */
  moves: number
  /** 是否结束（胜负或棋盘下满） */
  over: boolean
}

/** 座椅：黑先手 */
export function opposite(stone: Stone): Stone {
  return stone === 'black' ? 'white' : 'black'
}

export function stoneLabel(stone: Stone): string {
  return stone === 'black' ? '黑棋' : '白棋'
}

/** 把索引换算成 1-based 行列（用于无障碍标签） */
export function cellCoord(index: number, size: number): { row: number; col: number } {
  return { row: Math.floor(index / size) + 1, col: (index % size) + 1 }
}

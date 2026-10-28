/** 四子棋（Connect Four）类型定义 */

export type Player = 'red' | 'yellow'
export type Cell = Player | null

export const COLS = 7
export const ROWS = 6
export const WIN_LENGTH = 4

export interface Connect4State {
  /** 行优先：index = row * COLS + col，row 0 在最上面 */
  board: Cell[]
  current: Player
  /** 最近落子位置（含行） */
  lastMove: number | null
  winner: Player | null
  winningLine: number[]
  moves: number
  over: boolean
}

export function oppositePlayer(player: Player): Player {
  return player === 'red' ? 'yellow' : 'red'
}

export function playerLabel(player: Player): string {
  return player === 'red' ? '红方' : '黄方'
}

export function cellCoord(index: number): { row: number; col: number } {
  return { row: Math.floor(index / COLS) + 1, col: (index % COLS) + 1 }
}

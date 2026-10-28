import type { BaseGame } from '../base/BaseGame'
import {
  COLS,
  ROWS,
  WIN_LENGTH,
  oppositePlayer,
  type Cell,
  type Connect4State,
  type Player,
} from './types'

export type Connect4Move = number

export function createInitialState(): Connect4State {
  return {
    board: Array<Cell>(COLS * ROWS).fill(null),
    current: 'red',
    lastMove: null,
    winner: null,
    winningLine: [],
    moves: 0,
    over: false,
  }
}

export function cloneState(state: Connect4State): Connect4State {
  return { ...state, board: [...state.board], winningLine: [...state.winningLine] }
}

/** 一列最下方空位；列满或越界返回 -1 */
export function dropIndex(board: Cell[], col: number): number {
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return -1
  for (let row = ROWS - 1; row >= 0; row--) {
    const index = row * COLS + col
    if (board[index] === null) return index
  }
  return -1
}

export function invalidMoveReason(state: Connect4State, col: number): string | null {
  if (state.over) return '对局已结束'
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return '列号无效'
  if (dropIndex(state.board, col) < 0) return '这一列已经满了'
  return null
}

/** 纯函数落子：非法返回 null */
export function applyConnect4Move(state: Connect4State, col: number): Connect4State | null {
  if (invalidMoveReason(state, col)) return null

  const index = dropIndex(state.board, col)
  const board = [...state.board]
  const player = state.current
  board[index] = player
  const moves = state.moves + 1
  const winningLine = findWinningLine(board, index, player)
  const winner: Player | null = winningLine.length > 0 ? player : null
  const over = winner !== null || moves >= board.length

  return {
    ...state,
    board,
    current: oppositePlayer(player),
    lastMove: index,
    winner,
    winningLine,
    moves,
    over,
  }
}

/** 从最后落子点检查横/竖/两条对角线，返回获胜连线 */
export function findWinningLine(board: Cell[], index: number, player: Player): number[] {
  const row = Math.floor(index / COLS)
  const col = index % COLS
  const directions: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]

  for (const [dr, dc] of directions) {
    const line: number[] = [index]
    for (let step = 1; step < WIN_LENGTH; step++) {
      const r = row + dr * step
      const c = col + dc * step
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break
      const i = r * COLS + c
      if (board[i] !== player) break
      line.push(i)
    }
    for (let step = 1; step < WIN_LENGTH; step++) {
      const r = row - dr * step
      const c = col - dc * step
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break
      const i = r * COLS + c
      if (board[i] !== player) break
      line.unshift(i)
    }
    if (line.length >= WIN_LENGTH) return line
  }
  return []
}

export class Connect4Engine implements BaseGame<Connect4State, Connect4Move> {
  private state: Connect4State

  constructor() {
    this.state = createInitialState()
  }

  getState(): Connect4State {
    return cloneState(this.state)
  }

  loadState(state: Connect4State): void {
    this.state = cloneState(state)
  }

  move(col: Connect4Move): boolean {
    const next = applyConnect4Move(this.state, col)
    if (!next) return false
    this.state = next
    return true
  }

  isGameOver(): boolean {
    return this.state.over
  }

  isWin(): boolean {
    return this.state.winner !== null
  }

  reset(): void {
    this.state = createInitialState()
  }

  getScore(): number {
    return this.state.moves
  }
}

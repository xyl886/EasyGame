import type { BaseGame } from '../base/BaseGame'
import {
  DEFAULT_CONFIG,
  opposite,
  type Cell,
  type GomokuConfig,
  type GomokuState,
  type Stone,
} from './types'

export type GomokuMove = number

export function createInitialState(config: GomokuConfig = DEFAULT_CONFIG): GomokuState {
  const size = Math.max(3, Math.floor(config.size))
  const winLength = Math.min(Math.max(3, Math.floor(config.winLength)), size)
  return {
    config: { size, winLength },
    board: Array<Cell>(size * size).fill(null),
    current: 'black',
    lastMove: null,
    winner: null,
    winningLine: [],
    moves: 0,
    over: false,
  }
}

export function cloneState(state: GomokuState): GomokuState {
  return {
    ...state,
    config: { ...state.config },
    board: [...state.board],
    winningLine: [...state.winningLine],
  }
}

/** 校验落子；非法返回原因，合法返回 null */
export function invalidMoveReason(state: GomokuState, index: number): string | null {
  if (state.over) return '对局已结束'
  if (!Number.isInteger(index) || index < 0 || index >= state.board.length) return '落子位置无效'
  if (state.board[index] !== null) return '这里已经有棋子了'
  return null
}

/**
 * 纯函数落子：非法返回 null，合法返回新状态（不修改入参）。
 */
export function applyGomokuMove(state: GomokuState, index: number): GomokuState | null {
  if (invalidMoveReason(state, index)) return null

  const board = [...state.board]
  const stone = state.current
  board[index] = stone
  const moves = state.moves + 1
  const winningLine = findWinningLine(
    board,
    state.config.size,
    state.config.winLength,
    index,
    stone,
  )
  const winner: Stone | null = winningLine.length > 0 ? stone : null
  const over = winner !== null || moves >= board.length

  return {
    ...state,
    board,
    current: opposite(stone),
    lastMove: index,
    winner,
    winningLine,
    moves,
    over,
  }
}

/** 从最后落子点检查四个方向，返回获胜连线（>= winLength 时截取前 winLength 个） */
export function findWinningLine(
  board: Cell[],
  size: number,
  winLength: number,
  index: number,
  stone: Stone,
): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const directions: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]

  for (const [dr, dc] of directions) {
    const line: number[] = [index]
    // 正向
    for (let step = 1; step < size; step++) {
      const r = row + dr * step
      const c = col + dc * step
      if (r < 0 || r >= size || c < 0 || c >= size) break
      const i = r * size + c
      if (board[i] !== stone) break
      line.push(i)
    }
    // 反向
    for (let step = 1; step < size; step++) {
      const r = row - dr * step
      const c = col - dc * step
      if (r < 0 || r >= size || c < 0 || c >= size) break
      const i = r * size + c
      if (board[i] !== stone) break
      line.unshift(i)
    }
    if (line.length >= winLength) return line.slice(0, winLength)
  }
  return []
}

/** 引擎封装：与其它游戏保持一致的 BaseGame 接口，便于后续复用与测试 */
export class GomokuEngine implements BaseGame<GomokuState, GomokuMove> {
  private state: GomokuState

  constructor(config: GomokuConfig = DEFAULT_CONFIG) {
    this.state = createInitialState(config)
  }

  getState(): GomokuState {
    return cloneState(this.state)
  }

  loadState(state: GomokuState): void {
    this.state = cloneState(state)
  }

  move(index: GomokuMove): boolean {
    const next = applyGomokuMove(this.state, index)
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
    this.state = createInitialState(this.state.config)
  }

  getScore(): number {
    return this.state.moves
  }
}

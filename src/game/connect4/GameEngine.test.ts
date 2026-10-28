import { describe, expect, it } from 'vitest'
import {
  Connect4Engine,
  applyConnect4Move,
  createInitialState,
  dropIndex,
  findWinningLine,
  invalidMoveReason,
} from './GameEngine'
import { COLS, ROWS, type Connect4State } from './types'

function idx(row: number, col: number): number {
  return row * COLS + col
}

function play(state: Connect4State, cols: number[]): Connect4State {
  let next = state
  for (const col of cols) {
    const applied = applyConnect4Move(next, col)
    if (!applied) throw new Error(`非法落子：col ${col}`)
    next = applied
  }
  return next
}

describe('四子棋引擎', () => {
  it('初始状态：空棋盘、红先、未结束', () => {
    const state = createInitialState()
    expect(state.board).toHaveLength(COLS * ROWS)
    expect(state.board.every((c) => c === null)).toBe(true)
    expect(state.current).toBe('red')
    expect(state.over).toBe(false)
  })

  it('落子落到该列最底部并切换执子方', () => {
    const state = play(createInitialState(), [3])
    expect(state.board[idx(ROWS - 1, 3)]).toBe('red')
    expect(state.current).toBe('yellow')
    expect(state.lastMove).toBe(idx(ROWS - 1, 3))
  })

  it('dropIndex 找到最下方空位，满列返回 -1', () => {
    const board = createInitialState().board
    expect(dropIndex(board, 0)).toBe(idx(ROWS - 1, 0))
    for (let row = ROWS - 1; row >= 0; row--) board[idx(row, 0)] = 'red'
    expect(dropIndex(board, 0)).toBe(-1)
  })

  it('非法落子：越界 / 满列 / 结束后', () => {
    const state = createInitialState()
    expect(invalidMoveReason(state, -1)).toContain('无效')
    expect(invalidMoveReason(state, COLS)).toContain('无效')

    const full: Connect4State = {
      ...state,
      board: state.board.map((_, i) => (i % COLS === 0 ? 'red' : null)) as Connect4State['board'],
    }
    expect(invalidMoveReason(full, 0)).toContain('满')
  })

  it('横向四连获胜并返回连线', () => {
    // 红：0,1,2,3；黄：0,1,2（错开在另一列）
    const state = play(createInitialState(), [0, 0, 1, 1, 2, 2, 3])
    expect(state.winner).toBe('red')
    expect(state.over).toBe(true)
    expect(state.winningLine).toEqual([
      idx(ROWS - 1, 0),
      idx(ROWS - 1, 1),
      idx(ROWS - 1, 2),
      idx(ROWS - 1, 3),
    ])
  })

  it('纵向四连获胜', () => {
    // 红都落在 0 列：0,0,0,0；黄落在 1,2,3 列
    const state = play(createInitialState(), [0, 1, 0, 2, 0, 3, 0])
    expect(state.winner).toBe('red')
    expect(state.winningLine).toHaveLength(4)
    expect(state.winningLine.every((i) => i % COLS === 0)).toBe(true)
  })

  it('两个方向的对角线四连都能识别', () => {
    const board = createInitialState().board

    // ↘ 方向：红在 (5,0)(4,1)(3,2)(2,3)
    for (const [row, col] of [
      [5, 0],
      [4, 1],
      [3, 2],
      [2, 3],
    ]) {
      board[idx(row, col)] = 'red'
    }
    expect(findWinningLine(board, idx(2, 3), 'red')).toHaveLength(4)

    // ↗ 方向：红在 (2,0)(3,1)(4,2)(5,3)
    const board2 = createInitialState().board
    for (const [row, col] of [
      [2, 0],
      [3, 1],
      [4, 2],
      [5, 3],
    ]) {
      board2[idx(row, col)] = 'red'
    }
    expect(findWinningLine(board2, idx(5, 3), 'red')).toHaveLength(4)
  })

  it('黄方也能获胜', () => {
    // 黄：col0..3 底部；红：col0..2 叠加 + 干扰
    const state = play(createInitialState(), [4, 0, 5, 1, 6, 2, 4, 3])
    expect(state.winner).toBe('yellow')
    expect(state.over).toBe(true)
  })

  it('findWinningLine 在非获胜点返回空数组', () => {
    const board = createInitialState().board
    board[idx(ROWS - 1, 0)] = 'red'
    expect(findWinningLine(board, idx(ROWS - 1, 0), 'red')).toEqual([])
  })

  it('引擎封装：move/isGameOver/reset/getScore', () => {
    const engine = new Connect4Engine()
    expect(engine.move(3)).toBe(true)
    expect(engine.getScore()).toBe(1)
    expect(engine.getState().lastMove).toBe(idx(ROWS - 1, 3))
    expect(engine.isGameOver()).toBe(false)
    engine.reset()
    expect(engine.getState().moves).toBe(0)
  })
})

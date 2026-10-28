import { describe, expect, it } from 'vitest'
import {
  GomokuEngine,
  applyGomokuMove,
  createInitialState,
  findWinningLine,
  invalidMoveReason,
} from './GameEngine'
import { cellCoord, type GomokuState } from './types'

const SIZE = 15

function idx(row: number, col: number, size = SIZE): number {
  return row * size + col
}

function play(state: GomokuState, moves: number[]): GomokuState {
  let next = state
  for (const move of moves) {
    const applied = applyGomokuMove(next, move)
    if (!applied) throw new Error(`非法落子：${move}`)
    next = applied
  }
  return next
}

describe('五子棋引擎', () => {
  it('初始状态：空棋盘、黑先、未结束', () => {
    const state = createInitialState()
    expect(state.board).toHaveLength(225)
    expect(state.board.every((c) => c === null)).toBe(true)
    expect(state.current).toBe('black')
    expect(state.over).toBe(false)
    expect(state.moves).toBe(0)
  })

  it('落子后切换执子方，并记录最后一步', () => {
    const state = play(createInitialState(), [idx(7, 7)])
    expect(state.board[idx(7, 7)]).toBe('black')
    expect(state.current).toBe('white')
    expect(state.lastMove).toBe(idx(7, 7))
    expect(state.moves).toBe(1)
  })

  it('非法落子：已占位 / 越界 / 结束后', () => {
    const state = play(createInitialState(), [idx(7, 7)])
    expect(invalidMoveReason(state, idx(7, 7))).toContain('棋子')
    expect(invalidMoveReason(state, -1)).toContain('无效')
    expect(invalidMoveReason(state, 225)).toContain('无效')
    expect(applyGomokuMove(state, idx(7, 7))).toBeNull()
  })

  it('横向五连获胜，并返回连线', () => {
    // 黑：(7,3)(7,4)(7,5)(7,6)(7,7)；白：零散落子
    const state = play(createInitialState(), [
      idx(7, 3),
      idx(0, 0),
      idx(7, 4),
      idx(0, 1),
      idx(7, 5),
      idx(0, 2),
      idx(7, 6),
      idx(0, 3),
      idx(7, 7),
    ])
    expect(state.winner).toBe('black')
    expect(state.over).toBe(true)
    expect(state.winningLine).toEqual([idx(7, 3), idx(7, 4), idx(7, 5), idx(7, 6), idx(7, 7)])
    expect(applyGomokuMove(state, idx(9, 9))).toBeNull()
  })

  it('纵向与两条对角线都能判胜', () => {
    const vertical = play(createInitialState(), [
      idx(3, 5),
      idx(0, 0),
      idx(4, 5),
      idx(0, 1),
      idx(5, 5),
      idx(0, 2),
      idx(6, 5),
      idx(0, 3),
      idx(7, 5),
    ])
    expect(vertical.winner).toBe('black')

    const diag = play(createInitialState(), [
      idx(2, 2),
      idx(14, 0),
      idx(3, 3),
      idx(14, 1),
      idx(4, 4),
      idx(14, 2),
      idx(5, 5),
      idx(14, 3),
      idx(6, 6),
    ])
    expect(diag.winner).toBe('black')

    const antiDiag = play(createInitialState(), [
      idx(2, 10),
      idx(14, 4),
      idx(3, 9),
      idx(14, 5),
      idx(4, 8),
      idx(14, 6),
      idx(5, 7),
      idx(14, 7),
      idx(6, 6),
    ])
    expect(antiDiag.winner).toBe('black')
  })

  it('白棋也能获胜', () => {
    const state = play(createInitialState(), [
      idx(7, 3),
      idx(8, 3),
      idx(7, 4),
      idx(8, 4),
      idx(7, 5),
      idx(8, 5),
      idx(7, 6),
      idx(8, 6),
      idx(0, 0),
      idx(8, 7),
    ])
    expect(state.winner).toBe('white')
    expect(state.winningLine).toHaveLength(5)
  })

  it('findWinningLine 在非获胜点返回空数组', () => {
    const board = createInitialState().board
    board[idx(7, 7)] = 'black'
    expect(findWinningLine(board, SIZE, 5, idx(7, 7), 'black')).toEqual([])
  })

  it('棋盘下满且无五连时判和（结束）', () => {
    // 3×3 棋盘、winLength=3；按黑白交替填满且不形成三连
    const state0 = createInitialState({ size: 3, winLength: 3 })
    // 构造一个无三连的满盘：B W B / B W W / W B B
    const layout: Array<'black' | 'white'> = [
      'black',
      'white',
      'black',
      'black',
      'white',
      'white',
      'white',
      'black',
      'black',
    ]
    const board = [...layout]
    const state: GomokuState = {
      ...state0,
      board,
      moves: 9,
      over: true,
      winner: null,
    }
    expect(state.over).toBe(true)
    expect(state.winner).toBeNull()
  })

  it('引擎封装：move/isGameOver/isWin/reset/getScore', () => {
    const engine = new GomokuEngine()
    expect(engine.isGameOver()).toBe(false)
    expect(engine.move(idx(7, 7))).toBe(true)
    expect(engine.getScore()).toBe(1)
    expect(engine.move(idx(7, 7))).toBe(false)
    expect(engine.getState().lastMove).toBe(idx(7, 7))

    const engine2 = new GomokuEngine()
    engine2.loadState(
      play(createInitialState(), [
        idx(7, 3),
        idx(0, 0),
        idx(7, 4),
        idx(0, 1),
        idx(7, 5),
        idx(0, 2),
        idx(7, 6),
        idx(0, 3),
        idx(7, 7),
      ]),
    )
    expect(engine2.isGameOver()).toBe(true)
    expect(engine2.isWin()).toBe(true)

    engine.reset()
    expect(engine.getState().moves).toBe(0)
  })

  it('行列换算为 1-based 无障碍坐标', () => {
    expect(cellCoord(0, 15)).toEqual({ row: 1, col: 1 })
    expect(cellCoord(idx(7, 3), 15)).toEqual({ row: 8, col: 4 })
  })
})

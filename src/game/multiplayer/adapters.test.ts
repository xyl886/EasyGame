import { describe, expect, it } from 'vitest'
import { getGameAdapter, isGameId, MULTIPLAYER_GAMES, type RoomGameAdapter } from './adapters'
import type { GomokuState } from '../gomoku/types'
import type { Connect4State } from '../connect4/types'
import { createInitialState as createGomokuState, applyGomokuMove } from '../gomoku/GameEngine'
import {
  createInitialState as createConnect4State,
  applyConnect4Move,
} from '../connect4/GameEngine'

describe('联机游戏适配器', () => {
  it('只认 gomoku / connect4', () => {
    expect(isGameId('gomoku')).toBe(true)
    expect(isGameId('connect4')).toBe(true)
    expect(isGameId('chess')).toBe(false)
    expect(MULTIPLAYER_GAMES.map((game) => game.id)).toEqual(['gomoku', 'connect4'])
  })

  it('五子棋适配器：落子、判胜、座位映射与状态校验', () => {
    const adapter = getGameAdapter('gomoku') as RoomGameAdapter<GomokuState>
    let state = adapter.createState()
    state = adapter.applyMove(state, 7 * 15 + 7)!
    expect(adapter.turnSeat(state)).toBe('white')

    const nearWin = [7 * 15 + 3, 0, 7 * 15 + 4, 1, 7 * 15 + 5, 2, 7 * 15 + 6, 3].reduce(
      (acc, move) => adapter.applyMove(acc, move)!,
      createGomokuState(),
    )
    const won = adapter.applyMove(nearWin, 7 * 15 + 7)!
    expect(adapter.isOver(won)).toBe(true)
    expect(adapter.winnerSeat(won)).toBe('black')
    expect(adapter.seatLabel('black')).toBe('黑棋')
    expect(adapter.validateState(won)).toBe(true)
    expect(adapter.validateState({ ...won, board: [] })).toBe(false)
    expect(adapter.validateState({ ...won, current: 'red' })).toBe(false)
    // 非法落子返回 null
    expect(adapter.applyMove(won, 0)).toBeNull()
  })

  it('四子棋适配器：列落子、判胜与座位映射', () => {
    const adapter = getGameAdapter('connect4') as RoomGameAdapter<Connect4State>
    let state = adapter.createState()
    for (const col of [0, 4, 1, 5, 2, 6]) {
      state = adapter.applyMove(state, col)!
    }
    state = adapter.applyMove(state, 3)!
    expect(adapter.isOver(state)).toBe(true)
    expect(adapter.winnerSeat(state)).toBe('black')
    expect(adapter.seatLabel('white')).toBe('黄方')
    expect(adapter.validateState(createConnect4State())).toBe(true)
    expect(adapter.validateState({ ...createConnect4State(), board: [] })).toBe(false)

    // 越界列返回 null
    expect(adapter.applyMove(createConnect4State(), 7)).toBeNull()
  })

  it('状态校验与引擎快照兼容', () => {
    expect(getGameAdapter('gomoku').validateState(createGomokuState())).toBe(true)
    expect(getGameAdapter('connect4').validateState(createConnect4State())).toBe(true)
    // 交叉校验应失败（板长不同）
    expect(getGameAdapter('gomoku').validateState(createConnect4State())).toBe(false)
    const gomokuState = createGomokuState()
    expect(getGameAdapter('connect4').validateState(gomokuState)).toBe(false)
    expect(applyGomokuMove(createGomokuState(), 0)).not.toBeNull()
    expect(applyConnect4Move(createConnect4State(), 0)).not.toBeNull()
  })
})

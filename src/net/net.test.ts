import { describe, expect, it } from 'vitest'
import {
  generateRoomCode,
  inviteUrl,
  isValidRoomCode,
  normalizeRoomCode,
  peerIdFor,
} from './roomCode'
import { isClientMessage, isHostMessage, isNetMessage } from './protocol'
import { createInitialState as createGomokuState } from '../game/gomoku/GameEngine'
import { createInitialState as createConnect4State } from '../game/connect4/GameEngine'

describe('房号', () => {
  it('生成 6 位安全字符房号（不含 I/O/0/1）', () => {
    for (let i = 0; i < 80; i++) {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    }
  })

  it('使用注入的随机源，便于测试复现', () => {
    expect(generateRoomCode(() => 0)).toBe('AAAAAA')
    expect(generateRoomCode(() => 0.999999)).toBe('999999')
  })

  it('归一化：空格/连字符/小写/非法字符都会被处理', () => {
    expect(normalizeRoomCode(' ab-cd 23 ')).toBe('ABCD23')
    expect(normalizeRoomCode('AB1O0CD')).toBe('ABCD')
    expect(normalizeRoomCode('abcdefghi')).toBe('ABCDEF')
  })

  it('合法性校验', () => {
    expect(isValidRoomCode('ABCD23')).toBe(true)
    expect(isValidRoomCode('ABCDE0')).toBe(false)
    expect(isValidRoomCode('ABC')).toBe(false)
    expect(isValidRoomCode('abc def')).toBe(false)
  })

  it('peer id 与邀请链接（按游戏区分路径）', () => {
    expect(peerIdFor('ABCD23')).toBe('easygame-gomoku-ABCD23')
    const location = { origin: 'https://xyl886.github.io', pathname: '/EasyGame/' }
    expect(inviteUrl('ABCD23', 'gomoku', location)).toBe(
      'https://xyl886.github.io/EasyGame/#/multiplayer/gomoku?room=ABCD23',
    )
    expect(inviteUrl('ABCD23', 'connect4', location)).toBe(
      'https://xyl886.github.io/EasyGame/#/multiplayer/connect4?room=ABCD23',
    )
  })
})

describe('P2P 消息协议校验（v2）', () => {
  const gomokuState = createGomokuState()
  const connect4State = createConnect4State()

  it('接受合法客户端消息', () => {
    expect(
      isNetMessage({ t: 'hello', v: 2, game: 'gomoku', token: 'abcdef012345', role: 'player' }),
    ).toBe(true)
    expect(
      isClientMessage({ t: 'hello', v: 2, game: 'connect4', token: 'x', role: 'spectator' }),
    ).toBe(true)
    expect(isClientMessage({ t: 'move', v: 2, move: 3 })).toBe(true)
    expect(isClientMessage({ t: 'chat', v: 2, id: 'nice' })).toBe(true)
    expect(isClientMessage({ t: 'rematch', v: 2 })).toBe(true)
    expect(isClientMessage({ t: 'bye', v: 2 })).toBe(true)
  })

  it('接受合法房主消息', () => {
    expect(
      isHostMessage({
        t: 'welcome',
        v: 2,
        role: 'player',
        seat: 'white',
        state: gomokuState,
        serial: 1,
        resumed: false,
        spectators: 0,
      }),
    ).toBe(true)
    expect(
      isHostMessage({ t: 'state', v: 2, state: connect4State, serial: 2, spectators: 1 }),
    ).toBe(true)
    expect(isHostMessage({ t: 'chat', v: 2, id: 'gg', seat: 'black' })).toBe(true)
    expect(
      isHostMessage({ t: 'status', v: 2, guest: true, spectators: 0, reconnecting: false }),
    ).toBe(true)
  })

  it('拒绝版本不符、未知类型、非法字段', () => {
    expect(isNetMessage(null)).toBe(false)
    expect(isNetMessage({ t: 'hello', v: 1 })).toBe(false)
    expect(isNetMessage({ t: 'unknown', v: 2 })).toBe(false)
    expect(isNetMessage({ t: 'hello', v: 2, game: 'chess', token: 'x', role: 'player' })).toBe(
      false,
    )
    expect(isNetMessage({ t: 'hello', v: 2, game: 'gomoku', token: '', role: 'player' })).toBe(
      false,
    )
    expect(isClientMessage({ t: 'move', v: 2, move: 'a' })).toBe(false)
    expect(isClientMessage({ t: 'chat', v: 2, id: '' })).toBe(false)
    expect(
      isHostMessage({
        t: 'welcome',
        v: 2,
        role: 'player',
        seat: 'red',
        state: gomokuState,
        serial: 1,
        resumed: false,
        spectators: 0,
      }),
    ).toBe(false)
    expect(isHostMessage({ t: 'state', v: 2, state: 'bad', serial: 1, spectators: 0 })).toBe(false)
  })
})

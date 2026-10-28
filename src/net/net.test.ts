import { describe, expect, it } from 'vitest'
import {
  generateRoomCode,
  inviteUrl,
  isValidRoomCode,
  normalizeRoomCode,
  peerIdFor,
} from './roomCode'
import { isNetMessage } from './protocol'
import { createInitialState } from '../game/gomoku/GameEngine'

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

  it('peer id 与邀请链接', () => {
    expect(peerIdFor('ABCD23')).toBe('easygame-gomoku-ABCD23')
    expect(
      inviteUrl('ABCD23', { origin: 'https://xyl886.github.io', pathname: '/EasyGame/' }),
    ).toBe('https://xyl886.github.io/EasyGame/#/multiplayer/gomoku?room=ABCD23')
  })
})

describe('P2P 消息协议校验', () => {
  const state = createInitialState()

  it('接受合法的 hello/move/state/rematch/bye', () => {
    expect(isNetMessage({ t: 'hello', v: 1 })).toBe(true)
    expect(isNetMessage({ t: 'rematch', v: 1 })).toBe(true)
    expect(isNetMessage({ t: 'bye', v: 1 })).toBe(true)
    expect(isNetMessage({ t: 'move', v: 1, index: 0 })).toBe(true)
    expect(isNetMessage({ t: 'state', v: 1, state })).toBe(true)
  })

  it('拒绝版本不符、未知类型与结构异常的消息', () => {
    expect(isNetMessage(null)).toBe(false)
    expect(isNetMessage('hello')).toBe(false)
    expect(isNetMessage({ t: 'hello', v: 2 })).toBe(false)
    expect(isNetMessage({ t: 'unknown', v: 1 })).toBe(false)
    expect(isNetMessage({ t: 'move', v: 1, index: -1 })).toBe(false)
    expect(isNetMessage({ t: 'move', v: 1, index: 1.5 })).toBe(false)
    expect(isNetMessage({ t: 'state', v: 1, state: { ...state, board: [] } })).toBe(false)
    expect(isNetMessage({ t: 'state', v: 1, state: { ...state, current: 'red' } })).toBe(false)
  })
})

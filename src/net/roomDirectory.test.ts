// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  brokerUrls,
  buildRoomPayload,
  isRoomFresh,
  mergeRoom,
  parseRoomPayload,
  parseRoomTopic,
  roomTopic,
  sortRooms,
  type PublicRoomInfo,
} from './roomDirectory'

const room: PublicRoomInfo = {
  code: 'ABCD23',
  gameId: 'gomoku',
  status: 'waiting',
  players: 1,
  createdAt: 1_000,
  updatedAt: 2_000,
}

describe('房间目录 topic 与 payload', () => {
  beforeEach(() => localStorage.clear())

  it('生成并解析房间 topic', () => {
    const topic = roomTopic('connect4', 'ABCD23')
    expect(topic).toBe('easygame/v1/xyl886/rooms/connect4/ABCD23')
    expect(parseRoomTopic(topic)).toEqual({ gameId: 'connect4', code: 'ABCD23' })
  })

  it('非法 topic 返回 null', () => {
    expect(parseRoomTopic('easygame/v1/xyl886/rooms/gomoku')).toBeNull()
    expect(parseRoomTopic('easygame/v1/xyl886/rooms/chess/ABCD23')).toBeNull()
    expect(parseRoomTopic('easygame/v1/xyl886/rooms/gomoku/BAD')).toBeNull()
    expect(parseRoomTopic('other/v1/xyl886/rooms/gomoku/ABCD23')).toBeNull()
  })

  it('构造并解析房间元数据', () => {
    const payload = buildRoomPayload(room)
    expect(parseRoomPayload('gomoku', 'ABCD23', payload, 3_000)).toEqual(room)
  })

  it('拒绝过期、错误的房间元数据', () => {
    const payload = buildRoomPayload(room)
    expect(parseRoomPayload('connect4', 'ABCD23', payload)).toBeNull()
    expect(parseRoomPayload('gomoku', 'WXYZ45', payload)).toBeNull()
    expect(parseRoomPayload('gomoku', 'ABCD23', '{bad json')).toBeNull()
    expect(parseRoomPayload('gomoku', 'ABCD23', JSON.stringify({ v: 1 }))).toBeNull()
    const stale = JSON.stringify({ ...JSON.parse(payload), updatedAt: Date.now() + 120_000 })
    expect(parseRoomPayload('gomoku', 'ABCD23', stale)).toBeNull()
  })

  it('TTL 与排序、合并', () => {
    const now = 100_000
    expect(isRoomFresh({ ...room, updatedAt: now - 10_000 }, now)).toBe(true)
    expect(isRoomFresh({ ...room, updatedAt: now - 60_000 }, now)).toBe(false)

    const sorted = sortRooms([
      { ...room, code: 'AAAA22', updatedAt: 1 },
      { ...room, code: 'BBBB33', updatedAt: 9 },
    ])
    expect(sorted.map((item) => item.code)).toEqual(['BBBB33', 'AAAA22'])

    const map = new Map<string, PublicRoomInfo>()
    mergeRoom(map, room)
    mergeRoom(map, { ...room, status: 'playing', players: 2, updatedAt: 3_000 })
    expect(map.get('gomoku:ABCD23')?.status).toBe('playing')
  })

  it('broker 地址支持 localStorage 覆盖', () => {
    expect(brokerUrls()[0]).toContain('wss://')
    localStorage.setItem('easygame-room-broker', 'ws://127.0.0.1:8888/mqtt')
    expect(brokerUrls()).toEqual(['ws://127.0.0.1:8888/mqtt'])
  })
})

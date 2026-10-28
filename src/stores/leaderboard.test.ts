// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLeaderboardStore } from './leaderboard'
import { dedupeKeepBest } from '../game/base/leaderboard'
import type { LeaderboardEntry } from '../game/base/leaderboard'

const GAME_ID = 'test-game'

function makeStore() {
  return useLeaderboardStore(GAME_ID)
}

describe('排行榜 store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('新增记录，低分忽略，同分刷新时间，高分替换', () => {
    const store = makeStore()
    const first = store.addEntry({ score: 100, difficulty: 'normal', size: 4 })
    expect(first).not.toBeNull()
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].score).toBe(100)

    expect(store.addEntry({ score: 50, difficulty: 'normal', size: 4 })).toBeNull()

    const same = store.addEntry({ score: 100, difficulty: 'normal', size: 4 })
    expect(same).not.toBeNull()
    expect(store.entries).toHaveLength(1)

    const better = store.addEntry({ score: 200, difficulty: 'normal', size: 4 })
    expect(better?.score).toBe(200)
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].score).toBe(200)
  })

  it('不同维度分别记录，并可按分数/时间排序', () => {
    const store = makeStore()
    store.addEntry({ score: 10, difficulty: 'easy', size: 4 })
    store.addEntry({ score: 30, difficulty: 'hard', size: 4 })
    store.addEntry({ score: 20, difficulty: 'normal', size: 5 })

    expect(store.entries).toHaveLength(3)
    expect(store.byScore.map((e) => e.score)).toEqual([30, 20, 10])

    // 时间排序用固定时间戳验证，避免同一毫秒内的写入顺序不稳定
    store.clearAll()
    store.seedEntries([
      { id: 'a', playerName: '甲', score: 10, timestamp: 100, difficulty: 'easy', size: 4 },
      { id: 'b', playerName: '乙', score: 30, timestamp: 200, difficulty: 'hard', size: 4 },
      { id: 'c', playerName: '丙', score: 20, timestamp: 300, difficulty: 'normal', size: 5 },
    ])
    expect(store.byTime.map((e) => e.score)).toEqual([20, 30, 10])
  })

  it('昵称持久化，空名回退匿名玩家', () => {
    const store = makeStore()
    store.setPlayerName('  小明  ')
    expect(store.playerName).toBe('小明')
    expect(localStorage.getItem('easygame-player-name')).toContain('小明')

    store.setPlayerName('   ')
    expect(store.playerName).toBe('匿名玩家')
  })

  it('seedEntries 仅在空榜时注入，并做去重清洗', () => {
    const store = makeStore()
    const records: LeaderboardEntry[] = [
      { id: 'a', playerName: '甲', score: 10, timestamp: 1, difficulty: 'normal', size: 4 },
      { id: 'b', playerName: '甲', score: 20, timestamp: 2, difficulty: 'normal', size: 4 },
    ]
    store.seedEntries(records)
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].score).toBe(20)

    store.seedEntries([{ id: 'c', playerName: '乙', score: 99, timestamp: 3 }])
    expect(store.entries).toHaveLength(1)
  })

  it('删除单条、清空与历史最高分筛选', () => {
    const store = makeStore()
    const entry = store.addEntry({ score: 88, difficulty: 'normal', size: 4 })
    store.addEntry({ score: 66, difficulty: 'hard', size: 5 })

    expect(store.getBestScore()).toBe(88)
    expect(store.getBestScore({ difficulty: 'hard' })).toBe(66)
    expect(store.getBestScore({ difficulty: 'easy' })).toBeNull()

    store.removeEntry(entry!.id)
    expect(store.entries.every((e) => e.id !== entry!.id)).toBe(true)

    store.clearAll()
    expect(store.entries).toEqual([])
  })

  it('重新创建 store 时从 localStorage 恢复', () => {
    const store = makeStore()
    store.addEntry({ score: 42, difficulty: 'normal', size: 4 })

    setActivePinia(createPinia())
    const reloaded = makeStore()
    expect(reloaded.entries).toHaveLength(1)
    expect(reloaded.entries[0].score).toBe(42)
  })
})

describe('dedupeKeepBest', () => {
  it('相同玩家+维度保留最高分', () => {
    const entries: LeaderboardEntry[] = [
      { id: '1', playerName: '甲', score: 10, timestamp: 1, difficulty: 'normal', size: 4 },
      { id: '2', playerName: '甲', score: 30, timestamp: 2, difficulty: 'normal', size: 4 },
      { id: '3', playerName: '乙', score: 20, timestamp: 3, difficulty: 'normal', size: 4 },
    ]
    const best = dedupeKeepBest(entries)
    expect(best).toHaveLength(2)
    expect(best.find((e) => e.playerName === '甲')?.score).toBe(30)
  })
})

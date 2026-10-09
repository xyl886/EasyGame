import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import { leaderboardKey } from '../game/base/leaderboard'
import { useLeaderboardStore } from '../stores/leaderboard'
import { useExtraPuzzleLeaderboard } from './useExtraPuzzleLeaderboard'
import { useExtraPuzzleSettings } from './useExtraPuzzleSettings'

describe('新游戏设置', () => {
  beforeEach(() => localStorage.clear())

  it('按游戏隔离持久化设置，恢复默认值并规范化损坏配置', () => {
    const first = useExtraPuzzleSettings('memory-match-test', { pairs: 8 }, (config) => ({
      pairs: [4, 6, 8].includes(config.pairs) ? config.pairs : 8,
    }))

    first.openSettings()
    expect(first.state.showSettings).toBe(true)
    first.setConfig({ pairs: 4 })
    expect(first.state.config.pairs).toBe(4)

    const restored = useExtraPuzzleSettings('memory-match-test', { pairs: 8 }, (config) => ({
      pairs: [4, 6, 8].includes(config.pairs) ? config.pairs : 8,
    }))
    expect(restored.state.config.pairs).toBe(4)
    restored.resetToDefault()
    expect(restored.state.config.pairs).toBe(8)

    StorageAdapter.set('easygame-extra-settings-invalid', { pairs: 99 })
    const invalid = useExtraPuzzleSettings('invalid', { pairs: 8 }, (config) => ({
      pairs: [4, 6, 8].includes(config.pairs) ? config.pairs : 8,
    }))
    expect(invalid.state.config.pairs).toBe(8)
  })
})

describe('游戏排行榜接入', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => vi.useRealTimers())

  it('排行榜按游戏隔离、同玩家同维度只保留最高分并持久化', () => {
    const board = useLeaderboardStore('memory-match-test')
    expect(board.addEntry({ score: 600, difficulty: '4', size: 4, won: true })).not.toBeNull()
    expect(board.addEntry({ score: 500, difficulty: '4', size: 4, won: true })).toBeNull()
    expect(board.addEntry({ score: 700, difficulty: '8', size: 8, won: true })).not.toBeNull()

    expect(board.entries).toHaveLength(2)
    expect(board.getBestScore({ difficulty: '4' })).toBe(600)
    expect(StorageAdapter.get(leaderboardKey('memory-match-test'))).toHaveLength(2)
  })

  it('新增记录返回本次提交的记录，而不是排序后的末条记录', () => {
    const board = useLeaderboardStore('leaderboard-return-value-test')
    board.addEntry({ score: 900, difficulty: 'easy', won: true })
    board.addEntry({ score: 400, difficulty: 'hard', won: true })

    const submitted = board.addEntry({ score: 700, difficulty: 'normal', won: true })

    expect(submitted?.score).toBe(700)
    expect(board.entries.map((entry) => entry.score)).toEqual([900, 700, 400])
  })

  it('新游戏排行榜提交器每局最多记一次，失败局不入榜', () => {
    const result = useExtraPuzzleLeaderboard('one-stroke-test')
    expect(result.record({ score: 0, won: false })).toBeNull()
    expect(result.record({ score: 800, moves: 14, difficulty: '5', won: true })).not.toBeNull()
    expect(result.record({ score: 900, moves: 14, difficulty: '5', won: true })).toBeNull()
    expect(result.leaderboard.entries).toHaveLength(1)

    result.beginRound()
    expect(result.record({ score: 900, moves: 14, difficulty: '5', won: true })).not.toBeNull()
    expect(result.leaderboard.entries[0].score).toBe(900)
  })

  it('计时从首个操作开始，等待时间不计入，重开后清零', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const round = useExtraPuzzleLeaderboard('round-timer-test')

    vi.advanceTimersByTime(120_000)
    expect(round.durationSeconds()).toBe(0)

    round.startTiming()
    vi.advanceTimersByTime(2_500)
    expect(round.durationSeconds()).toBe(2)

    round.beginRound()
    expect(round.durationSeconds()).toBe(0)
  })
})

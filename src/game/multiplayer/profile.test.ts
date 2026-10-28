import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PROFILE,
  PROFILE_KEY,
  RANK_TIERS,
  START_RATING,
  applyMatchResult,
  loadProfile,
  nextTierGap,
  saveProfile,
  tierOf,
} from './profile'
import { quickMessageText, isValidQuickMessage, QUICK_MESSAGES } from '../../net/quickMessages'

describe('联机本机档案', () => {
  beforeEach(() => localStorage.clear())

  it('无存档时使用默认值', () => {
    expect(loadProfile()).toEqual(DEFAULT_PROFILE)
    expect(DEFAULT_PROFILE.rating).toBe(START_RATING)
  })

  it('保存后可重新读取', () => {
    const profile = { ...DEFAULT_PROFILE, rating: 1123, wins: 4, games: 7 }
    saveProfile(profile)
    expect(loadProfile()).toEqual(profile)
  })

  it('损坏/越界数据会被夹回安全范围', () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ rating: -50, wins: -3, streak: -1 }))
    const profile = loadProfile()
    expect(profile.rating).toBe(0)
    expect(profile.wins).toBe(0)
    expect(profile.streak).toBe(0)

    localStorage.setItem(PROFILE_KEY, JSON.stringify({ rating: 99999 }))
    expect(loadProfile().rating).toBe(3000)
  })

  it('胜利加分会随连胜增加，失败扣分，平局不动', () => {
    const first = applyMatchResult(DEFAULT_PROFILE, 'win')
    expect(first.delta).toBeGreaterThan(0)
    expect(first.profile.wins).toBe(1)
    expect(first.profile.streak).toBe(1)

    const second = applyMatchResult(first.profile, 'win')
    expect(second.delta).toBeGreaterThan(first.delta)
    expect(second.profile.bestStreak).toBe(2)

    const loss = applyMatchResult(second.profile, 'loss')
    expect(loss.delta).toBeLessThan(0)
    expect(loss.profile.streak).toBe(0)

    const draw = applyMatchResult(loss.profile, 'draw')
    expect(draw.delta).toBe(0)
    expect(draw.profile.draws).toBe(1)
  })

  it('段位按分数划分，且能计算下一段位差距', () => {
    expect(tierOf(0).name).toBe('青铜')
    expect(tierOf(START_RATING).name).toBe('白银')
    expect(tierOf(1200).name).toBe('黄金')
    expect(tierOf(1600).name).toBe('钻石')

    const gap = nextTierGap(1050)
    expect(gap?.next.name).toBe('黄金')
    expect(gap?.gap).toBe(50)
    expect(nextTierGap(2000)).toBeNull()
    expect(RANK_TIERS.length).toBeGreaterThan(3)
  })
})

describe('快捷语', () => {
  it('id 唯一且能取到文案', () => {
    const ids = QUICK_MESSAGES.map((message) => message.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(quickMessageText('nice')).toBe('好棋！')
  })

  it('非法 id 返回 null', () => {
    expect(quickMessageText('unknown')).toBeNull()
    expect(quickMessageText('<script>')).toBeNull()
    expect(isValidQuickMessage('laugh')).toBe(true)
  })
})

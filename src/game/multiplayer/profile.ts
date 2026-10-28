/** 联机本机档案：段位 / 战绩（无后端，仅本机记录，娱乐向） */
import { StorageAdapter } from '../../adapters/StorageAdapter'

export interface MultiplayerProfile {
  rating: number
  wins: number
  losses: number
  draws: number
  /** 当前连胜（负/平清零） */
  streak: number
  bestStreak: number
  games: number
}

export const PROFILE_KEY = 'easygame-mp-profile'
export const START_RATING = 1000
const WIN_GAIN = 18
const LOSS_COST = 14

export type MatchResult = 'win' | 'loss' | 'draw'

export const DEFAULT_PROFILE: MultiplayerProfile = {
  rating: START_RATING,
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  bestStreak: 0,
  games: 0,
}

export function loadProfile(): MultiplayerProfile {
  const saved = StorageAdapter.get<Partial<MultiplayerProfile>>(PROFILE_KEY)
  if (!saved) return { ...DEFAULT_PROFILE }
  return {
    ...DEFAULT_PROFILE,
    ...saved,
    // 防御旧数据/手工篡改
    rating: clampRating(saved.rating),
    wins: nonNegative(saved.wins),
    losses: nonNegative(saved.losses),
    draws: nonNegative(saved.draws),
    games: nonNegative(saved.games),
    streak: nonNegative(saved.streak),
    bestStreak: Math.max(nonNegative(saved.bestStreak), nonNegative(saved.streak)),
  }
}

export function saveProfile(profile: MultiplayerProfile): void {
  StorageAdapter.set(PROFILE_KEY, profile)
}

function clampRating(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return START_RATING
  return Math.min(3000, Math.max(0, Math.round(value)))
}

function nonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

/** 结算一局：返回新档案（不修改入参）与分数变化 */
export function applyMatchResult(
  profile: MultiplayerProfile,
  result: MatchResult,
): { profile: MultiplayerProfile; delta: number } {
  const next: MultiplayerProfile = { ...profile, games: profile.games + 1 }
  let delta: number

  if (result === 'win') {
    next.wins += 1
    next.streak += 1
    next.bestStreak = Math.max(next.bestStreak, next.streak)
    delta = WIN_GAIN + Math.min(12, Math.floor(next.streak / 2) * 3)
  } else if (result === 'loss') {
    next.losses += 1
    next.streak = 0
    delta = -LOSS_COST
  } else {
    next.draws += 1
    next.streak = 0
    delta = 0
  }

  next.rating = clampRating(profile.rating + delta)
  // 夹取后的实际变化（低段位扣分不会跌破 0）
  return { profile: next, delta: next.rating - profile.rating }
}

export interface RankTier {
  name: string
  min: number
  /** 在 UI 上使用的色值（陶土系） */
  color: string
}

export const RANK_TIERS: RankTier[] = [
  { name: '青铜', min: 0, color: '#6f533d' },
  { name: '白银', min: 900, color: '#6b6a65' },
  { name: '黄金', min: 1100, color: '#8a6a26' },
  { name: '铂金', min: 1300, color: '#4f6f6a' },
  { name: '钻石', min: 1500, color: '#6f5f93' },
]

export function tierOf(rating: number): RankTier {
  let current = RANK_TIERS[0]
  for (const tier of RANK_TIERS) {
    if (rating >= tier.min) current = tier
  }
  return current
}

/** 距离下一段位还差多少（已是最高段位返回 null） */
export function nextTierGap(rating: number): { next: RankTier; gap: number } | null {
  const next = RANK_TIERS.find((tier) => tier.min > rating)
  if (!next) return null
  return { next, gap: next.min - rating }
}

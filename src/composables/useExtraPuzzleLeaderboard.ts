import { useLeaderboardStore } from '../stores/leaderboard'
import type { LeaderboardEntry } from '../game/base/leaderboard'

type GameResult = Omit<LeaderboardEntry, 'id' | 'timestamp' | 'playerName'> &
  Partial<Pick<LeaderboardEntry, 'playerName'>>

/** 统一新游戏提交胜利记录的入口，并避免一局重复写榜。 */
export function useExtraPuzzleLeaderboard(gameId: string) {
  const leaderboard = useLeaderboardStore(gameId)
  let recorded = false
  let roundStartedAt: number | null = null

  return {
    leaderboard,
    beginRound() {
      recorded = false
      roundStartedAt = null
    },
    startTiming() {
      roundStartedAt ??= Date.now()
    },
    durationSeconds() {
      return roundStartedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - roundStartedAt) / 1000))
    },
    record(result: GameResult) {
      if (recorded || !result.won) return null
      recorded = true
      return leaderboard.addEntry(result)
    },
  }
}

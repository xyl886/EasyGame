import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import {
  DEFAULT_PLAYER_NAME,
  DEFAULT_TOP_N,
  PLAYER_NAME_KEY,
  genEntryId,
  leaderboardKey,
  dedupeKeepBest,
  type LeaderboardEntry,
} from '../game/base/leaderboard'

/**
 * 排行榜 store 工厂
 * 每个游戏用独立 store 实例（id = `leaderboard-${gameId}`），底层 localStorage key 也独立。
 * Pinia 内部按 store id 缓存定义，重复调用 useLeaderboardStore('2048') 返回同一 store。
 */
export function useLeaderboardStore(gameId: string) {
  const storageKey = leaderboardKey(gameId)
  const storeId = `leaderboard-${gameId}`

  return defineStore(storeId, {
    state: () => {
      // 首次加载：对旧版本遗留的"历史记录型"数据自动按 (玩家+维度) 去重，
      // 清洗为"每玩家每维度只保留最高分"的榜单形态。
      const raw = StorageAdapter.get<LeaderboardEntry[]>(storageKey) ?? []
      const entries = dedupeKeepBest(raw)
      // 若发生了去重（条数减少），把清洗后的数据立即回写。
      if (entries.length !== raw.length) {
        StorageAdapter.set(storageKey, entries)
      }
      return {
        /** 该游戏的全部记录（按 玩家+维度 去重后，分数降序的最高分榜） */
        entries,
        /** 玩家昵称，跨游戏共享（写入独立 key） */
        playerName:
          StorageAdapter.get<string>(PLAYER_NAME_KEY) ?? DEFAULT_PLAYER_NAME,
      }
    },
    getters: {
      /** 按 score 降序的全部记录 */
      byScore: (state) =>
        [...state.entries].sort((a, b) => b.score - a.score),
      /** 按时间降序的全部记录 */
      byTime: (state) =>
        [...state.entries].sort((a, b) => b.timestamp - a.timestamp),
    },
    actions: {
      /**
       * 添加一条记录 → 实际语义：向「最高分榜」提交本次得分。
       * 规则：同一 (playerName + difficulty + size) 组合只保留最高分一条；
       * 新分数更高才替换并更新 timestamp，否则忽略。
       * @param input 不含 id/timestamp/playerName 的部分
       * @returns 若分数更新则返回新/替换后的记录；若更低则返回 null。
       */
      addEntry(
        input: Omit<LeaderboardEntry, 'id' | 'timestamp' | 'playerName'> &
          Partial<Pick<LeaderboardEntry, 'playerName'>>,
      ): LeaderboardEntry | null {
        const playerName = (input.playerName ?? this.playerName).trim() || DEFAULT_PLAYER_NAME
        const score = input.score
        const difficulty = input.difficulty
        const size = input.size
        // 尝试找到同一玩家同维度的现有记录
        const existIdx = this.entries.findIndex(
          (e) =>
            e.playerName === playerName &&
            e.difficulty === difficulty &&
            e.size === size,
        )
        if (existIdx >= 0) {
          const existing = this.entries[existIdx]
          if (score < existing.score) return null
          if (score === existing.score) {
            // 同分：只把 timestamp 刷新，体现最近一次刷新时间（不新增记录）
            const refreshed: LeaderboardEntry = {
              ...existing,
              timestamp: Date.now(),
              duration: input.duration ?? existing.duration,
              moves: input.moves ?? existing.moves,
              won: input.won ?? existing.won,
            }
            this.entries.splice(existIdx, 1, refreshed)
            this.entries = dedupeKeepBest(this.entries).slice(0, DEFAULT_TOP_N)
            this.persist()
            return refreshed
          }
          // 新分数更高：替换为新 id + 新 timestamp
          const replaced: LeaderboardEntry = {
            id: genEntryId(),
            timestamp: Date.now(),
            playerName,
            score,
            difficulty,
            size,
            duration: input.duration,
            moves: input.moves,
            won: input.won,
          }
          this.entries.splice(existIdx, 1, replaced)
        } else {
          // 该玩家此维度首次上榜：直接新增
          const entry: LeaderboardEntry = {
            id: genEntryId(),
            timestamp: Date.now(),
            playerName,
            score,
            difficulty,
            size,
            duration: input.duration,
            moves: input.moves,
            won: input.won,
          }
          this.entries.push(entry)
        }
        // 统一去重 + 分数降序 Top N
        this.entries = dedupeKeepBest(this.entries).slice(0, DEFAULT_TOP_N)
        this.persist()
        return existIdx >= 0
          ? this.entries.find((e) => e.playerName === playerName && e.difficulty === difficulty && e.size === size) ?? null
          : (this.entries[this.entries.length - 1] ?? null)
      },

      /** 设置玩家昵称（同时写入跨游戏共享 key） */
      setPlayerName(name: string) {
        const trimmed = name.trim()
        this.playerName = trimmed || DEFAULT_PLAYER_NAME
        StorageAdapter.set(PLAYER_NAME_KEY, this.playerName)
      },

      /**
       * 批量注入预构建记录（用于历史 best 数据迁移）。
       * 调用方负责构建完整字段（含 id/timestamp）。
       * 仅在当前为空时使用，避免与已有记录混淆。
       * 注入后会按「玩家+维度 → 最高分」规则去重清洗。
       */
      seedEntries(records: LeaderboardEntry[]) {
        if (this.entries.length > 0 || records.length === 0) return
        this.entries = dedupeKeepBest(records).slice(0, DEFAULT_TOP_N)
        this.persist()
      },

      /** 删除单条记录 */
      removeEntry(id: string) {
        this.entries = this.entries.filter((e) => e.id !== id)
        this.persist()
      },

      /** 清空该游戏的全部记录 */
      clearAll() {
        this.entries = []
        this.persist()
      },

      /**
       * 取指定维度下的最高分（用于在游戏内显示"历史最高"）
       * @param filter 维度筛选；不传则取全部记录的最高分
       */
      getBestScore(filter?: { difficulty?: string; size?: number }): number | null {
        const filtered = this.entries.filter(
          (e) =>
            (!filter?.difficulty || e.difficulty === filter.difficulty) &&
            (!filter?.size || e.size === filter.size),
        )
        if (filtered.length === 0) return null
        return Math.max(...filtered.map((e) => e.score))
      },

      /** 持久化到 localStorage */
      persist() {
        StorageAdapter.set(storageKey, this.entries)
      },
    },
  })()
}

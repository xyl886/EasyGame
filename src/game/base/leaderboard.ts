/**
 * 排行榜通用类型定义
 * 单游戏内榜：每个游戏维护独立的 Top N 记录，含维度筛选（难度/尺寸等）。
 * 跨游戏通用，新游戏按需声明自己的维度配置后即可接入。
 */

/** 单条排行榜记录 */
export interface LeaderboardEntry {
  /** 唯一 id（timestamp + 随机串，便于删除时定位） */
  id: string
  /** 玩家昵称（默认"匿名玩家"，可在排行榜面板里修改并持久化） */
  playerName: string
  /** 得分 */
  score: number
  /** 提交时间戳（Date.now()），用于按时间排序 */
  timestamp: number
  /** 维度：难度（每个游戏自己定义枚举字符串） */
  difficulty?: string
  /** 维度：尺寸（如 2048 的 4/5/6/7，扫雷的 9×9/16×16） */
  size?: number
  /** 维度：游戏时长（秒），可选 */
  duration?: number
  /** 维度：操作步数，可选 */
  moves?: number
  /** 是否达到胜利条件（用于区分"通关"与"失败结算"） */
  won?: boolean
}

/** 维度筛选项配置：用于排行榜面板生成筛选 chip */
export interface LeaderboardDimension {
  /** 字段名，对应 LeaderboardEntry 上的键 */
  key: 'difficulty' | 'size'
  /** 显示名称 */
  label: string
  /** 可选值列表 */
  values: Array<{ value: string | number; label: string }>
}

/** 排行榜配置：每个游戏在接入时声明 */
export interface LeaderboardConfig {
  gameId: string
  gameName: string
  /** 可筛选维度（如难度、尺寸） */
  dimensions?: LeaderboardDimension[]
  /** 排行榜保留的最大条数，默认 50 */
  topN?: number
}

/** 默认玩家名 */
export const DEFAULT_PLAYER_NAME = '匿名玩家'

/** 玩家名 localStorage 键（跨游戏共享） */
export const PLAYER_NAME_KEY = 'easygame-player-name'

/** 排行榜 localStorage 键前缀 */
export const LEADERBOARD_KEY_PREFIX = 'easygame-leaderboard-'

/** 默认保留条数 */
export const DEFAULT_TOP_N = 50

/** 排行榜 localStorage 键生成 */
export function leaderboardKey(gameId: string): string {
  return `${LEADERBOARD_KEY_PREFIX}${gameId}`
}

/** 生成新条目 id */
export function genEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 生成排行榜「玩家 + 维度」的唯一键：同一玩家在相同难度/尺寸下只保留一条最高分记录。
 * 当某维度缺失时，该分量以 "∗" 通配，避免缺失维度意外与其他键撞车。
 */
export function playerDimensionKey(entry: Pick<LeaderboardEntry, 'playerName' | 'difficulty' | 'size'>): string {
  const diff = entry.difficulty === undefined || entry.difficulty === null ? '∗' : String(entry.difficulty)
  const sz = entry.size === undefined || entry.size === null ? '∗' : String(entry.size)
  const name = String(entry.playerName ?? DEFAULT_PLAYER_NAME)
  // 用竖线分隔，保证 playerName 中若意外含竖线也能区分
  return `p=${name}|d=${diff}|s=${sz}`
}

/**
 * 把一组历史记录按「玩家 + 维度」去重，保留每个组合下的最高分。
 * 分数相同时保留时间更新的那条（timestamp 更大）。
 * 结果仍按分数降序、再按时间降序排序，但总长度会 ≤ 输入。
 * 此函数用于 addEntry 时合并，以及首次加载时对迁移的旧数据做清洗。
 */
export function dedupeKeepBest(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const bestMap = new Map<string, LeaderboardEntry>()
  for (const e of entries) {
    const key = playerDimensionKey(e)
    const prev = bestMap.get(key)
    if (
      !prev ||
      e.score > prev.score ||
      (e.score === prev.score && e.timestamp > prev.timestamp)
    ) {
      bestMap.set(key, e)
    }
  }
  return Array.from(bestMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.timestamp - a.timestamp
  })
}

/** 格式化时间戳为可读字符串 */
export function formatTimestamp(ts: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 扫雷类型定义
 */

export type MineDifficulty = 'beginner' | 'intermediate' | 'expert'

export const DIFFICULTY_LABELS: Record<MineDifficulty, string> = {
  beginner: '初级',
  intermediate: '中级',
  expert: '高级',
}

/** 三档经典难度 */
export interface MinePreset {
  rows: number
  cols: number
  mines: number
}

export const MINE_PRESETS: Record<MineDifficulty, MinePreset> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
}

/** 标记状态 */
export type FlagState = 'none' | 'flag' | 'question'

export interface MineCell {
  isMine: boolean
  revealed: boolean
  flag: FlagState
  /** 周围雷数（0-8，未翻开时无意义） */
  adjacent: number
}

export type MineStatus = 'ready' | 'playing' | 'won' | 'lost'

export interface MineConfig {
  difficulty: MineDifficulty
}

export interface MineState {
  rows: number
  cols: number
  mines: number
  cells: MineCell[]
  flags: number
  status: MineStatus
  /** 翻开次数 */
  moves: number
  startTime: number
  /** 该难度历史最快用时（秒，0=未完成） */
  bestTime: number
  difficulty: MineDifficulty
}

/** 完成得分：用时越短分越高（1000 分封顶） */
export const MINE_SCORE_BASE = 1000

export function mineScoreForTime(seconds: number): number {
  return Math.max(1, MINE_SCORE_BASE - seconds)
}

export const DEFAULT_MINE_CONFIG: MineConfig = {
  difficulty: 'beginner',
}

/**
 * 华容道（数字滑块 / 15-puzzle）类型定义
 */

/** 移动方向：指「数字」移动的方向（空格反向移动） */
export type KlotskiDirection = 'up' | 'down' | 'left' | 'right'

/** 难度：决定随机打乱步数 */
export type KlotskiDifficulty = 'easy' | 'normal' | 'hard'

/** 棋盘尺寸 N×N（N²-1 个数字 + 1 个空格） */
export const SIZE_OPTIONS = [3, 4, 5] as const

export const DIFFICULTY_LABELS: Record<KlotskiDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

/**
 * 打乱步数表：尺寸 × 难度。
 * 保证可解（从解状态做随机合法移动，永不生成无解局面）。
 */
export const SHUFFLE_STEPS: Record<number, Record<KlotskiDifficulty, number>> = {
  3: { easy: 20, normal: 40, hard: 80 },
  4: { easy: 40, normal: 80, hard: 160 },
  5: { easy: 60, normal: 120, hard: 240 },
}

export interface KlotskiConfig {
  /** 棋盘尺寸 N×N */
  size: number
  /** 难度（打乱强度） */
  difficulty: KlotskiDifficulty
}

export interface KlotskiState {
  /** 一维棋盘：index = row*size + col，0=空格，其余为数字 1..N²-1 */
  board: number[]
  size: number
  /** 本局步数 */
  moves: number
  /** 开局时间戳（用时统计） */
  startTime: number
  /** 该尺寸+难度历史最少步数（0=尚未完成过） */
  bestMoves: number
  /** 是否已解出 */
  won: boolean
  /** 已解出即视为结束 */
  over: boolean
  difficulty: KlotskiDifficulty
}

/** 通关得分：步数越少分越高（1000 分封顶，步数 ≥ 1000 保底 1 分） */
export const SCORE_BASE = 1000

export function scoreForMoves(moves: number): number {
  return Math.max(1, SCORE_BASE - moves)
}

const SIZE_RANGE: [number, number] = [
  Math.min(...SIZE_OPTIONS),
  Math.max(...SIZE_OPTIONS),
]

export function clampSize(size: number): number {
  const [min, max] = SIZE_RANGE
  const v = Math.floor(size) || min
  return Math.max(min, Math.min(max, v))
}

export const DEFAULT_CONFIG: KlotskiConfig = {
  size: 4,
  difficulty: 'normal',
}

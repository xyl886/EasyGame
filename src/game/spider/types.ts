/**
 * 蜘蛛纸牌类型定义
 */

/** 难度：花色数（one=1 花色 / two=2 / four=4） */
export type SpiderDifficulty = 'one' | 'two' | 'four'

export const DIFFICULTY_LABELS: Record<SpiderDifficulty, string> = {
  one: '单花色',
  two: '双花色',
  four: '四花色',
}

/** 各难度使用的花色集合（0=♠ 1=♥ 2=♦ 3=♣） */
export const SUITS_BY_DIFFICULTY: Record<SpiderDifficulty, number[]> = {
  one: [0],
  two: [0, 1],
  four: [0, 1, 2, 3],
}

export interface SpiderConfig {
  difficulty: SpiderDifficulty
}

/** 牌：rank 1=A ... 13=K；suit 0=♠ 1=♥ 2=♦ 3=♣ */
export interface Card {
  rank: number
  suit: number
}

export type SpiderStatus = 'ready' | 'playing' | 'won'

export interface SpiderState {
  /** 10 列牌堆（每列末尾为最上层/正面朝上） */
  columns: Card[][]
  /** 剩余牌堆（背面朝下） */
  stock: Card[]
  /** 已完成序列数（8 组获胜） */
  completed: number
  /** 移动次数（含发牌） */
  moves: number
  /** 当前得分 */
  score: number
  /** 选中：{ col, count } 从列顶向下 count 张 */
  selected: { col: number; count: number } | null
  status: SpiderStatus
  startTime: number
  /** 该难度历史最高分 */
  bestScore: number
  difficulty: SpiderDifficulty
}

/** 经典计分：起始 500，每次操作 -1，完成一组 +100 */
export const SPIDER_SCORE_BASE = 500
export const SPIDER_COMPLETE_BONUS = 100

export function spiderScore(moves: number, completed: number): number {
  return SPIDER_SCORE_BASE - moves + SPIDER_COMPLETE_BONUS * completed
}

/** 完成组数目标（两副牌 = 8 组） */
export const SPIDER_TOTAL_GROUPS = 8

export const DEFAULT_SPIDER_CONFIG: SpiderConfig = {
  difficulty: 'one',
}

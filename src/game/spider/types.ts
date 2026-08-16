/**
 * 蜘蛛纸牌类型定义（参考 zh.spidersolitaire.cn 的难度体系）
 */

/** 洗牌方式（难度细分） */
export type SpiderMode = 'easy' | 'normal' | 'hard' | 'random'

export const MODE_LABELS: Record<SpiderMode, string> = {
  easy: '简单',
  normal: '一般',
  hard: '困难',
  random: '随机',
}

/** 可选难度组合：单色 4 档 / 双色 3 档 / 四色 2 档 */
export const DIFFICULTY_OPTIONS: Array<{ suits: 1 | 2 | 4; mode: SpiderMode; label: string }> = [
  { suits: 1, mode: 'easy', label: '单色·简单' },
  { suits: 1, mode: 'normal', label: '单色·一般' },
  { suits: 1, mode: 'hard', label: '单色·困难' },
  { suits: 1, mode: 'random', label: '单色·随机' },
  { suits: 2, mode: 'normal', label: '双色·一般' },
  { suits: 2, mode: 'hard', label: '双色·困难' },
  { suits: 2, mode: 'random', label: '双色·随机' },
  { suits: 4, mode: 'hard', label: '四色·困难' },
  { suits: 4, mode: 'random', label: '四色·随机' },
]

export function difficultyId(cfg: SpiderConfig): string {
  return `${cfg.suits}-${cfg.mode}`
}

/** 洗牌强度：简单档弱洗牌（保留部分顺序 → 更多可移动串），其余完全洗牌 */
export function shuffleStrength(mode: SpiderMode): number {
  return mode === 'easy' ? 0.35 : 1
}

export interface SpiderConfig {
  suits: 1 | 2 | 4
  mode: SpiderMode
}

/** 牌：rank 1=A ... 13=K；suit 0=♠ 1=♥ 2=♦ 3=♣ */
export interface Card {
  rank: number
  suit: number
}

export type SpiderStatus = 'ready' | 'playing' | 'won'

export interface SpiderState {
  columns: Card[][]
  stock: Card[]
  completed: number
  moves: number
  score: number
  selected: { col: number; count: number } | null
  status: SpiderStatus
  startTime: number
  bestScore: number
  suits: 1 | 2 | 4
  mode: SpiderMode
}

/** 发牌结果 */
export type DealResult = 'ok' | 'empty-col' | 'insufficient' | 'done'

/** 经典计分：起始 500，每次操作 -1，完成一组 +100 */
export const SPIDER_SCORE_BASE = 500
export const SPIDER_COMPLETE_BONUS = 100

export function spiderScore(moves: number, completed: number): number {
  return SPIDER_SCORE_BASE - moves + SPIDER_COMPLETE_BONUS * completed
}

/** 完成组数目标（两副牌 = 8 组） */
export const SPIDER_TOTAL_GROUPS = 8

export const DEFAULT_SPIDER_CONFIG: SpiderConfig = {
  suits: 1,
  mode: 'easy',
}

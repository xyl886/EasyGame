/**
 * 消消乐类型定义
 *
 * 规则：交换相邻两个图案，若横向或纵向出现 3 个及以上相同图案则消除，
 * 上方图案下落补充、新图案从顶部刷新，可能引发连锁（连击加分）。
 * 在有限步数内达到目标分数即胜利；步数耗尽仍未达标则失败。
 */

export type EliminateDifficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY_LABELS: Record<EliminateDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

/** 每档难度：棋盘尺寸（纵向高>宽，接近 16:9）、颜色种类、目标分数、步数预算 */
export interface EliminatePreset {
  rows: number
  cols: number
  colorCount: number
  targetScore: number
  moves: number
}

/**
 * 每档难度：棋盘尺寸（纵向高>宽）、颜色种类、目标分数、步数预算。
 * 目标分按"每步最优消除"实测基准校准（简单≈休闲、普通≈标准、困难≈挑战）。
 */
export const ELIMINATE_PRESETS: Record<EliminateDifficulty, EliminatePreset> = {
  // 纵向棋盘（行多列少，接近 16:9），充分利用页面高度、图案更大
  easy: { rows: 9, cols: 5, colorCount: 5, targetScore: 2000, moves: 30 },
  normal: { rows: 12, cols: 7, colorCount: 6, targetScore: 3200, moves: 40 },
  hard: { rows: 14, cols: 8, colorCount: 6, targetScore: 4600, moves: 45 },
}

/** 图案主题 */
export type EliminateTheme = 'gem' | 'candy' | 'fruit'

export const THEME_LABELS: Record<EliminateTheme, string> = {
  gem: '宝石',
  candy: '糖果',
  fruit: '水果',
}

/** 各主题的图案池（下标 0 对应颜色 id 1，需 ≥ 最大 colorCount） */
export const ELIMINATE_POOL: Record<EliminateTheme, string[]> = {
  gem: ['🔵', '🟢', '🔴', '🟡', '🟣', '🟠'],
  candy: ['🍬', '🍭', '🍫', '🍩', '🍪', '🧁'],
  fruit: ['🍎', '🍌', '🍇', '🍊', '🍓', '🍍'],
}

export interface EliminateConfig {
  difficulty: EliminateDifficulty
  theme: EliminateTheme
  /** 关卡（1=基础，≥2 递增难度）；不传时从存储读取进度 */
  level?: number
}

/** 一次点击的移动表示（选格 / 交换） */
export interface EliminateMove {
  r: number
  c: number
}

export type EliminateStatus = 'ready' | 'playing' | 'won' | 'lost'

export interface EliminateState {
  rows: number
  cols: number
  /** 棋盘二维数组：0=空（下落过程瞬时态），>0=图案 id */
  grid: number[][]
  /** 当前选中的第一格 */
  selected: { r: number; c: number } | null
  /** 提示高亮的两格 */
  hint: { r1: number; c1: number; r2: number; c2: number } | null
  score: number
  bestScore: number
  /** 剩余步数 */
  movesLeft: number
  /** 累计消除的图案组数（用于展示） */
  cleared: number
  /** 最大连击（含 1） */
  maxCombo: number
  /**
   * 最近一次消除动画：发生连锁时记录各次消除的坐标格子，
   * 供视图层按序播放（此处仅存最近一次爆发，供状态展示）
   */
  star: number
  targetScore: number
  startTime: number
  status: EliminateStatus
  difficulty: EliminateDifficulty
  theme: EliminateTheme
  /** 当前关卡（1 起） */
  level: number
  /** 剩余撤销次数 */
  undoLeft: number
}

/** 单个 3 连消除的基础分 */
export const ELIMINATE_SCORE_3 = 30
export const ELIMINATE_SCORE_4 = 60
export const ELIMINATE_SCORE_5 = 100

/** 消除 n 连的基础分（成组的长度映射） */
export function eliminateScoreForMatch(len: number): number {
  if (len >= 5) return ELIMINATE_SCORE_5
  if (len >= 4) return ELIMINATE_SCORE_4
  return ELIMINATE_SCORE_3
}

/** 连击倍率：第 k 次连锁（k≥1）乘 k 倍 */
export function comboMultiplier(combo: number): number {
  return combo
}

export const BEST_KEY_PREFIX = 'easygame-eliminate-best'

export const DEFAULT_ELIMINATE_CONFIG: EliminateConfig = {
  difficulty: 'normal',
  theme: 'gem',
}

// ================ 关卡系统 ================

export const LEVEL_PROGRESS_KEY = 'easygame-eliminate-level-progress'

export interface EliminateProgress {
  currentLevel: number
  maxUnlocked: number
}

/**
 * 根据关卡和难度推导关卡参数。
 * level=1 返回基础 preset；level≥2 目标分 +12%/级，步数 -3%/级（下限 70%）。
 * 棋盘尺寸/颜色数不变（避免存档/布局断裂）。
 */
export function deriveLevelParams(level: number, difficulty: EliminateDifficulty): EliminatePreset {
  const base = ELIMINATE_PRESETS[difficulty] ?? ELIMINATE_PRESETS.normal
  if (level <= 1) return { ...base }
  const factor = 1 + 0.12 * (level - 1)
  const targetScore = Math.round(base.targetScore * factor)
  const moves = Math.max(Math.round(base.moves * (1 - 0.03 * (level - 1))), Math.round(base.moves * 0.7))
  return { ...base, targetScore, moves }
}

// ================ 特殊消除 ================

/** 炸弹：消除时引爆周围 3×3 范围 */
export const SPECIAL_BOMB = -1
/** 彩虹：与相邻任意图案交换，消除该颜色全部 */
export const SPECIAL_RAINBOW = -2

export function isSpecial(v: number): boolean {
  return v === SPECIAL_BOMB || v === SPECIAL_RAINBOW
}
export function isBomb(v: number): boolean {
  return v === SPECIAL_BOMB
}
export function isRainbow(v: number): boolean {
  return v === SPECIAL_RAINBOW
}
export function specialType(v: number): 'bomb' | 'rainbow' | null {
  if (v === SPECIAL_BOMB) return 'bomb'
  if (v === SPECIAL_RAINBOW) return 'rainbow'
  return null
}

export const SPECIAL_EMOJI: Record<'bomb' | 'rainbow', string> = {
  bomb: '💣',
  rainbow: '🌈',
}

/** 炸弹/彩虹直接触发时，每清除一个图案的得分 */
export const SPECIAL_CLEAR_SCORE = 12

// ================ 撤销 ================

export const MAX_UNDO = 3

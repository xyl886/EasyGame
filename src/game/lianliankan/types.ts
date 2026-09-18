/**
 * 连连看类型定义
 *
 * 规则：棋盘由若干图案组成，每次点击两张相同的图案，若两者之间能用
 * 最多拐两次弯的路径相连（路径上无其它图案阻挡，棋盘外围视为空白可绕），
 * 则消除这对图案。清空全部棋盘即胜利。
 */

export type LinkDifficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY_LABELS: Record<LinkDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

/** 每档难度的棋盘尺寸（行×列）与图案种类数 */
export interface LinkPreset {
  rows: number
  cols: number
  symbolCount: number
  /** 倒计时秒数 */
  timeLimit: number
}

/**
 * 倒计时按"休闲玩家 3~6 秒找一对"的节奏校准：
 * easy 30 对 / 180s、normal 42 对 / 150s、hard 56 对 / 120s（困难档本身就该紧张）。
 */
export const LINK_PRESETS: Record<LinkDifficulty, LinkPreset> = {
  // 纵向棋盘（高>宽，接近 16:9）：行多列少，充分利用页面高度、图案更大
  easy: { rows: 10, cols: 6, symbolCount: 10, timeLimit: 180 },
  normal: { rows: 12, cols: 7, symbolCount: 14, timeLimit: 150 },
  hard: { rows: 14, cols: 8, symbolCount: 18, timeLimit: 120 },
}

/** 图案主题 */
export type LinkTheme = 'fruit' | 'animal' | 'emoji'

export const THEME_LABELS: Record<LinkTheme, string> = {
  fruit: '水果',
  animal: '动物',
  emoji: '表情',
}

/** 各主题的图案池（需足够覆盖最高难度的 symbolCount=24，且两两成对） */
export const SYMBOL_POOL: Record<LinkTheme, string[]> = {
  fruit: [
    '🍎', '🍌', '🍇', '🍉', '🍊', '🍓', '🍑', '🍒',
    '🍍', '🥝', '🍋', '🫐', '🥥', '🍈', '🥭', '🍐',
    '🍏', '🍆', '🌽', '🥕', '🍠', '🥦', '🍅', '🥒',
  ],
  animal: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐤', '🦉', '🐺', '🦝', '🐙', '🦄',
  ],
  emoji: [
    '😀', '😄', '😁', '😂', '🤣', '😊', '😍', '😘',
    '😎', '🤩', '🥳', '😜', '🤪', '😇', '🥰', '😋',
    '🤔', '🤗', '🙃', '😴', '🥺', '😱', '🤯', '😡',
  ],
}

export interface LinkConfig {
  difficulty: LinkDifficulty
  theme: LinkTheme
  /** 关卡（1=基础，≥2 递增难度）；不传时从存储读取进度 */
  level?: number
}

/** 点击一次的移动表示（包含在棋盘上选格） */
export interface LinkMove {
  r: number
  c: number
}

export type LinkStatus = 'ready' | 'playing' | 'won' | 'lost'

export interface LinkState {
  rows: number
  cols: number
  /** 棋盘二维数组：0=空，>0=普通图案 id，≥1000=金卡图案（1000+id） */
  grid: number[][]
  /** 当前选中的格子 {r,c}，无则为 null */
  selected: { r: number; c: number } | null
  /** 提示高亮的格子（{r1,c1,r2,c2} 或 null） */
  hint: { r1: number; c1: number; r2: number; c2: number } | null
  /** 已消除的图案对数 */
  pairs: number
  /** 消除所需步数（点击次数） */
  moves: number
  score: number
  bestScore: number
  startTime: number
  status: LinkStatus
  difficulty: LinkDifficulty
  theme: LinkTheme
  /** 倒计时总秒数 */
  timeLimit: number
  /** 剩余秒数 */
  timeLeft: number
  /** 当前关卡（1 起） */
  level: number
  /** 剩余撤销次数 */
  undoLeft: number
}

/** 每次消除得分 = 基础 + 拐弯越多得分越高 + 速度奖励由上层按用时决定 */
export const LINK_SCORE_BASE = 10
export const LINK_SCORE_TURN: Record<number, number> = { 0: 10, 1: 20, 2: 30 }

export function linkScoreForPair(turns: number): number {
  return LINK_SCORE_BASE + (LINK_SCORE_TURN[turns] ?? 15)
}

/** 全部消除耗时冠军分（由上层按时间折算，此处提供封顶分换算） */
export const LINK_TIME_SCORE_BASE = 500

export function linkTimeBonus(seconds: number): number {
  if (seconds <= 0) return 0
  // 用时越短奖励越高，封顶 300
  return Math.max(0, 300 - seconds * 3)
}

export const RECORD_TIME_KEY_PREFIX = 'easygame-lianliankan-best'

export const DEFAULT_LINK_CONFIG: LinkConfig = {
  difficulty: 'normal',
  theme: 'fruit',
}

// ================ 关卡系统 ================

export const LEVEL_PROGRESS_KEY = 'easygame-lianliankan-level-progress'

export interface LinkProgress {
  currentLevel: number
  maxUnlocked: number
}

/**
 * 根据关卡和难度推导关卡参数。
 * level=1 返回基础 preset；level≥2 时间 -5s/级（下限 60s），symbolCount 每 3 级 +1（上限 20）。
 * 棋盘尺寸不变。
 */
export function deriveLinkLevelParams(level: number, difficulty: LinkDifficulty): LinkPreset {
  const base = LINK_PRESETS[difficulty] ?? LINK_PRESETS.normal
  if (level <= 1) return { ...base }
  const timeLimit = Math.max(base.timeLimit - 5 * (level - 1), 60)
  const symbolCount = Math.min(base.symbolCount + Math.floor((level - 1) / 3), 20)
  return { ...base, timeLimit, symbolCount }
}

// ================ 特殊图案（金卡） ================

/** 金卡标记：value = 1000 + symbolId */
export const LINK_SPECIAL_FLAG = 1000

/** 取图案基础 id（去除金卡标记） */
export function baseSymbol(v: number): number {
  return v >= LINK_SPECIAL_FLAG ? v - LINK_SPECIAL_FLAG : v
}

/** 是否金卡 */
export function isSpecialTile(v: number): boolean {
  return v >= LINK_SPECIAL_FLAG
}

/** 金卡对额外加分 */
export const LINK_SPECIAL_BONUS = 50

// ================ 倒计时 ================

/** 胜利时剩余每秒奖励分 */
export const LINK_TIME_BONUS_PER_SEC = 10

// ================ 撤销 ================

export const MAX_UNDO = 3

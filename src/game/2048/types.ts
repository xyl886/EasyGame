/**
 * 2048 游戏类型定义
 */
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Tile {
  id: number
  value: number
  row: number
  col: number
  isNew?: boolean
  isMerged?: boolean
  mergedFrom?: [number, number] // 来源 tile id 列表
}

export interface Game2048State {
  grid: (Tile | null)[][]
  score: number
  bestScore: number
  won: boolean
  over: boolean
  keepPlaying: boolean
  size: number
}

export type Grid = (Tile | null)[][]

/** 难度档位：控制生成 2 的概率（越高越简单） */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare'

/** 皮肤：classic 经典数字，cake 小蛋糕 emoji 皮肤（2→🧁 4→🍪 8→🍰 ...） */
export type Skin = 'classic' | 'cake'

export interface Game2048Config {
  /** 棋盘尺寸 NxN（4~7） */
  size: number
  /** 胜利目标值（达到即获胜，0 表示无尽模式） */
  winValue: number
  /** 初始方块数量 */
  initialTiles: number
  /** 难度：控制新方块生成 2 的概率 */
  difficulty: Difficulty
  /** 皮肤：classic 经典数字 / cake 小蛋糕 emoji */
  skin: Skin
}

export const SKIN_OPTIONS: Array<{ value: Skin; label: string; hint: string }> = [
  { value: 'classic', label: '🧮 经典数字', hint: '显示方块数值 2/4/8…' },
  { value: 'cake', label: '🧁 小蛋糕版', hint: '数字替换为蛋糕/点心 emoji' },
]

/** cake 皮肤映射：数值 → emoji（8192 以上用 ✨ 兜底） */
export const CAKE_EMOJI: Record<number, string> = {
  2: '🧁',
  4: '🍪',
  8: '🍰',
  16: '🍩',
  32: '🍮',
  64: '🥧',
  128: '🎂',
  256: '🍫',
  512: '🍬',
  1024: '🍭',
  2048: '🎉',
  4096: '👑',
  8192: '✨',
}
/** 超出映射表时用此兜底 */
export const CAKE_OVERFLOW_EMOJI = '✨'

export const DIFFICULTY_TWO_RATIO: Record<Difficulty, number> = {
  easy: 0.95,       // 95% 生成 2
  normal: 0.9,      // 90% 生成 2（经典）
  hard: 0.75,       // 75% 生成 2
  nightmare: 0.5,  // 50% 生成 2 / 50% 生成 4
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  nightmare: '噩梦',
}

export const DEFAULT_CONFIG: Game2048Config = {
  size: 4,
  winValue: 2048,
  initialTiles: 2,
  difficulty: 'normal',
  skin: 'classic',
}

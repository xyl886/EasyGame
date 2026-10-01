/**
 * 1024 消消乐类型定义
 *
 * 规则：拖拽/点击把上下左右相邻且数字相同的格子连成一线（不限长度，最少 2 格），
 * 松手后连上的格子全部消失，在原位生成一个数字 = 连线求和（2+2+2=6）。
 * 空位由上方数字下落填补、顶部自动补新（棋盘始终满格）；新数字取值随棋盘最大数渐进解锁。
 * 合并出的新数字若与相邻同数自动连锁合并（倍率随连锁深度递增）。
 * 在每关步数内合成目标数字（8→16→…→1024）即通关。
 */

/** 连线操作的类型：引擎暴露给视图的路径 = 拖拽经过的格子序列 */
export interface ChainCell {
  r: number
  c: number
}

/** 视图提交一次连线操作的表示：路径 + 起点（供视图对齐动画） */
export interface Merge1024Move {
  /** 连线经过的格子（含首尾），顺序为拖拽顺序 */
  path: ChainCell[]
}

export type Merge1024Difficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY_LABELS: Record<Merge1024Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

/** 每档难度：棋盘尺寸、每关步数、最终目标数字 */
export interface Merge1024Preset {
  rows: number
  cols: number
  moves: number
  target: number
}

export const MERGE1024_PRESETS: Record<Merge1024Difficulty, Merge1024Preset> = {
  easy: { rows: 6, cols: 6, moves: 26, target: 512 },
  normal: { rows: 7, cols: 7, moves: 30, target: 1024 },
  hard: { rows: 8, cols: 8, moves: 32, target: 2048 },
}

/** 皮肤：classic 经典 2048 数字配色 / candy 糖果渐变色 */
export type Merge1024Theme = 'classic' | 'candy'

export const THEME_LABELS: Record<Merge1024Theme, string> = {
  classic: '经典数字',
  candy: '糖果渐变',
}

export interface Merge1024Config {
  difficulty: Merge1024Difficulty
  theme: Merge1024Theme
  /** 关卡（1 起）；不传时从存储读取进度 */
  level?: number
}

export const DEFAULT_MERGE1024_CONFIG: Merge1024Config = {
  difficulty: 'normal',
  theme: 'classic',
}

export type Merge1024Status = 'ready' | 'playing' | 'won' | 'lost'

export interface Merge1024State {
  rows: number
  cols: number
  /** 棋盘二维数组：0=空（下落过程瞬时态），>0=数字 */
  grid: number[][]
  /** 当前正在连线的路径（拖拽中/未提交），null=无 */
  chainPath: ChainCell[] | null
  /** 提示高亮的路径 */
  hintPath: ChainCell[] | null
  score: number
  bestScore: number
  /** 当前关目标数字 */
  target: number
  /** 棋盘当前最大数字 */
  maxTile: number
  /** 剩余步数 */
  movesLeft: number
  /** 最大连击（含 1） */
  maxCombo: number
  startTime: number
  status: Merge1024Status
  difficulty: Merge1024Difficulty
  theme: Merge1024Theme
  /** 当前关卡（1 起） */
  level: number
  /** 剩余撤销次数 */
  undoLeft: number
}

// ================ 计分 ================

/** 连线长度 → 倍率（连 N 格，得分 = 求和 × 倍率，封顶 5 格倍率） */
export function chainMultiplier(len: number): number {
  if (len >= 6) return 5
  if (len >= 5) return 4
  if (len >= 4) return 3
  if (len >= 3) return 2
  return 1
}

/** 连锁倍率：第 k 次连锁（k≥1）乘 k 倍 */
export function comboMultiplier(combo: number): number {
  return combo
}

export const MAX_UNDO = 3

export const BEST_KEY_PREFIX = 'easygame-merge1024-best'

export const LEVEL_PROGRESS_KEY = 'easygame-merge1024-level-progress'

export interface Merge1024Progress {
  currentLevel: number
  maxUnlocked: number
}

/**
 * 每关目标数字：level=1 从 16 起，之后每关翻倍，直至难度终局目标。
 * 普通档：16 → 32 → 64 → 128 → 256 → 512 → 1024（第 7 关）。
 */
export function levelTarget(level: number, preset: Merge1024Preset): number {
  const start = 16
  let t = start
  for (let i = 1; i < level; i++) t *= 2
  return Math.min(t, preset.target)
}

/**
 * 开局棋盘：按难度铺设低值铺底 + 少量中值启动跳板（总和 = rows×cols）。
 * maxAllowed 限制最大铺底值（默认 32）；实际取 target/2，确保开局不含 ≥ 目标的数字，
 * 必须靠合成才能达成目标——否则第 1 关（目标 16）会因开局即含 16/32 而「连一步就胜」。
 */
export function initialBoard(rows: number, cols: number, maxAllowed = 32): number[] {
  const n = rows * cols
  // 值阶梯：2,4,8,…,maxAllowed（均为 2 的幂）
  const values: number[] = []
  for (let v = 2; v <= maxAllowed; v *= 2) values.push(v)
  if (values.length === 0) values.push(2)
  // 低值高频、高值稀疏：权重随阶梯序号递减
  const rawWeights = values.map((_, i) => Math.pow(values.length - i, 1.3))
  const sumW = rawWeights.reduce((a, b) => a + b, 0)
  const dist: number[] = []
  let assigned = 0
  for (let i = 0; i < values.length; i++) {
    let cnt = Math.round((rawWeights[i] / sumW) * n)
    if (i === 0) cnt = Math.max(8, cnt) // 至少 8 个 2，保证开局有可行连线
    for (let k = 0; k < cnt && assigned < n; k++) {
      dist.push(values[i])
      assigned++
    }
  }
  // 兜底用最大允许值补齐
  while (assigned < n) {
    dist.push(values[values.length - 1])
    assigned++
  }
  return dist
}

// ================ 渐进式补充池 ================

/**
 * 补充池：新数字取值随棋盘最大数解锁，低值始终高权重。
 * 依据棋盘最大数返回取值区间；期望值 ≈ 当前最大数的 1/4~1/3，保证成长但不失控。
 */
export function spawnPoolForMax(maxTile: number): number[] {
  if (maxTile >= 512) return [2, 4, 8, 16, 32, 64]
  if (maxTile >= 128) return [2, 4, 8, 16, 32]
  if (maxTile >= 32) return [2, 4, 8, 16]
  if (maxTile >= 8) return [2, 4, 8]
  return [2, 4]
}

export function spawnWeightsForMax(maxTile: number): number[] {
  if (maxTile >= 512) return [30, 26, 20, 12, 8, 4]
  if (maxTile >= 128) return [32, 28, 20, 12, 8]
  if (maxTile >= 32) return [38, 32, 20, 10]
  if (maxTile >= 8) return [50, 35, 15]
  return [70, 30]
}

// ================ 数字配色（classic：2048 经典色阶） ================

export interface TileColor {
  bg: string
  text: string
}

export const CLASSIC_COLORS: Record<number, TileColor> = {
  2: { bg: '#eee4da', text: '#776e65' },
  4: { bg: '#ede0c8', text: '#776e65' },
  8: { bg: '#f2b179', text: '#f9f6f2' },
  16: { bg: '#f59563', text: '#f9f6f2' },
  32: { bg: '#f67c5f', text: '#f9f6f2' },
  64: { bg: '#f65e3b', text: '#f9f6f2' },
  128: { bg: '#edcf72', text: '#f9f6f2' },
  256: { bg: '#edcc61', text: '#f9f6f2' },
  512: { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
}

/** 超出映射表（4096+）的兜底配色 */
export const CLASSIC_OVERFLOW: TileColor = { bg: '#3c3a32', text: '#f9f6f2' }

/** candy 皮肤：同一色相不同明度的渐变色（文字统一深色） */
export const CANDY_COLORS: Record<number, TileColor> = {
  2: { bg: '#fef3c7', text: '#92400e' },
  4: { bg: '#fde68a', text: '#92400e' },
  8: { bg: '#fcd34d', text: '#7c2d12' },
  16: { bg: '#fdba74', text: '#7c2d12' },
  32: { bg: '#fb923c', text: '#7c2d12' },
  64: { bg: '#f97316', text: '#fff7ed' },
  128: { bg: '#fb7185', text: '#fff7ed' },
  256: { bg: '#f43f5e', text: '#fff7ed' },
  512: { bg: '#e11d48', text: '#fff7ed' },
  1024: { bg: '#be185d', text: '#fff7ed' },
  2048: { bg: '#9d174d', text: '#fff7ed' },
}

export const CANDY_OVERFLOW: TileColor = { bg: '#581c87', text: '#fff7ed' }

export function tileColor(v: number, theme: Merge1024Theme): TileColor {
  const map = theme === 'candy' ? CANDY_COLORS : CLASSIC_COLORS
  return map[v] ?? (theme === 'candy' ? CANDY_OVERFLOW : CLASSIC_OVERFLOW)
}

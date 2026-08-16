/**
 * 俄罗斯方块（Tetris）游戏类型定义
 * 经典 10×20 棋盘，7 种标准 Tetromino，SRS 风格旋转 + Bag-7 随机器。
 */

/** 操作方向（移动/旋转） */
export type Direction = 'left' | 'right' | 'down'
/** 旋转方向 */
export type Rotation = 'cw' | 'ccw'

/** 速度档位：决定初始 tick 间隔（毫秒），随等级还会进一步加速 */
export type SpeedTier = 'slow' | 'medium' | 'fast'

/** 棋盘坐标（左上角为 (0,0)，x 向右增，y 向下增） */
export interface Point {
  x: number
  y: number
}

/** 当前方块状态：类型 + 旋转号 + 位置（左上角） */
export interface ActivePiece {
  /** 类型 id 1~7 */
  type: number
  /** 旋转号 0~3 */
  rotation: number
  /** 左上角 x（列） */
  x: number
  /** 左上角 y（行） */
  y: number
}

export interface TetrisState {
  /** 棋盘：0=空，1~7=已锁定的方块类型 id（用于着色） */
  grid: number[][]
  /** 当前方块 */
  current: ActivePiece | null
  /** 接下来要出现的方块类型队列（按顺序消费） */
  next: number[]
  /** 暂存槽（hold）：未启用 hold 时为 null */
  hold: number | null
  /** 当前方块是否还能 hold（每个方块只能 hold 一次） */
  canHold: boolean
  /** 鬼影方块（ghost piece）的左上角 y（用于预览落点），x/current 相同；不存在时为 -1 */
  ghostY: number
  score: number
  bestScore: number
  /** 等级：每消除 10 行 +1，影响 tick 间隔 */
  level: number
  /** 总消除行数 */
  lines: number
  over: boolean
  won: boolean
  paused: boolean
  /** 当前 tick 间隔（毫秒），随 level 减小 */
  tickInterval: number
  /** 操作步数（每个 move 计 1，用于排行榜） */
  moveCount: number
  /** 游戏开始时间戳（用于排行榜时长统计） */
  startTime: number
  /** 棋盘宽（列数），固定 10 */
  width: number
  /** 棋盘高（行数），固定 20 */
  height: number
  /** 配置项快照 */
  speed: SpeedTier
  targetLines: number
  hardDrop: boolean
  ghostPiece: boolean
  holdPiece: boolean
  previewCount: number
}

export interface TetrisConfig {
  /** 初始速度档位 */
  speed: SpeedTier
  /** 胜利目标行数（消除这么多行即获胜，0=无尽） */
  targetLines: number
  /** 是否启用硬降（按下立即落底，否则只软降 1 格） */
  hardDrop: boolean
  /** 是否显示鬼影落点预览 */
  ghostPiece: boolean
  /** 是否启用 hold 暂存槽 */
  holdPiece: boolean
  /** 预览下一个方块的数量（1/3/5） */
  previewCount: number
}

/** 速度档位 → 初始 tick 间隔（ms） */
export const SPEED_INTERVAL: Record<SpeedTier, number> = {
  slow: 900,
  medium: 600,
  fast: 400,
}

/** 速度档位标签 */
export const SPEED_LABELS: Record<SpeedTier, string> = {
  slow: '慢速',
  medium: '中速',
  fast: '快速',
}

/** 最低 tick 间隔（ms），避免到后期完全无法操作 */
export const MIN_TICK_INTERVAL = 80
/** 每升一级减少的 tick 间隔（ms） */
export const SPEEDUP_PER_LEVEL = 70
/** 每多少行升一级 */
export const LINES_PER_LEVEL = 10

/** 7 种 Tetromino 的旋转状态表：[piece_id][rotation] = Array<[x, y]> 相对左上角偏移 */
export const TETROMINOES: Record<number, { name: string; color: string; rotations: [number, number][][] }> = {
  1: {
    name: 'I',
    color: 'cyan',
    rotations: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
  },
  2: {
    name: 'O',
    color: 'yellow',
    rotations: [
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
    ],
  },
  3: {
    name: 'T',
    color: 'purple',
    rotations: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  4: {
    name: 'S',
    color: 'green',
    rotations: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  5: {
    name: 'Z',
    color: 'red',
    rotations: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
  },
  6: {
    name: 'J',
    color: 'blue',
    rotations: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
  },
  7: {
    name: 'L',
    color: 'orange',
    rotations: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  },
}

/** 消行计分表（单/双/三/四行，乘以 level） */
export const LINE_SCORES = [0, 100, 300, 500, 800]
/** 软降每格 +1 分，硬降每格 +2 分 */
export const SOFT_DROP_SCORE = 1
export const HARD_DROP_SCORE = 2

/** 棋盘尺寸（标准 Tetris） */
export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20

/** spawn 时方块的初始 x（让 4x4 bounding box 居中） */
export const SPAWN_X = 3
/** spawn 时方块的初始 y（让最上方一行露在棋盘顶部以上） */
export const SPAWN_Y = -1

export const SPEED_OPTIONS: Array<{ value: SpeedTier; label: string }> = [
  { value: 'slow', label: '慢速' },
  { value: 'medium', label: '中速' },
  { value: 'fast', label: '快速' },
]

export const TARGET_LINES_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: '∞ 无尽' },
  { value: 10, label: '10 · 速通' },
  { value: 20, label: '20 · 入门' },
  { value: 40, label: '40 · 经典' },
  { value: 150, label: '150 · 大师' },
]

export const PREVIEW_COUNT_OPTIONS = [1, 3, 5]

const validSpeeds: SpeedTier[] = ['slow', 'medium', 'fast']

/** 守护预览数量边界 */
export function clampPreviewCount(n: number): number {
  if (!PREVIEW_COUNT_OPTIONS.includes(n)) return 3
  return n
}

/** 守护速度档位 */
export function clampSpeed(s: string): SpeedTier {
  return validSpeeds.includes(s as SpeedTier) ? (s as SpeedTier) : 'medium'
}

/** 守护目标行数 */
export function clampTargetLines(n: number): number {
  const valid = TARGET_LINES_OPTIONS.map((o) => o.value)
  return valid.includes(n) ? n : 0
}

export const DEFAULT_CONFIG: TetrisConfig = {
  speed: 'medium',
  targetLines: 0,
  hardDrop: true,
  ghostPiece: true,
  holdPiece: true,
  previewCount: 3,
}

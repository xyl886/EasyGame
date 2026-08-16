/**
 * 贪吃蛇游戏类型定义
 */

/** 方向：up 上 / down 下 / left 左 / right 右 */
export type Direction = 'up' | 'down' | 'left' | 'right'

/** 速度档位：决定初始 tick 间隔（毫秒） */
export type SpeedTier = 'slow' | 'medium' | 'fast'

/** 棋盘坐标（左上角为 (0,0)，x 向右增，y 向下增） */
export interface Point {
  x: number
  y: number
}

/** 食物 */
export interface Food {
  id: number
  pos: Point
  /** normal=+1 分，bonus=+5 分（10% 概率生成） */
  type: 'normal' | 'bonus'
}

/** 障碍物（静态） */
export interface Obstacle {
  id: number
  pos: Point
}

export interface SnakeState {
  /** 蛇身坐标数组，头部在 index 0 */
  snake: Point[]
  foods: Food[]
  obstacles: Obstacle[]
  /** 当前移动方向（已生效） */
  direction: Direction
  /** 下一帧将生效的方向（避免一帧内多次转向导致瞬间撞身） */
  nextDirection: Direction
  score: number
  bestScore: number
  over: boolean
  won: boolean
  /** 当前 tick 间隔（毫秒），随食物增加而加速 */
  tickInterval: number
  /** 棋盘尺寸 N×N */
  size: number
  /** 是否暂停 */
  paused: boolean
  /** 总步数（每个 tick 计 1，用于排行榜） */
  moveCount: number
  /** 游戏开始时间戳（用于排行榜时长统计） */
  startTime: number
  /** 配置项快照 */
  speed: SpeedTier
  wallThrough: boolean
  multiFood: boolean
  obstacleCount: number
  winLength: number
}

export interface SnakeConfig {
  /** 棋盘尺寸 N×N */
  size: number
  /** 速度档位 */
  speed: SpeedTier
  /** 是否允许穿墙（撞墙从对面出来） */
  wallThrough: boolean
  /** 是否多食物模式（同时 3 个食物） */
  multiFood: boolean
  /** 障碍物数量（0/4/8/16） */
  obstacleCount: number
  /** 胜利长度（蛇身达到此长度获胜，0=无尽） */
  winLength: number
}

/** 速度档位 → 初始 tick 间隔（ms） */
export const SPEED_INTERVAL: Record<SpeedTier, number> = {
  slow: 200,
  medium: 140,
  fast: 100,
}

/** 速度档位标签 */
export const SPEED_LABELS: Record<SpeedTier, string> = {
  slow: '慢速',
  medium: '中速',
  fast: '快速',
}

/** 每吃 1 个食物的加速量（ms） */
export const SPEEDUP_PER_FOOD = 3
/** 最低 tick 间隔（ms），避免过快无法操作 */
export const MIN_TICK_INTERVAL = 60
/** 多食物模式下的食物数量 */
export const MULTI_FOOD_COUNT = 3
/** bonus 食物出现概率 */
export const BONUS_FOOD_RATIO = 0.1
/** bonus 食物加分倍率 */
export const BONUS_SCORE = 5

export const SIZE_OPTIONS = [12, 16, 20, 24]
export const OBSTACLE_OPTIONS = [0, 4, 8, 16]
export const WIN_LENGTH_OPTIONS = [
  { value: 0, label: '∞ 无尽' },
  { value: 30, label: '30 · 速通' },
  { value: 50, label: '50 · 挑战' },
  { value: 80, label: '80 · 大师' },
]

export const SPEED_OPTIONS: Array<{ value: SpeedTier; label: string }> = [
  { value: 'slow', label: '慢速' },
  { value: 'medium', label: '中速' },
  { value: 'fast', label: '快速' },
]

const SIZE_RANGE: [number, number] = [Math.min(...SIZE_OPTIONS), Math.max(...SIZE_OPTIONS)]

/** 守护棋盘尺寸边界 */
export function clampSize(size: number): number {
  const [min, max] = SIZE_RANGE
  const v = Math.floor(size) || min
  return Math.max(min, Math.min(max, v))
}

export const DEFAULT_CONFIG: SnakeConfig = {
  size: 16,
  speed: 'medium',
  wallThrough: false,
  multiFood: false,
  obstacleCount: 0,
  winLength: 0,
}

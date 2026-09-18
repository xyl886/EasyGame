/**
 * 数字连连类型定义
 *
 * 规则：
 * - n×n 棋盘上放置 1..N（N = n²，4×4=16、5×5=25……）。
 * - 关键约束：**只能连相邻的数字**。② 必须落在 ① 周围 8 格（上下左右 + 斜线）之内，
 *   ③ 必须落在 ② 周围 8 格之内……整条链是一步一步挨着走的。
 *   生成器会保证棋盘一定存在这样一条相邻通路（否则关卡无解）。
 * - 空白格：并非所有数字一开始就显示。开局按**难度**显示一部分格子
 *   （简单约 70% / 普通约 50% / 困难约 30%，并各有保底数量），其余为空白，
 *   1..N 谁被显示完全随机。规则是"**连到哪就显示到哪**"：
 *   玩家连上哪个格子，那个格子就显示出来；但不会提前把下一个目标翻出来。
 * - 无尽模式：棋盘不再封顶（可一路超过 8×8），关卡无限递增；
 *   主动结束或失误超限才结算总分。
 * - 操作：按住下一个数拖动连线；连完即通关。可**撤回**（退一步）或**清空重连**。
 */

export type NumberChainDifficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY_LABELS: Record<NumberChainDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

/** 各难度的起始棋盘边长（1 关）；之后每关 +1 */
export const START_SIZE: Record<NumberChainDifficulty, number> = {
  easy: 4,
  normal: 5,
  hard: 6,
}

/** 经典模式的棋盘边长上限（8×8=64 个数字）；无尽模式不封顶 */
export const MAX_SIZE = 8

/** 无尽模式的棋盘边长上限（防御性上限，避免极端设备卡死） */
export const ENDLESS_MAX_SIZE = 16

/**
 * 第 level 关的棋盘边长。
 * endless=true 时不封顶（到 ENDLESS_MAX_SIZE 为止，仅作保护），否则封顶 MAX_SIZE。
 */
export function levelSize(level: number, difficulty: NumberChainDifficulty, endless = false): number {
  const start = START_SIZE[difficulty] ?? START_SIZE.normal
  const cap = endless ? ENDLESS_MAX_SIZE : MAX_SIZE
  return Math.min(start + (level - 1), cap)
}

/**
 * 各难度的**初始显示比例**（0..1）：开局有多大比例的格子直接显示数字。
 * 难度由"看得见多少"决定，而不是棋盘大小——棋盘大小只由关卡决定。
 * 简单档看得多、困难档看得少，剩下的都要靠玩家自己摸出来。
 */
export const INITIAL_REVEAL_RATIO: Record<NumberChainDifficulty, number> = {
  easy: 0.7,
  normal: 0.5,
  hard: 0.3,
}

/**
 * 各难度的**保底显示数量**：只在棋盘很大、光靠比例会显得线索太少时才兜底。
 * 小棋盘上比例本身已经够用（例如简单 4×4 的 70% = 11 个），不必再抬。
 * 目的是防止"16×16 只显示十几个"，而不是把三档难度拉平。
 */
export const MIN_REVEAL_COUNT: Record<NumberChainDifficulty, number> = {
  easy: 20,
  normal: 16,
  hard: 12,
}

/** 无论保底多高，至少要留这么多格是空白的，否则"隐藏"就失去意义 */
const MIN_BLANK_CELLS = 3

/**
 * 第 level 关开局显示多少个格子。
 * 取"保底数量"和"比例数量"的较大值，但**必须至少留 MIN_BLANK_CELLS 个空白格**，
 * 免得小棋盘被保底撑满、变成全部可见。
 */
export function revealCount(
  total: number,
  level: number,
  difficulty: NumberChainDifficulty,
  endless = false,
): number {
  const baseRatio = INITIAL_REVEAL_RATIO[difficulty] ?? INITIAL_REVEAL_RATIO.normal
  const floor = MIN_REVEAL_COUNT[difficulty] ?? MIN_REVEAL_COUNT.normal
  // 每关 -1.5%；无尽不封顶，经典最多降到基准的一半
  const decay = endless ? (level - 1) * 0.015 : Math.min((level - 1) * 0.015, baseRatio * 0.5)
  const ratio = Math.max(0.1, baseRatio - decay)
  const byRatio = Math.round(total * ratio)
  const upper = Math.max(1, total - MIN_BLANK_CELLS)
  return Math.max(2, Math.min(upper, Math.max(floor, byRatio)))
}

/** 通关标准用时：每个数字 1.5 秒（超出部分没有速度分） */
export function levelParSeconds(n: number): number {
  return n * 1.5
}

/**
 * 单关得分 = (基础 N×10 + 速度奖励) × 关卡系数，速度奖励按快于标准的秒数给分。
 * 无尽模式关卡系数增长更快，鼓励一直连下去。
 */
export function levelScore(n: number, elapsedSec: number, level: number, endless = false): number {
  const base = n * 10
  const speed = Math.max(0, Math.round((levelParSeconds(n) - elapsedSec) * 20))
  const mult = 1 + (endless ? 0.15 : 0.1) * (level - 1)
  return Math.max(0, Math.round((base + speed) * mult))
}

/** 格子坐标 */
export interface ChainPoint {
  r: number
  c: number
}

/** 两个格子是否相邻（含斜线，周围 8 格） */
export function isAdjacent(a: ChainPoint, b: ChainPoint): boolean {
  const dr = Math.abs(a.r - b.r)
  const dc = Math.abs(a.c - b.c)
  return dr <= 1 && dc <= 1 && (dr !== 0 || dc !== 0)
}

/** 无级/关卡结束时机的游戏状态 */
export type NumberChainStatus = 'playing' | 'won' | 'over'

/** 游戏模式：经典逐关（封顶） / 无尽（不封顶） */
export type NumberChainMode = 'classic' | 'endless'

export const MODE_LABELS: Record<NumberChainMode, string> = {
  classic: '经典闯关',
  endless: '无尽模式',
}

export interface NumberChainConfig {
  difficulty: NumberChainDifficulty
  /** 模式：classic 封顶 8×8；endless 棋盘无限递增 */
  mode?: NumberChainMode
  /** 起始关卡（不传则读存储进度） */
  level?: number
}

export interface NumberChainState {
  size: number
  /** 棋盘满排：grid[r][c] = 数字（1..N），无论是否已揭示 */
  grid: number[][]
  /** 该格数字是否可见（开局显示的 + 玩家已经连上的） */
  revealed: boolean[][]
  /**
   * 开局就显示的格子快照；撤回/清空时用来区分"本来就看得到"（保持可见）
   * 与"连上才看到"（恢复空白）。旧存档可能没有，缺省按 revealed 处理。
   */
  initialRevealed?: boolean[][]
  /** 下一个要连的数字（1 起）；= N+1 表示已通关 */
  next: number
  /** 已锁定的格子序列（数字 1..next-1 的所在格） */
  committed: ChainPoint[]
  /** 已冻结的计时（毫秒）；进行中的实时用时 = elapsedMs + (startedAt ? now-startedAt : 0) */
  elapsedMs: number
  mistakes: number
  status: NumberChainStatus
  level: number
  difficulty: NumberChainDifficulty
  mode: NumberChainMode
  /** 本轮累计总分（跨关卡累加） */
  totalScore: number
  bestScore: number
  /** 最近一关的得分（结算展示用） */
  lastLevelScore: number
  /** 已通关的关卡数（无尽模式结算展示用） */
  clearedLevels: number
}

export const LEVEL_PROGRESS_KEY = 'easygame-numberchain-level-progress'

export interface NumberChainProgress {
  currentLevel: number
  maxUnlocked: number
}

export const DEFAULT_NUMBERCHAIN_CONFIG: NumberChainConfig = {
  difficulty: 'normal',
  mode: 'classic',
}

export const BEST_KEY_PREFIX = 'easygame-numberchain-best'
/** 每档棋盘的历史最快通关时间（毫秒），key 带 size */
export const BEST_TIME_KEY_PREFIX = 'easygame-numberchain-besttime'

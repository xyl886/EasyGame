/**
 * 数独类型定义（支持 4×4 / 6×6 / 9×9 三种尺寸）
 */

export type SudokuDifficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY_LABELS: Record<SudokuDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

/** 支持的尺寸规格：宫结构（boxRows×boxCols）与数字范围 */
export interface SudokuSpec {
  size: number
  boxRows: number
  boxCols: number
  label: string
}

export const SIZES: SudokuSpec[] = [
  { size: 4, boxRows: 2, boxCols: 2, label: '4×4' },
  { size: 6, boxRows: 2, boxCols: 3, label: '6×6' },
  { size: 9, boxRows: 3, boxCols: 3, label: '9×9' },
]

export function specOf(size: number): SudokuSpec {
  return SIZES.find((s) => s.size === size) ?? SIZES[2]
}

/** 各尺寸 × 难度挖空格数 */
export const HOLES_BY_DIFFICULTY: Record<number, Record<SudokuDifficulty, number>> = {
  4: { easy: 4, normal: 6, hard: 8 },
  6: { easy: 10, normal: 16, hard: 22 },
  9: { easy: 35, normal: 45, hard: 55 },
}

export interface SudokuConfig {
  size: number
  difficulty: SudokuDifficulty
}

export interface SudokuState {
  /** 当前盘面（size×size，0=空） */
  grid: number[][]
  /** 初始提示格 */
  given: boolean[][]
  /** 候选笔记：notes[r][c] = 该格的候选数字数组（空数组=无笔记） */
  notes: number[][][]
  /** 选中格 (row, col)，null=未选中 */
  selected: { row: number; col: number } | null
  /** 填格次数（含擦除） */
  moves: number
  /** 填错次数（与答案不同） */
  mistakes: number
  /** 已用提示次数 */
  hintsUsed: number
  /** 开局时间戳 */
  startTime: number
  /** 该尺寸+难度历史最快完成用时（秒，0=未完成过） */
  bestTime: number
  won: boolean
  over: boolean
  size: number
  difficulty: SudokuDifficulty
  /** 填格历史（撤销用） */
  history: Array<{ row: number; col: number; prev: number; next: number }>
}

/** 每局最多智能提示次数 */
export const MAX_HINTS = 3

/** 完成得分：用时越短分越高（900 分封顶） */
export const SUDOKU_SCORE_BASE = 900

export function sudokuScoreForTime(seconds: number): number {
  return Math.max(1, SUDOKU_SCORE_BASE - seconds)
}

export const DEFAULT_SUDOKU_CONFIG: SudokuConfig = {
  size: 9,
  difficulty: 'normal',
}

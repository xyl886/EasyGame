/**
 * 数独类型定义
 */

export const SIZE = 9

export type SudokuDifficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY_LABELS: Record<SudokuDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
}

/** 各难度挖空格数（简单挖得少、提示多） */
export const HOLES_BY_DIFFICULTY: Record<SudokuDifficulty, number> = {
  easy: 35,
  normal: 45,
  hard: 55,
}

export interface SudokuConfig {
  difficulty: SudokuDifficulty
}

export interface SudokuState {
  /** 当前盘面（9×9，0=空） */
  grid: number[][]
  /** 初始提示格（给定数，不可改） */
  given: boolean[][]
  /** 选中格 (row, col)，null=未选中 */
  selected: { row: number; col: number } | null
  /** 填格次数（含擦除，用于统计） */
  moves: number
  /** 开局时间戳 */
  startTime: number
  /** 该难度历史最快完成用时（秒，0=未完成过） */
  bestTime: number
  won: boolean
  over: boolean
  difficulty: SudokuDifficulty
  /** 填格历史（撤销用） */
  history: Array<{ row: number; col: number; prev: number; next: number }>
}

/** 完成得分：用时越短分越高（900 分封顶，>900 秒保底 1 分） */
export const SUDOKU_SCORE_BASE = 900

export function sudokuScoreForTime(seconds: number): number {
  return Math.max(1, SUDOKU_SCORE_BASE - seconds)
}

export const DEFAULT_SUDOKU_CONFIG: SudokuConfig = {
  difficulty: 'normal',
}

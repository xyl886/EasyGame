import type { Game2048State } from '../2048/types'
import type { EliminateState } from '../eliminate/types'
import type { ClassicState } from '../klotski-classic/types'
import type { KlotskiState } from '../klotski/types'
import type { LinkState } from '../lianliankan/types'
import type { MineState } from '../minesweeper/types'
import type { NumberChainState } from '../numberchain/types'
import type { SnakeState } from '../snake/types'
import type { SudokuState } from '../sudoku/types'
import type { TetrisState } from '../tetris/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber)
}

function isNumberMatrix(value: unknown): value is number[][] {
  return Array.isArray(value) && value.every(isNumberArray)
}

function isBooleanMatrix(value: unknown): value is boolean[][] {
  return Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every(isBoolean))
}

function isSavedVersion(value: Record<string, unknown>): boolean {
  return value.v === undefined || isNumber(value.v)
}

export function isGame2048Autosave(value: unknown): value is Game2048State {
  if (!isRecord(value) || !Array.isArray(value.grid)) return false
  const gridOk = value.grid.every((row) => Array.isArray(row) && row.every((tile) =>
    tile === null || (isRecord(tile) && isNumber(tile.id) && isNumber(tile.value)),
  ))
  return gridOk && isNumber(value.size) && isNumber(value.score) && isBoolean(value.won) && isBoolean(value.over)
}

export function isKlotskiAutosave(value: unknown): value is KlotskiState {
  return isRecord(value) && isNumberArray(value.board) && isNumber(value.size) && isNumber(value.moves) &&
    isNumber(value.startTime) && isBoolean(value.won) && isBoolean(value.over)
}

export function isClassicAutosave(value: unknown): value is ClassicState {
  return isRecord(value) && Array.isArray(value.pieces) && value.pieces.every((piece) =>
    isRecord(piece) && isNumber(piece.id) && isNumber(piece.row) && isNumber(piece.col) && isNumber(piece.w) && isNumber(piece.h),
  ) && isNumber(value.moves) && isNumber(value.startTime) && isBoolean(value.won) && isBoolean(value.over) && typeof value.layout === 'string'
}

export function isTetrisAutosave(value: unknown): value is TetrisState {
  return isRecord(value) && isNumberMatrix(value.grid) && isNumberArray(value.next) &&
    (value.current === null || isRecord(value.current)) && isNumber(value.score) &&
    isBoolean(value.over) && isBoolean(value.won) && isBoolean(value.paused)
}

export function isSnakeAutosave(value: unknown): value is SnakeState {
  return isRecord(value) && Array.isArray(value.snake) && Array.isArray(value.foods) && Array.isArray(value.obstacles) &&
    isNumber(value.size) && isNumber(value.score) && isBoolean(value.over) && isBoolean(value.won)
}

export function isMinesweeperAutosave(value: unknown): value is MineState {
  return isRecord(value) && Array.isArray(value.cells) && value.cells.every((cell) =>
    isRecord(cell) && isBoolean(cell.isMine) && isBoolean(cell.revealed) &&
    (cell.flag === 'none' || cell.flag === 'flag' || cell.flag === 'question') && isNumber(cell.adjacent),
  ) && isNumber(value.rows) && isNumber(value.cols) && isNumber(value.mines) &&
    (value.status === 'ready' || value.status === 'playing' || value.status === 'won' || value.status === 'lost')
}

export function isSudokuAutosave(value: unknown): value is SudokuState {
  return isRecord(value) && isNumberMatrix(value.grid) && isBooleanMatrix(value.given) &&
    Array.isArray(value.notes) && value.notes.every((row) => Array.isArray(row) && row.every(isNumberArray)) &&
    isNumber(value.size) && isNumber(value.moves) && isBoolean(value.won) && Array.isArray(value.history)
}

export function isLianliankanAutosave(value: unknown): value is LinkState & { savedAt?: number; v?: number } {
  return isRecord(value) && isNumberMatrix(value.grid) && isNumber(value.rows) && isNumber(value.cols) &&
    isNumber(value.moves) && isNumber(value.score) && typeof value.status === 'string' && isSavedVersion(value)
}

export function isEliminateAutosave(value: unknown): value is EliminateState & { savedAt?: number; v?: number } {
  return isRecord(value) && isNumberMatrix(value.grid) && isNumber(value.rows) && isNumber(value.cols) &&
    isNumber(value.movesLeft) && isNumber(value.score) && typeof value.status === 'string' && isSavedVersion(value)
}

export function isNumberChainAutosave(value: unknown): value is NumberChainState & { savedAt?: number; v?: number } {
  return isRecord(value) && isNumberMatrix(value.grid) && isBooleanMatrix(value.revealed) &&
    isNumber(value.size) && isNumber(value.next) && isNumber(value.level) && typeof value.status === 'string' && isSavedVersion(value)
}

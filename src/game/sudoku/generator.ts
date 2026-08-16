/**
 * 数独生成器 + 求解器（纯 TS，无 DOM 依赖）
 * 支持 4×4（2×2 宫）、6×6（2×3 宫）、9×9（3×3 宫）
 *
 * - 完整盘生成：从尺寸模板做数字重映射 + 行/列组内交换 + 组间交换（保证有效且随机）
 * - 挖洞：随机挖格并用回溯验证唯一解，不唯一则回填
 */
import type { SudokuSpec } from './types'
import { specOf } from './types'

export type Board = number[][] // size×size，0=空

/** 判断 (r,c) 放 v 是否与同行/列/宫冲突（v!=0） */
export function canPlace(board: Board, spec: SudokuSpec, r: number, c: number, v: number): boolean {
  const n = spec.size
  for (let i = 0; i < n; i++) {
    if (i !== c && board[r][i] === v) return false
    if (i !== r && board[i][c] === v) return false
  }
  const br = Math.floor(r / spec.boxRows) * spec.boxRows
  const bc = Math.floor(c / spec.boxCols) * spec.boxCols
  for (let i = br; i < br + spec.boxRows; i++) {
    for (let j = bc; j < bc + spec.boxCols; j++) {
      if ((i !== r || j !== c) && board[i][j] === v) return false
    }
  }
  return true
}

/** 回溯求解放数量（limit 内），用于唯一性判断 */
export function countSolutions(board: Board, spec: SudokuSpec, limit = 2): number {
  const b = board.map((row) => [...row])
  const n = spec.size
  let count = 0
  const solve = (): void => {
    if (count >= limit) return
    let r = -1
    let c = -1
    outer: for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (b[i][j] === 0) {
          r = i
          c = j
          break outer
        }
      }
    }
    if (r < 0) {
      count++
      return
    }
    const nums = shuffled(Array.from({ length: n }, (_, i) => i + 1))
    for (const v of nums) {
      if (canPlace(b, spec, r, c, v)) {
        b[r][c] = v
        solve()
        if (count >= limit) return
        b[r][c] = 0
      }
    }
  }
  solve()
  return count
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function zeros(n: number): Board {
  return Array.from({ length: n }, () => Array(n).fill(0))
}

/** 各尺寸基础完整盘模板 */
function baseTemplate(spec: SudokuSpec): number[][] {
  switch (spec.size) {
    case 4:
      return [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1],
      ]
    case 6:
      return [
        [1, 2, 3, 4, 5, 6],
        [4, 5, 6, 1, 2, 3],
        [2, 3, 1, 5, 6, 4],
        [5, 6, 4, 2, 3, 1],
        [3, 1, 2, 6, 4, 5],
        [6, 4, 5, 3, 1, 2],
      ]
    default:
      return [
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [4, 5, 6, 7, 8, 9, 1, 2, 3],
        [7, 8, 9, 1, 2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6, 7, 8, 9, 1],
        [5, 6, 7, 8, 9, 1, 2, 3, 4],
        [8, 9, 1, 2, 3, 4, 5, 6, 7],
        [3, 4, 5, 6, 7, 8, 9, 1, 2],
        [6, 7, 8, 9, 1, 2, 3, 4, 5],
        [9, 1, 2, 3, 4, 5, 6, 7, 8],
      ]
  }
}

/**
 * 生成随机完整盘：数字重映射 + 行组内/组间交换 + 列组内/组间交换。
 * 行组 = size/boxRows 组、每组 boxRows 行；列组 = size/boxCols 组、每组 boxCols 列。
 */
export function generateSolved(spec: SudokuSpec): Board {
  const n = spec.size
  const base = baseTemplate(spec)
  const perm = shuffled(Array.from({ length: n }, (_, i) => i + 1))
  const remap = (v: number) => perm[v - 1]

  const rowGroups = n / spec.boxRows
  const rowOrder = Array.from({ length: spec.boxRows }, (_, i) => i)
  const rowBand = shuffled(Array.from({ length: rowGroups }, (_, i) => i))
  const rows: number[] = []
  for (const g of rowBand) {
    const inner = shuffled(rowOrder).map((x) => g * spec.boxRows + x)
    rows.push(...inner)
  }

  const colGroups = n / spec.boxCols
  const colOrder = Array.from({ length: spec.boxCols }, (_, i) => i)
  const colBand = shuffled(Array.from({ length: colGroups }, (_, i) => i))
  const cols: number[] = []
  for (const g of colBand) {
    const inner = shuffled(colOrder).map((x) => g * spec.boxCols + x)
    cols.push(...inner)
  }

  const out = zeros(n)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[r][c] = remap(base[rows[r]][cols[c]])
    }
  }
  return out
}

/** 生成唯一解题面 */
export function generatePuzzle(
  spec: SudokuSpec,
  holes: number,
): { puzzle: Board; solution: Board } {
  const solution = generateSolved(spec)
  const puzzle = solution.map((row) => [...row])
  const cells = shuffled(Array.from({ length: spec.size * spec.size }, (_, i) => i))
  let dug = 0
  for (const idx of cells) {
    if (dug >= holes) break
    const r = Math.floor(idx / spec.size)
    const c = idx % spec.size
    const saved = puzzle[r][c]
    puzzle[r][c] = 0
    if (countSolutions(puzzle, spec, 2) !== 1) {
      puzzle[r][c] = saved
    } else {
      dug++
    }
  }
  return { puzzle, solution }
}

/** 便捷：按尺寸直接生成（视图用） */
export function generatePuzzleFor(size: number, holes: number) {
  return generatePuzzle(specOf(size), holes)
}

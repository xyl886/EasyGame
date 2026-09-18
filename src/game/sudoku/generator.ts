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

/** 二进制中 1 的个数（候选位掩码用） */
function popcount(x: number): number {
  let c = 0
  while (x) {
    x &= x - 1
    c++
  }
  return c
}

/**
 * 回溯求解放数量（limit 内），用于唯一性判断。
 * 使用行/列/宫位掩码 + 最小候选数（MRV）选格，且不在每个节点洗牌
 * （计数与顺序无关，洗牌只增加分配与随机开销）。
 */
export function countSolutions(board: Board, spec: SudokuSpec, limit = 2): number {
  const n = spec.size
  const b = board.map((row) => [...row])
  const rowMask = new Int32Array(n)
  const colMask = new Int32Array(n)
  const boxRows = spec.boxRows
  const boxCols = spec.boxCols
  const boxesPerRow = n / boxCols
  const boxCount = (n / boxRows) * boxesPerRow
  const boxMask = new Int32Array(boxCount)
  const boxIndex = (r: number, c: number) =>
    Math.floor(r / boxRows) * boxesPerRow + Math.floor(c / boxCols)
  // 候选位：bit1..bitn
  const allBits = ((1 << n) - 1) << 1

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = b[r][c]
      if (v !== 0) {
        const bit = 1 << v
        rowMask[r] |= bit
        colMask[c] |= bit
        boxMask[boxIndex(r, c)] |= bit
      }
    }
  }

  let count = 0
  const solve = (): void => {
    if (count >= limit) return
    // MRV：选候选最少的空格，提前剪枝
    let bestR = -1
    let bestC = -1
    let bestCand = 0
    let bestCnt = n + 1
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (b[r][c] !== 0) continue
        const cand = allBits & ~(rowMask[r] | colMask[c] | boxMask[boxIndex(r, c)])
        if (cand === 0) return
        const cnt = popcount(cand)
        if (cnt < bestCnt) {
          bestCnt = cnt
          bestR = r
          bestC = c
          bestCand = cand
          if (cnt === 1) break
        }
      }
      if (bestCnt === 1) break
    }
    if (bestR < 0) {
      count++
      return
    }
    const bitBox = boxMask[boxIndex(bestR, bestC)]
    void bitBox
    for (let v = 1; v <= n; v++) {
      const bit = 1 << v
      if ((bestCand & bit) === 0) continue
      b[bestR][bestC] = v
      rowMask[bestR] |= bit
      colMask[bestC] |= bit
      boxMask[boxIndex(bestR, bestC)] |= bit
      solve()
      if (count >= limit) {
        b[bestR][bestC] = 0
        rowMask[bestR] &= ~bit
        colMask[bestC] &= ~bit
        boxMask[boxIndex(bestR, bestC)] &= ~bit
        return
      }
      b[bestR][bestC] = 0
      rowMask[bestR] &= ~bit
      colMask[bestC] &= ~bit
      boxMask[boxIndex(bestR, bestC)] &= ~bit
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
  // 时间预算：极端情况下避免长时间占死主线程（宁可少挖洞也要可交互）
  const deadline = Date.now() + 80
  for (const idx of cells) {
    if (dug >= holes) break
    if (Date.now() > deadline) break
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

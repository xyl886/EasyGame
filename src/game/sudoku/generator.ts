/**
 * 数独生成器 + 求解器（纯 TS，无 DOM 依赖）
 *
 * - 完整盘生成：从有效模板做行/列/宫变换 + 数字重映射（保证均匀随机且一定有效）
 * - 挖洞：随机挖格并用回溯验证唯一解，不唯一则回填，保证题面唯一解
 */
import { SIZE } from './types'

export type Board = number[][] // SIZE×SIZE，0=空

/** 数独有效性检查：当前盘是否无冲突（不判完成） */
export function isValid(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c]
      if (v === 0) continue
      if (!canPlace(board, r, c, v)) return false
    }
  }
  return true
}

/** 判断 (r,c) 放 v 是否与同行/列/宫冲突（v!=0） */
export function canPlace(board: Board, r: number, c: number, v: number): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (i !== c && board[r][i] === v) return false
    if (i !== r && board[i][c] === v) return false
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = br; i < br + 3; i++) {
    for (let j = bc; j < bc + 3; j++) {
      if ((i !== r || j !== c) && board[i][j] === v) return false
    }
  }
  return true
}

/** 回溯求解：找第一个解。limit>0 时最多找 limit 个（用于唯一性判断） */
export function countSolutions(board: Board, limit = 2): number {
  const b = board.map((row) => [...row])
  let count = 0
  const solve = (): void => {
    if (count >= limit) return
    // 找第一个空格
    let r = -1
    let c = -1
    outer: for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
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
    const nums = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])
    for (const v of nums) {
      if (canPlace(b, r, c, v)) {
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

function zeros(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

/**
 * 生成随机完整盘。
 * 用基础模板做：数字重映射 + 行组内交换 + 列组内交换 + 组间交换，保证有效且随机。
 */
export function generateSolved(): Board {
  // 基础完整盘模板
  const base = [
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
  // 数字重映射
  const perm = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const remap = (v: number) => perm[v - 1]
  // 行组内交换 + 组间交换
  const rowOrder = [0, 1, 2]
  const rowBand = shuffled([0, 1, 2])
  const rows: number[] = []
  for (const b of rowBand) {
    const inner = shuffled(rowOrder).map((x) => b * 3 + x)
    rows.push(...inner)
  }
  const colOrder = [0, 1, 2]
  const colBand = shuffled([0, 1, 2])
  const cols: number[] = []
  for (const b of colBand) {
    const inner = shuffled(colOrder).map((x) => b * 3 + x)
    cols.push(...inner)
  }
  const out = zeros()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      out[r][c] = remap(base[rows[r]][cols[c]])
    }
  }
  return out
}

/**
 * 生成唯一解题面：从完整盘挖 holes 格，保证唯一解。
 * @param holes 期望挖空格数（实际可能略少，保证唯一解优先）
 */
export function generatePuzzle(holes: number): { puzzle: Board; solution: Board } {
  const solution = generateSolved()
  const puzzle = solution.map((row) => [...row])
  // 随机挖洞顺序
  const cells = shuffled(Array.from({ length: SIZE * SIZE }, (_, i) => i))
  let dug = 0
  for (const idx of cells) {
    if (dug >= holes) break
    const r = Math.floor(idx / SIZE)
    const c = idx % SIZE
    const saved = puzzle[r][c]
    puzzle[r][c] = 0
    if (countSolutions(puzzle, 2) !== 1) {
      // 不唯一 → 回填
      puzzle[r][c] = saved
    } else {
      dug++
    }
  }
  return { puzzle, solution }
}

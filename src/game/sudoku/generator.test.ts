import { describe, it, expect } from 'vitest'
import { generatePuzzle, generatePuzzleFor, countSolutions, canPlace, generateSolved } from './generator'
import { specOf, SIZES } from './types'

function zeros(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(0))
}

describe('sudoku generator', () => {
  it('完整盘每行每列每宫不重复', () => {
    for (const spec of SIZES) {
      const board = generateSolved(spec)
      const n = spec.size
      for (let i = 0; i < n; i++) {
        const row = new Set(board[i])
        const col = new Set(board.map((r) => r[i]))
        expect(row.size).toBe(n)
        expect(col.size).toBe(n)
      }
      // 宫
      for (let br = 0; br < n; br += spec.boxRows) {
        for (let bc = 0; bc < n; bc += spec.boxCols) {
          const set = new Set<number>()
          for (let r = br; r < br + spec.boxRows; r++) {
            for (let c = bc; c < bc + spec.boxCols; c++) set.add(board[r][c])
          }
          expect(set.size).toBe(spec.boxRows * spec.boxCols)
        }
      }
    }
  })

  it('生成题面唯一解', () => {
    for (const size of [4, 6, 9]) {
      const spec = specOf(size)
      const holes = size === 4 ? 8 : size === 6 ? 20 : 45
      const { puzzle } = generatePuzzle(spec, holes)
      expect(countSolutions(puzzle, spec, 2)).toBe(1)
    }
  })

  it('generatePuzzleFor 便捷接口', () => {
    const { puzzle, solution } = generatePuzzleFor(4, 6)
    expect(puzzle).toHaveLength(4)
    expect(solution).toHaveLength(4)
    let zeros = 0
    for (const row of puzzle) for (const v of row) if (v === 0) zeros++
    expect(zeros).toBeLessThanOrEqual(6)
  })

  it('canPlace 检测同行冲突', () => {
    const spec = specOf(4)
    const b = zeros(4)
    b[0][0] = 1
    expect(canPlace(b, spec, 0, 1, 1)).toBe(false)
    expect(canPlace(b, spec, 0, 1, 2)).toBe(true)
  })

  it('countSolutions 对已满盘为 1', () => {
    const spec = specOf(4)
    const board = generateSolved(spec)
    expect(countSolutions(board, spec, 2)).toBe(1)
  })
})

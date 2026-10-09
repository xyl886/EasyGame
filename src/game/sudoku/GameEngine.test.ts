import { beforeEach, describe, expect, it } from 'vitest'
import { SudokuEngine } from './GameEngine'

describe('SudokuEngine', () => {
  beforeEach(() => localStorage.clear())

  it('保护提示格和输入范围，普通填数可以撤销', () => {
    const engine = new SudokuEngine({ size: 4, difficulty: 'easy' })
    const initial = engine.getState()
    const given = initial.given.findIndex((row) => row.includes(true))
    const givenCol = initial.given[given].indexOf(true)
    engine.select(given, givenCol)
    expect(engine.move(1)).toBe(false)

    const row = initial.grid.findIndex((cells) => cells.includes(0))
    const col = initial.grid[row].indexOf(0)
    engine.select(row, col)
    expect(engine.move(0)).toBe(false)
    expect(engine.move(5)).toBe(false)
    expect(engine.move(1)).toBe(true)
    expect(engine.canUndo()).toBe(true)
    expect(engine.undo()).toBe(true)
    expect(engine.getState().grid[row][col]).toBe(0)
    expect(engine.getState().moves).toBe(0)
  })

  it('提示只填空格，撤销提示后可继续游戏', () => {
    const engine = new SudokuEngine({ size: 4, difficulty: 'easy' })
    const result = engine.hint()

    expect(result).not.toBeNull()
    expect(engine.getState().grid[result!.row][result!.col]).toBeGreaterThan(0)
    expect(engine.getState().hintsUsed).toBe(1)
    expect(engine.undo()).toBe(true)
    expect(engine.getState().grid[result!.row][result!.col]).toBe(0)
  })

  it('按隐藏答案补全当前题目后进入胜利状态', () => {
    const engine = new SudokuEngine({ size: 4, difficulty: 'easy' })
    const solution = (engine as unknown as { solution: number[][] }).solution
    const state = engine.getState()

    for (let row = 0; row < state.size; row++) {
      for (let col = 0; col < state.size; col++) {
        if (state.given[row][col]) continue
        engine.select(row, col)
        expect(engine.move(solution[row][col])).toBe(true)
      }
    }

    expect(engine.isWin()).toBe(true)
    expect(engine.isGameOver()).toBe(true)
    expect(engine.check()).toEqual({ conflicts: 0, empty: 0, complete: true })
  })

  it('生成的不同尺寸题目都具有匹配的盘面结构', () => {
    for (const size of [4, 6, 9]) {
      const engine = new SudokuEngine({ size, difficulty: 'easy' })
      const state = engine.getState()
      expect(state.grid).toHaveLength(size)
      expect(state.grid.every((row) => row.length === size)).toBe(true)
      expect(state.given.every((row) => row.length === size)).toBe(true)
      expect(state.notes.every((row) => row.length === size)).toBe(true)
    }
  })
})

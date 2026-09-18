import { describe, it, expect } from 'vitest'
import { KlotskiEngine } from './GameEngine'

describe('KlotskiEngine', () => {
  it('构造后棋盘尺寸合法且有空格', () => {
    const engine = new KlotskiEngine()
    const s = engine.getState()
    expect(s.size).toBeGreaterThanOrEqual(3)
    expect(s.board).toHaveLength(s.size * s.size)
    expect(s.board).toContain(0)
    // 数字块 1..n 各出现一次
    const nums = s.board.filter((v) => v !== 0).sort((a, b) => a - b)
    expect(nums[0]).toBe(1)
    expect(new Set(nums).size).toBe(nums.length)
    expect(nums.length).toBe(s.size * s.size - 1)
  })

  it('getState 返回独立 board 拷贝', () => {
    const engine = new KlotskiEngine()
    const a = engine.getState()
    const b = engine.getState()
    expect(a.board).not.toBe(b.board)
    a.board[0] = 99
    expect(engine.getState().board[0]).not.toBe(99)
  })

  it('随机若干方向移动不抛错且棋盘仍合法', () => {
    const engine = new KlotskiEngine()
    const dirs = ['up', 'down', 'left', 'right'] as const
    for (let i = 0; i < 20; i++) {
      engine.move(dirs[i % 4])
    }
    const s = engine.getState()
    expect(s.board.filter((v) => v === 0).length).toBe(1)
    expect(s.board.filter((v) => v === 99)).toHaveLength(0)
    expect(s.board.filter((v) => v !== 0)).toHaveLength(s.size * s.size - 1)
  })

  it('loadState 恢复盘面', () => {
    const engine = new KlotskiEngine()
    const snap = engine.getState()
    engine.move('left')
    engine.move('right')
    engine.loadState(snap)
    expect(engine.getState().board).toEqual(snap.board)
  })
})

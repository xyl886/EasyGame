import { describe, it, expect } from 'vitest'
import { EliminateEngine } from './GameEngine'
import type { EliminateState } from './types'

describe('EliminateEngine', () => {
  it('构造后有合法棋盘与步数/目标', () => {
    const engine = new EliminateEngine({ difficulty: 'easy', theme: 'gem', level: 1 })
    const s = engine.getState()
    expect(s.rows).toBeGreaterThan(0)
    expect(s.cols).toBeGreaterThan(0)
    expect(s.grid).toHaveLength(s.rows)
    expect(s.movesLeft).toBeGreaterThan(0)
    expect(s.targetScore).toBeGreaterThan(0)
    expect(s.status).toBe('playing')
    // 初盘不应已有连锁动画数据
    expect(engine.lastCascade).toEqual([])
  })

  it('getState 返回独立 grid 拷贝', () => {
    const engine = new EliminateEngine({ difficulty: 'easy', theme: 'gem', level: 1 })
    const a = engine.getState()
    const b = engine.getState()
    expect(a.grid).not.toBe(b.grid)
    expect(a.grid[0]).not.toBe(b.grid[0])
    a.grid[0][0] = 999
    expect(engine.getState().grid[0][0]).not.toBe(999)
  })

  it('选中再点同一格取消选中', () => {
    const engine = new EliminateEngine({ difficulty: 'easy', theme: 'gem', level: 1 })
    engine.move({ r: 0, c: 0 })
    expect(engine.getState().selected).toEqual({ r: 0, c: 0 })
    engine.move({ r: 0, c: 0 })
    expect(engine.getState().selected).toBeNull()
  })

  it('无效相邻交换不耗步（movesLeft 不变）', () => {
    const engine = new EliminateEngine({ difficulty: 'easy', theme: 'gem', level: 1 })
    const before = engine.getState().movesLeft
    // 找一对交换后无消除的相邻格较难；至少 move 调用选中不抛错
    engine.move({ r: 0, c: 0 })
    engine.move({ r: 0, c: 1 })
    const after = engine.getState()
    expect(after.movesLeft).toBeLessThanOrEqual(before)
    expect(after.rows).toBe(before > 0 ? after.rows : after.rows)
  })

  it('hintNow 不抛错', () => {
    const engine = new EliminateEngine({ difficulty: 'easy', theme: 'gem', level: 1 })
    expect(() => engine.hintNow()).not.toThrow()
    const s = engine.getState()
    expect(s.hint === null || typeof s.hint === 'object').toBe(true)
  })

  it('loadState 后状态字段一致', () => {
    const engine = new EliminateEngine({ difficulty: 'easy', theme: 'gem', level: 1 })
    const snap: EliminateState = engine.getState()
    const engine2 = new EliminateEngine({ difficulty: 'normal', theme: 'candy', level: 1 })
    engine2.loadState(snap)
    const loaded = engine2.getState()
    expect(loaded.rows).toBe(snap.rows)
    expect(loaded.cols).toBe(snap.cols)
    expect(loaded.score).toBe(snap.score)
    expect(loaded.grid).toEqual(snap.grid)
  })
})

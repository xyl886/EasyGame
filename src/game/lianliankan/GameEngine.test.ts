import { describe, it, expect, beforeEach } from 'vitest'
import { LianliankanEngine } from './GameEngine'
import type { LinkState } from './types'

describe('LianliankanEngine', () => {
  let engine: LianliankanEngine

  beforeEach(() => {
    engine = new LianliankanEngine({ difficulty: 'easy', theme: 'fruit', level: 1 })
  })

  it('getState 返回独立 grid 拷贝', () => {
    const a = engine.getState()
    const b = engine.getState()
    expect(a.grid).not.toBe(b.grid)
    a.grid[0][0] = 0
    expect(engine.getState().grid[0][0]).not.toBe(0)
  })

  it('同格不可连接', () => {
    expect(engine.canConnect(0, 0, 0, 0)).toBe(false)
    expect(engine.getPath(0, 0, 0, 0)).toBeNull()
  })

  it('越界不可连接', () => {
    expect(engine.canConnect(-1, 0, 0, 0)).toBe(false)
    expect(engine.canConnect(0, 0, 999, 0)).toBe(false)
  })

  it('构造后棋盘尺寸合法且至少有一个提示对（或已可洗牌）', () => {
    const s = engine.getState()
    expect(s.rows).toBeGreaterThan(0)
    expect(s.cols).toBeGreaterThan(0)
    expect(s.status).toBe('playing')
    // hint 或 reshuffle 不抛错
    engine.hintNow()
    engine.reshuffle()
    expect(engine.getState().status).toBe('playing')
  })

  it('loadState 后可连接的相邻同图案能消除', () => {
    const rows = 4
    const cols = 4
    // 两两成对铺满，保证 (0,0) 与 (0,1) 同图且可连
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ((r * cols + c) >> 1) + 1),
    )
    const state: LinkState = {
      rows,
      cols,
      grid,
      selected: null,
      hint: null,
      pairs: 0,
      moves: 0,
      score: 0,
      bestScore: 0,
      startTime: Date.now(),
      status: 'playing',
      difficulty: 'easy',
      theme: 'fruit',
      timeLimit: 180,
      timeLeft: 180,
      level: 1,
      undoLeft: 3,
    }
    engine.loadState(state)
    const loaded = engine.getState()
    expect(loaded.grid[0][0]).toBe(loaded.grid[0][1])
    expect(engine.canConnect(0, 0, 0, 1)).toBe(true)
    const path = engine.getPath(0, 0, 0, 1)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThanOrEqual(2)

    engine.move({ r: 0, c: 0 })
    engine.move({ r: 0, c: 1 })
    const after = engine.getState()
    expect(after.grid[0][0]).toBe(0)
    expect(after.grid[0][1]).toBe(0)
    expect(after.pairs).toBe(1)
    expect(after.score).toBeGreaterThan(0)
  })

  it('不同图案不可消除', () => {
    const rows = 2
    const cols = 2
    const grid = [
      [1, 2],
      [2, 1],
    ]
    engine.loadState({
      rows,
      cols,
      grid,
      selected: null,
      hint: null,
      pairs: 0,
      moves: 0,
      score: 0,
      bestScore: 0,
      startTime: Date.now(),
      status: 'playing',
      difficulty: 'easy',
      theme: 'fruit',
      timeLimit: 180,
      timeLeft: 180,
      level: 1,
      undoLeft: 3,
    })
    expect(engine.canConnect(0, 0, 0, 1)).toBe(false)
  })
})

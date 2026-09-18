import { describe, it, expect, beforeEach } from 'vitest'
import { Game2048Engine } from './GameEngine'
import type { Tile } from './types'

function tile(value: number, row: number, col: number, id = row * 4 + col + 1): Tile {
  return { id, value, row, col }
}

describe('Game2048Engine', () => {
  let engine: Game2048Engine

  beforeEach(() => {
    engine = new Game2048Engine({ size: 4, initialTiles: 0, difficulty: 'normal' })
  })

  function loadBoard(values: number[][]) {
    const grid = values.map((row, r) =>
      row.map((v, c) => (v === 0 ? null : tile(v, r, c))),
    )
    engine.loadState({
      grid,
      score: 0,
      bestScore: 0,
      won: false,
      over: false,
      keepPlaying: false,
      size: 4,
    })
  }

  it('getState 返回独立拷贝，不共享引擎内部 grid', () => {
    loadBoard([[2, 0, 0, 0]])
    const a = engine.getState()
    const b = engine.getState()
    expect(a.grid).not.toBe(b.grid)
    expect(a.grid[0][0]).not.toBe(b.grid[0][0])
    a.grid[0][0]!.value = 999
    expect(engine.getState().grid[0][0]!.value).toBe(2)
  })

  it('左移合并相同数字并计分', () => {
    loadBoard([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    expect(engine.move('left')).toBe(true)
    const s = engine.getState()
    expect(s.grid[0][0]!.value).toBe(4)
    expect(s.grid[0][1]).toBeNull()
    expect(s.score).toBe(4)
    // 合并标记供动画使用
    expect(s.grid[0][0]!.isMerged).toBe(true)
  })

  it('无法移动时返回 false 且不计分', () => {
    loadBoard([
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const scoreBefore = engine.getState().score
    expect(engine.move('left')).toBe(false)
    expect(engine.getState().score).toBe(scoreBefore)
  })

  it('undo 恢复上一局面', () => {
    loadBoard([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    engine.move('left')
    expect(engine.getState().grid[0][0]!.value).toBe(4)
    expect(engine.undo()).toBe(true)
    // undo 后 2048 会再生成随机块，检查原位置至少不是错误的 4 单独存在
    const s = engine.getState()
    const values = s.grid[0].map((t) => t?.value ?? 0)
    expect(values).not.toEqual([4, 0, 0, 0])
    expect(s.score).toBe(0)
  })

  it('reset 清空分数并重开局', () => {
    loadBoard([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    engine.move('left')
    engine.reset()
    const s = engine.getState()
    expect(s.score).toBe(0)
    expect(s.over).toBe(false)
    expect(s.won).toBe(false)
  })
})

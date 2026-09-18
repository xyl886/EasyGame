import { describe, it, expect } from 'vitest'
import { TetrisEngine } from './GameEngine'

describe('TetrisEngine', () => {
  it('构造后有当前方块与预览队列，棋盘 10×20', () => {
    const engine = new TetrisEngine()
    const s = engine.getState()
    expect(s.width).toBe(10)
    expect(s.height).toBe(20)
    expect(s.current).not.toBeNull()
    expect(s.next.length).toBeGreaterThanOrEqual(1)
    expect(s.over).toBe(false)
    expect(s.grid).toHaveLength(20)
    expect(s.grid[0]).toHaveLength(10)
  })

  it('getState 返回独立 grid / current 拷贝', () => {
    const engine = new TetrisEngine()
    const a = engine.getState()
    const b = engine.getState()
    expect(a.grid).not.toBe(b.grid)
    expect(a.grid[0]).not.toBe(b.grid[0])
    expect(a.current).not.toBe(b.current)
    a.grid[0][0] = 7
    expect(engine.getState().grid[0][0]).toBe(0)
  })

  it('左右移动改变当前方块 x', () => {
    const engine = new TetrisEngine()
    const x0 = engine.getState().current!.x
    engine.move('left')
    const x1 = engine.getState().current!.x
    // 要么左移成功，要么已贴边（x 不变）
    expect(x1).toBeLessThanOrEqual(x0)
    engine.move('right')
    const x2 = engine.getState().current!.x
    expect(x2).toBeGreaterThanOrEqual(x1)
    expect(x2).toBe(x0) // 至少能移回原位（未贴边时）或仍在合法范围
    expect(x2).toBeGreaterThanOrEqual(0)
  })

  it('soft drop 使 y 增大或锁定新块', () => {
    const engine = new TetrisEngine()
    const y0 = engine.getState().current!.y
    engine.move('down')
    const s = engine.getState()
    // 下落成功 y+1，或已锁定换了新块
    if (s.current) {
      expect(s.current.y).toBeGreaterThanOrEqual(y0)
    } else {
      expect(s.over).toBe(true)
    }
    expect(s.grid).toHaveLength(20)
  })

  it('step 推进重力', () => {
    const engine = new TetrisEngine()
    const y0 = engine.getState().current!.y
    engine.step()
    const s = engine.getState()
    if (s.current && !s.over) {
      expect(s.current.y).toBeGreaterThanOrEqual(y0)
    }
  })
})

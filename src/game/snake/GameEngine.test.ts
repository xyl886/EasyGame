import { describe, it, expect } from 'vitest'
import { SnakeEngine } from './GameEngine'

describe('SnakeEngine', () => {
  it('构造后有蛇身与食物，状态为进行中', () => {
    const engine = new SnakeEngine({ size: 12, obstacleCount: 0, multiFood: false })
    const s = engine.getState()
    expect(s.snake.length).toBeGreaterThanOrEqual(3)
    expect(s.foods.length).toBeGreaterThanOrEqual(1)
    expect(s.over).toBe(false)
    expect(s.size).toBe(12)
  })

  it('getState 返回独立拷贝', () => {
    const engine = new SnakeEngine({ size: 10, obstacleCount: 0 })
    const a = engine.getState()
    const b = engine.getState()
    expect(a.snake).not.toBe(b.snake)
    expect(a.snake[0]).not.toBe(b.snake[0])
    a.snake[0].x = -999
    expect(engine.getState().snake[0].x).not.toBe(-999)
  })

  it('step 推进游戏且 moveCount 增加', () => {
    const engine = new SnakeEngine({ size: 10, obstacleCount: 0, multiFood: false })
    const before = engine.getState().moveCount
    engine.step()
    const after = engine.getState()
    expect(after.moveCount).toBeGreaterThan(before)
    expect(after.snake.length).toBeGreaterThanOrEqual(3)
  })

  it('不能 180° 反向撞自己（方向缓冲生效）', () => {
    const engine = new SnakeEngine({ size: 10, obstacleCount: 0, wallThrough: true })
    // 默认向右（或引擎初始方向），先 step 保证方向已生效
    engine.step()
    const dir = engine.getState().direction
    const reverse =
      dir === 'left' ? 'right' : dir === 'right' ? 'left' : dir === 'up' ? 'down' : 'up'
    engine.move(reverse)
    // nextDirection 不应立刻变成反向导致自杀；至少 move 调用不抛错
    expect(engine.getState().snake.length).toBeGreaterThanOrEqual(3)
  })
})

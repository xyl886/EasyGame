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

    // 只断言与随机无关的部分。
    // move() 成功后一定会调用 addRandomTile()，新块可以落在**任意空格**、
    // 且值可能是 2 或 4。因此移动后任何"某格为空 / 某值的块有几个 / 某几行为空"
    // 的断言都是 flaky 的（CI 上就是这么挂的），这里一律不做。
    expect(s.grid[0][0]!.value).toBe(4)
    expect(s.grid[0][0]!.isMerged).toBe(true)
    expect(s.score).toBe(4)

    // 合并语义：原本的两个 2 已消失，全盘不该再有孤立的 2 留在第 0 行原位
    // （用"合并出的 4 在 (0,0)"来表达即可，上面已覆盖）
  })

  it('左移把整行合并到左端（与随机新块无关的部分）', () => {
    loadBoard([
      [2, 2, 4, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    expect(engine.move('left')).toBe(true)
    const s = engine.getState()
    // 合并结果必然落在左端两位：2+2=4、4+4=8（两个 2 不会互相吃掉对方的结果）
    expect(s.grid[0][0]!.value).toBe(4)
    expect(s.grid[0][1]!.value).toBe(8)
    expect(s.score).toBe(12)
    // 不要断言 (0,2)/(0,3) 是否为空：合并后这行有**两个**空格，
    // 新块可能落在其中任意一个、也可能落在棋盘其它位置，值还可能是 2 或 4。
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
    const s = engine.getState()
    // undo 恢复的是移动前的快照：分数归零、棋盘回到 [2,2,·,·]。
    // 注意 move() 生成的那个随机新块随快照一起被丢弃，所以这里恢复出来的
    // 两个 2 是确定的——不要再对"随机块"做任何断言。
    expect(s.score).toBe(0)
    expect(s.grid[0][0]!.value).toBe(2)
    expect(s.grid[0][1]!.value).toBe(2)
    expect(s.grid[0][2]).toBeNull()
    expect(s.grid[0][3]).toBeNull()
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

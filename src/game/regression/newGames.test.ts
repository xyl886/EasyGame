import { describe, expect, it } from 'vitest'
import { HashiEngine } from '../hashi/GameEngine'
import { LightsOutEngine } from '../lights-out/GameEngine'
import { MemoryMatchEngine } from '../memory-match/GameEngine'
import { NonogramEngine, nonogramHints } from '../nonogram/GameEngine'
import { OneStrokeEngine } from '../one-stroke/GameEngine'
import { SokobanEngine, type SokobanDirection } from '../sokoban/GameEngine'

function solveLightsOut(size: number, cells: boolean[]): number[] | null {
  const rowMask = (row: number) => {
    let mask = 0
    for (let col = 0; col < size; col++) {
      if (!cells[row * size + col]) mask |= 1 << col
    }
    return mask
  }
  const board = Array.from({ length: size }, (_, row) => rowMask(row))
  const rowLimit = (1 << size) - 1

  for (let firstRow = 0; firstRow <= rowLimit; firstRow++) {
    const presses = new Array<number>(size).fill(0)
    presses[0] = firstRow
    for (let row = 0; row < size - 1; row++) {
      let nextRow = 0
      for (let col = 0; col < size; col++) {
        const bit = 1 << col
        const horizontal = presses[row] ^ ((presses[row] << 1) & rowLimit) ^ (presses[row] >> 1)
        const above = row > 0 ? presses[row - 1] : 0
        if (((board[row] ^ horizontal ^ above) & bit) !== 0) nextRow |= bit
      }
      presses[row + 1] = nextRow
    }

    const last = size - 1
    const finalRow = board[last]
      ^ presses[last]
      ^ ((presses[last] << 1) & rowLimit)
      ^ (presses[last] >> 1)
      ^ (last > 0 ? presses[last - 1] : 0)
    if (finalRow === 0) {
      return presses.flatMap((mask, row) =>
        Array.from({ length: size }, (_, col) => (mask & (1 << col)) !== 0 ? row * size + col : -1),
      ).filter((index) => index >= 0)
    }
  }

  return null
}

describe('记忆翻牌回归', () => {
  it.each([4, 6, 8])('设置 %i 对时使用对应数量的牌并可完整通关', (pairs) => {
    const engine = new MemoryMatchEngine({ pairs })
    expect(engine.getState().cards).toHaveLength(pairs * 2)
    expect(engine.getState().pairCount).toBe(pairs)
    const pairsBySymbol = new Map<string, number[]>()
    for (const card of engine.getState().cards) {
      const indices = pairsBySymbol.get(card.symbol) ?? []
      indices.push(card.id)
      pairsBySymbol.set(card.symbol, indices)
    }
    for (const indices of pairsBySymbol.values()) {
      for (const index of indices) expect(engine.move(index)).toBe(true)
    }
    expect(engine.isWin()).toBe(true)
  })

  it('完整配对后胜利，配错后可翻回', () => {
    const engine = new MemoryMatchEngine()
    const cards = engine.getState().cards
    const firstDifferentPair = [0, cards.findIndex((card) => card.symbol !== cards[0].symbol)]

    expect(engine.move(firstDifferentPair[0])).toBe(true)
    expect(engine.move(firstDifferentPair[1])).toBe(true)
    expect(engine.getState().mismatchPending).toBe(true)
    engine.resolveMismatch()
    expect(engine.getState().cards.every((card) => !card.open || card.matched)).toBe(true)

    const pairs = new Map<string, number[]>()
    for (const card of engine.getState().cards) {
      const indices = pairs.get(card.symbol) ?? []
      indices.push(card.id)
      pairs.set(card.symbol, indices)
    }
    for (const indices of pairs.values()) {
      for (const index of indices) expect(engine.move(index)).toBe(true)
    }

    expect(engine.isWin()).toBe(true)
    expect(engine.isGameOver()).toBe(true)
    expect(engine.getState().pairs).toBe(8)
  })

  it('拒绝越界、重复和已配对的卡片', () => {
    const engine = new MemoryMatchEngine()
    expect(engine.move(-1)).toBe(false)
    expect(engine.move(16)).toBe(false)
    expect(engine.move(Number.NaN)).toBe(false)
    expect(engine.move(0.5)).toBe(false)
    const card = engine.getState().cards[0]
    expect(engine.move(card.id)).toBe(true)
    expect(engine.move(card.id)).toBe(false)
  })
})

describe('点灯谜题回归', () => {
  it.each([3, 5, 7])('支持 %i×%i 棋盘并可从一手局面通关', (size) => {
    const engine = new LightsOutEngine(size)
    expect(engine.getState().cells).toHaveLength(size * size)
    const center = Math.floor(size / 2) * size + Math.floor(size / 2)
    const cells = new Array(size * size).fill(true)
    for (const index of [center, center - size, center + size, center - 1, center + 1]) {
      if (index >= 0 && index < cells.length && Math.abs(Math.floor(index / size) - Math.floor(center / size)) + Math.abs((index % size) - (center % size)) <= 1) {
        cells[index] = false
      }
    }
    engine.loadState({ size, cells, moves: 0, status: 'playing' })
    expect(engine.move(center)).toBe(true)
    expect(engine.isWin()).toBe(true)
  })

  it('点击边角只翻转自身与棋盘内的相邻灯', () => {
    const engine = new LightsOutEngine(5)
    engine.loadState({ size: 5, cells: new Array(25).fill(false), moves: 0, status: 'playing' })

    expect(engine.move(0)).toBe(true)
    const cells = engine.getState().cells
    expect([0, 1, 5].map((index) => cells[index])).toEqual([true, true, true])
    expect(cells.filter(Boolean)).toHaveLength(3)
    expect(engine.move(-1)).toBe(false)
    expect(engine.move(25)).toBe(false)
    expect(engine.move(Number.NaN)).toBe(false)
    expect(engine.move(0.5)).toBe(false)
    expect(new LightsOutEngine(4).getState().size).toBe(5)
  })

  it('一手解局后胜利，重置清空步数', () => {
    const engine = new LightsOutEngine(5)
    const cells = new Array(25).fill(true)
    for (const index of [12, 7, 17, 11, 13]) cells[index] = false
    engine.loadState({ size: 5, cells, moves: 0, status: 'playing' })

    expect(engine.move(12)).toBe(true)
    expect(engine.isWin()).toBe(true)
    engine.reset()
    expect(engine.isWin()).toBe(false)
    expect(engine.getState().moves).toBe(0)
  })

  it.each([3, 5, 7])('随机生成的 %i 阶棋盘始终可解', (size) => {
    const engine = new LightsOutEngine(size)

    for (let attempt = 0; attempt < 8; attempt++) {
      const solution = solveLightsOut(size, engine.getState().cells)
      expect(solution).not.toBeNull()
      for (const index of solution!) expect(engine.move(index)).toBe(true)
      expect(engine.isWin()).toBe(true)
      engine.reset()
    }
  })
})

describe('一笔画回归', () => {
  function edgeKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`
  }

  function findEulerTrail(edges: Array<[number, number]>, current: number, used = new Set<string>()): number[] | null {
    if (used.size === edges.length) return [current]
    for (const [a, b] of edges) {
      const next = a === current ? b : b === current ? a : null
      const key = edgeKey(a, b)
      if (next === null || used.has(key)) continue
      used.add(key)
      const rest = findEulerTrail(edges, next, used)
      if (rest) return [current, ...rest]
      used.delete(key)
    }
    return null
  }

  it('每条边恰好走一次后胜利', () => {
    const engine = new OneStrokeEngine()
    const trail = findEulerTrail(engine.getState().edges, 5)
    expect(trail).not.toBeNull()

    for (const node of trail!) expect(engine.move(node)).toBe(true)

    const state = engine.getState()
    expect(state.status).toBe('won')
    expect(new Set(state.usedEdges).size).toBe(state.edges.length)
  })

  it('拒绝非相邻点且不污染线段记录', () => {
    const engine = new OneStrokeEngine()
    expect(engine.move(0)).toBe(true)
    expect(engine.move(2)).toBe(false)
    expect(engine.move(Number.NaN)).toBe(false)
    expect(engine.getState().usedEdges).toHaveLength(0)
  })

  it('设置端点后只接受指定起点', () => {
    const engine = new OneStrokeEngine(5)
    expect(engine.move(0)).toBe(false)
    expect(engine.getState().current).toBeNull()
    expect(engine.move(5)).toBe(true)
    expect(engine.getState().current).toBe(5)
  })
})

describe('推箱子回归', () => {
  it('可以从设置指定的关卡开始', () => {
    const engine = new SokobanEngine({ startLevel: 2 })
    expect(engine.getState().level).toBe(2)
    engine.setStartLevel(0)
    expect(engine.getState().level).toBe(0)
    engine.setStartLevel(99)
    expect(engine.getState().level).toBe(2)
  })

  it('撤销恢复位置，完成第一关后可以进入下一关', () => {
    const engine = new SokobanEngine()
    const initial = engine.getState()

    expect(engine.move('left')).toBe(true)
    expect(engine.undo()).toBe(true)
    expect(engine.getState()).toEqual(initial)

    expect(engine.move('right')).toBe(true)
    expect(engine.move('right')).toBe(true)
    expect(engine.isWin()).toBe(true)
    expect(engine.nextLevel()).toBe(true)
    expect(engine.getState().level).toBe(1)
    expect(engine.getState().moves).toBe(0)
  })

  it('第二、三关的内置布局都可以完成', () => {
    const second = new SokobanEngine({ startLevel: 1 })
    for (const direction of ['up', 'down', 'down'] as const) expect(second.move(direction)).toBe(true)
    expect(second.isWin()).toBe(true)

    const third = new SokobanEngine({ startLevel: 2 })
    for (const direction of ['up', 'right', 'down', 'left', 'left', 'up', 'down', 'left', 'up'] as const) {
      expect(third.move(direction)).toBe(true)
    }
    expect(third.isWin()).toBe(true)
  })

  it('重置恢复当前关卡，非法移动不增加步数', () => {
    const engine = new SokobanEngine()
    expect(engine.move('left')).toBe(true)
    expect(engine.move('left')).toBe(false)
    expect(engine.getState().moves).toBe(1)
    expect(engine.move('diagonal' as SokobanDirection)).toBe(false)
    engine.reset()
    expect(engine.getState().moves).toBe(0)
    expect(engine.getState().player).toBe(16)
  })
})

describe('数织回归', () => {
  it('可以选定题目，并在重置时保留当前题目', () => {
    const engine = new NonogramEngine()
    engine.selectPuzzle(3)
    expect(engine.getState().puzzleId).toBe('cup')
    engine.move([0, 0])
    engine.reset()
    expect(engine.getState().puzzleId).toBe('cup')
    expect(engine.getState().moves).toBe(0)
  })

  it('线索准确处理连续段与空行空列', () => {
    expect(nonogramHints([false, false, false])).toEqual([0])
    expect(nonogramHints([true, true, false, true, false, true, true, true])).toEqual([2, 1, 3])
  })

  it('拒绝小数和 NaN 坐标', () => {
    const engine = new NonogramEngine()
    expect(engine.move([Number.NaN, 0])).toBe(false)
    expect(engine.move([0, 0.5])).toBe(false)
    expect(engine.getState().moves).toBe(0)
  })

  it('按谜题解答涂格后胜利，标记模式与填色互斥', () => {
    const engine = new NonogramEngine()
    const state = engine.getState()
    const size = Math.sqrt(state.solution.length)

    engine.toggleMarkMode()
    expect(engine.move([0, 0])).toBe(true)
    expect(engine.getState().marked[0]).toBe(true)
    expect(engine.getState().filled[0]).toBe(false)

    engine.toggleMarkMode()
    for (let index = 0; index < state.solution.length; index++) {
      if (state.solution[index]) expect(engine.move([Math.floor(index / size), index % size])).toBe(true)
    }

    expect(engine.isWin()).toBe(true)
    expect(engine.isGameOver()).toBe(true)
    engine.nextPuzzle()
    expect(engine.isWin()).toBe(false)
    expect(engine.getState().puzzleId).not.toBe(state.puzzleId)
  })

  it('四幅图案都能按生成答案通关', () => {
    const engine = new NonogramEngine()
    for (let puzzleIndex = 0; puzzleIndex < 4; puzzleIndex++) {
      if (puzzleIndex > 0) engine.nextPuzzle()
      const state = engine.getState()
      const size = Math.sqrt(state.solution.length)
      state.solution.forEach((filled, index) => {
        if (filled) engine.move([Math.floor(index / size), index % size])
      })
      expect(engine.isWin(), state.puzzleName).toBe(true)
    }
  })
})

describe('桥接谜题回归', () => {
  const solutions: Array<Array<[number, number]>> = [
    [[0, 1], [1, 2]],
    [[0, 1], [1, 2]],
    [[0, 1], [1, 2], [1, 3], [3, 4]],
    [[0, 1], [1, 2], [2, 3]],
  ]

  it('四道内置题都可连通且每座岛满足数字', () => {
    const engine = new HashiEngine()

    for (let puzzleIndex = 0; puzzleIndex < solutions.length; puzzleIndex++) {
      if (puzzleIndex > 0) engine.nextPuzzle()
      for (const [from, to] of solutions[puzzleIndex]) {
        expect(engine.move(from)).toBe(true)
        expect(engine.move(to)).toBe(true)
      }
      expect(engine.isWin(), `第 ${puzzleIndex + 1} 题`).toBe(true)
      expect(engine.getState().status).toBe('won')
    }
  })

  it('可以从设置指定的题目开始，重置保留当前题目', () => {
    const engine = new HashiEngine(2)
    expect(engine.getState().puzzleIndex).toBe(2)
    engine.move(0)
    engine.reset()
    expect(engine.getState().puzzleIndex).toBe(2)
    expect(engine.getState().bridges).toEqual({})
  })

  it('不可见的岛屿不能架桥，重新选择仍可继续操作', () => {
    const engine = new HashiEngine()
    engine.move(0)
    engine.move(2)
    expect(engine.getState().bridges).toEqual({})
    expect(engine.getState().selected).toBe(2)
  })
})

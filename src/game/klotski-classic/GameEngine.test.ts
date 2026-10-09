import { beforeEach, describe, expect, it } from 'vitest'
import { ClassicKlotskiEngine } from './GameEngine'
import { LEVELS } from './levels'
import type { ClassicDirection } from './types'

const demoDirections: Record<number, ClassicDirection> = {
  1: 'up',
  2: 'right',
  3: 'down',
  4: 'left',
}

describe('ClassicKlotskiEngine', () => {
  beforeEach(() => localStorage.clear())

  it.each(LEVELS)('$name 的内置演示步骤可以完整通关', (level) => {
    const engine = new ClassicKlotskiEngine({ layout: level.id })

    for (const code of level.steps) {
      const pieceId = Math.floor(code / 10)
      const direction = demoDirections[code % 10]
      expect(direction, `${level.id} 的演示步骤 ${code} 方向有效`).toBeDefined()
      expect(engine.demoMove(pieceId, direction), `${level.id} 的演示步骤 ${code} 合法`).toBe(true)
    }

    expect(engine.isWin(), `${level.id} 应能通关`).toBe(true)
    expect(engine.isGameOver()).toBe(true)
    expect(engine.getState().moves).toBe(level.steps.length)
  })

  it('加载存档后棋子状态一致，重置恢复当前布局', () => {
    const engine = new ClassicKlotskiEngine({ layout: LEVELS[0].id })
    const initial = engine.getState()
    const legalMove = engine.movablePieces()[0]

    expect(engine.demoMove(legalMove.pieceId, legalMove.dir)).toBe(true)
    const snapshot = engine.getState()
    const restored = new ClassicKlotskiEngine({ layout: LEVELS[0].id })
    restored.loadState(snapshot)
    expect(restored.getState().pieces).toEqual(snapshot.pieces)
    expect(restored.getState().moves).toBe(snapshot.moves)

    engine.reset()
    expect(engine.getState().pieces).toEqual(initial.pieces)
    expect(engine.getState().moves).toBe(0)
  })
})

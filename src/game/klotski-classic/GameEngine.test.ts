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

  it.each(LEVELS.filter((level) => level.steps.length > 0))(
    '$name 的内置演示步骤可以完整通关',
    (level) => {
      const engine = new ClassicKlotskiEngine({ layout: level.id })

      for (const code of level.steps) {
        const pieceId = Math.floor(code / 10)
        const direction = demoDirections[code % 10]
        expect(direction, `${level.id} 的演示步骤 ${code} 方向有效`).toBeDefined()
        expect(engine.demoMove(pieceId, direction), `${level.id} 的演示步骤 ${code} 合法`).toBe(
          true,
        )
      }

      expect(engine.isWin(), `${level.id} 应能通关`).toBe(true)
      expect(engine.isGameOver()).toBe(true)
      expect(engine.getState().moves).toBe(level.steps.length)
    },
  )

  it('“走投无路”未提供演示解法时仍能正常载入', () => {
    const level = LEVELS.find((item) => item.id === '走投无路')!
    const engine = new ClassicKlotskiEngine({ layout: level.id })

    expect(level.steps).toHaveLength(0)
    expect(engine.getState().layout).toBe(level.id)
    expect(engine.isWin()).toBe(false)
  })

  it('加载存档后棋子状态一致，重置恢复当前布局', () => {
    const engine = new ClassicKlotskiEngine({ layout: LEVELS[0].id })
    const initial = engine.getState()
    const firstPiece = initial.pieces.find((piece) => engine.movableDirs(piece.id).length > 0)!
    const firstDirection = engine.movableDirs(firstPiece.id)[0]

    expect(engine.demoMove(firstPiece.id, firstDirection)).toBe(true)
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

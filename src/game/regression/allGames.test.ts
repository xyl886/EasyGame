import { beforeEach, describe, expect, it } from 'vitest'
import type { BaseGame } from '../base/BaseGame'
import { Game2048Engine } from '../2048/GameEngine'
import { EliminateEngine } from '../eliminate/GameEngine'
import { HashiEngine } from '../hashi/GameEngine'
import { ClassicKlotskiEngine } from '../klotski-classic/GameEngine'
import { KlotskiEngine } from '../klotski/GameEngine'
import { LianliankanEngine } from '../lianliankan/GameEngine'
import { LightsOutEngine } from '../lights-out/GameEngine'
import { MemoryMatchEngine } from '../memory-match/GameEngine'
import { MinesweeperEngine } from '../minesweeper/GameEngine'
import { NonogramEngine } from '../nonogram/GameEngine'
import { NumberChainEngine } from '../numberchain/GameEngine'
import { OneStrokeEngine } from '../one-stroke/GameEngine'
import { SnakeEngine } from '../snake/GameEngine'
import { SokobanEngine } from '../sokoban/GameEngine'
import { SudokuEngine } from '../sudoku/GameEngine'
import { TetrisEngine } from '../tetris/GameEngine'
import { gameRegistry } from '../registry'

interface EngineCase {
  id: string
  roundTrip(): {
    originalState: unknown
    restoredState: unknown
    originalScore: number
    restoredScore: number
  }
  reset(): { isGameOver: boolean; isWin: boolean; score: number }
  initial(): { state: unknown; isGameOver: boolean; isWin: boolean; score: number }
}

function engineCase<State, Move>(id: string, create: () => BaseGame<State, Move>): EngineCase {
  return {
    id,
    roundTrip() {
      const original = create()
      const snapshot = original.getState()
      const restored = create()
      restored.loadState(snapshot)
      return {
        originalState: snapshot,
        restoredState: restored.getState(),
        originalScore: original.getScore(),
        restoredScore: restored.getScore(),
      }
    },
    reset() {
      const engine = create()
      engine.reset()
      return { isGameOver: engine.isGameOver(), isWin: engine.isWin(), score: engine.getScore() }
    },
    initial() {
      const engine = create()
      return {
        state: engine.getState(),
        isGameOver: engine.isGameOver(),
        isWin: engine.isWin(),
        score: engine.getScore(),
      }
    },
  }
}

const engines: EngineCase[] = [
  engineCase('2048', () => new Game2048Engine()),
  engineCase('tetris', () => new TetrisEngine()),
  engineCase('minesweeper', () => new MinesweeperEngine()),
  engineCase('sudoku', () => new SudokuEngine()),
  engineCase('snake', () => new SnakeEngine()),
  engineCase('klotski', () => new KlotskiEngine()),
  engineCase('lianliankan', () => new LianliankanEngine()),
  engineCase('eliminate', () => new EliminateEngine()),
  engineCase('numberchain', () => new NumberChainEngine()),
  engineCase('klotski-classic', () => new ClassicKlotskiEngine()),
  engineCase('memory-match', () => new MemoryMatchEngine()),
  engineCase('lights-out', () => new LightsOutEngine()),
  engineCase('one-stroke', () => new OneStrokeEngine()),
  engineCase('sokoban', () => new SokobanEngine()),
  engineCase('nonogram', () => new NonogramEngine()),
  engineCase('hashi', () => new HashiEngine()),
]

describe('游戏回归覆盖清单', () => {
  it('每个已注册游戏都有引擎契约用例', () => {
    expect(new Set(engines.map((engine) => engine.id))).toEqual(new Set(gameRegistry.map((game) => game.id)))
  })
})

describe.each(engines)('$id 全游戏引擎契约', ({ initial, roundTrip, reset }) => {
  beforeEach(() => localStorage.clear())

  it('初始化时提供可用状态、布尔终局标记和有限分数', () => {
    const result = initial()

    expect(result.state).toBeDefined()
    expect(typeof result.isGameOver).toBe('boolean')
    expect(typeof result.isWin).toBe('boolean')
    expect(Number.isFinite(result.score)).toBe(true)
  })

  it('状态可以保存并恢复，恢复后结果一致', () => {
    const result = roundTrip()
    expect(result.restoredState).toEqual(result.originalState)
    expect(result.restoredScore).toBe(result.originalScore)
  })

  it('重置后返回可继续游玩的非终局状态', () => {
    const result = reset()

    expect(result.isGameOver).toBe(false)
    expect(result.isWin).toBe(false)
    expect(Number.isFinite(result.score)).toBe(true)
  })
})

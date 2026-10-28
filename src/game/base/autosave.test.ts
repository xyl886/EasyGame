import { beforeEach, describe, expect, it } from 'vitest'
import { StorageAdapter } from '../../adapters/StorageAdapter'
import { Game2048Engine } from '../2048/GameEngine'
import { EliminateEngine } from '../eliminate/GameEngine'
import { ClassicKlotskiEngine } from '../klotski-classic/GameEngine'
import { KlotskiEngine } from '../klotski/GameEngine'
import { LianliankanEngine } from '../lianliankan/GameEngine'
import { MinesweeperEngine } from '../minesweeper/GameEngine'
import { SnakeEngine } from '../snake/GameEngine'
import { SudokuEngine } from '../sudoku/GameEngine'
import { TetrisEngine } from '../tetris/GameEngine'
import {
  isClassicAutosave,
  isEliminateAutosave,
  isGame2048Autosave,
  isKlotskiAutosave,
  isLianliankanAutosave,
  isMinesweeperAutosave,
  isSnakeAutosave,
  isSudokuAutosave,
  isTetrisAutosave,
} from './autosaveGuards'
import { autosaveKey, clearAutosave, loadAutosave, saveAutosave } from '../../utils/autosave'

const guardCases = [
  { id: '2048', create: () => new Game2048Engine().getState(), guard: isGame2048Autosave },
  { id: '俄罗斯方块', create: () => new TetrisEngine().getState(), guard: isTetrisAutosave },
  { id: '扫雷', create: () => new MinesweeperEngine().getState(), guard: isMinesweeperAutosave },
  { id: '数独', create: () => new SudokuEngine().getState(), guard: isSudokuAutosave },
  { id: '贪吃蛇', create: () => new SnakeEngine().getState(), guard: isSnakeAutosave },
  { id: '数字华容道', create: () => new KlotskiEngine().getState(), guard: isKlotskiAutosave },
  { id: '连连看', create: () => new LianliankanEngine().getState(), guard: isLianliankanAutosave },
  { id: '消消乐', create: () => new EliminateEngine().getState(), guard: isEliminateAutosave },
  {
    id: '三国华容道',
    create: () => new ClassicKlotskiEngine().getState(),
    guard: isClassicAutosave,
  },
]

function isScoreState(value: unknown): value is { score: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'score' in value &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score)
  )
}

describe('已接入自动存档的游戏结构校验', () => {
  beforeEach(() => localStorage.clear())

  it.each(guardCases)('$id 当前引擎状态可通过校验，空值与错误类型会被拒绝', ({ create, guard }) => {
    expect(guard(create())).toBe(true)
    expect(guard(null)).toBe(false)
    expect(guard({ invalid: true })).toBe(false)
  })
})

describe('自动存档版本与兼容', () => {
  beforeEach(() => localStorage.clear())

  it('新存档写入版本封套并通过守卫恢复', () => {
    saveAutosave('regression', { score: 42 })

    expect(StorageAdapter.get(autosaveKey('regression'))).toMatchObject({
      kind: 'easygame-autosave',
      version: 1,
      state: { score: 42 },
    })
    expect(loadAutosave('regression', isScoreState)).toEqual({ score: 42 })
  })

  it('兼容读取旧版原始状态并拒绝损坏或未知版本', () => {
    StorageAdapter.set(autosaveKey('legacy'), { score: 7 })
    expect(loadAutosave('legacy', isScoreState)).toEqual({ score: 7 })

    StorageAdapter.set(autosaveKey('future'), {
      kind: 'easygame-autosave',
      version: 2,
      state: { score: 9 },
    })
    expect(loadAutosave('future', isScoreState)).toBeNull()

    StorageAdapter.set(autosaveKey('invalid'), {
      kind: 'easygame-autosave',
      version: 1,
      state: null,
    })
    expect(loadAutosave('invalid', isScoreState)).toBeNull()
  })

  it('清除存档后无法恢复', () => {
    saveAutosave('clear-me', { score: 1 })
    clearAutosave('clear-me')
    expect(loadAutosave('clear-me', isScoreState)).toBeNull()
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { MinesweeperEngine } from './GameEngine'
import { MINE_PRESETS } from './types'

describe('MinesweeperEngine', () => {
  beforeEach(() => {
    // noop — 每例新建
  })

  it('首击安全：点击格及其 3×3 邻域无雷且已翻开', () => {
    const engine = new MinesweeperEngine({ difficulty: 'beginner' })
    const p = MINE_PRESETS.beginner
    const target = 4 * p.cols + 4
    engine.move(target)
    const s = engine.getState()
    expect(s.status).toBe('playing')
    const cells = s.cells
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = 4 + dr
        const c = 4 + dc
        if (r < 0 || r >= p.rows || c < 0 || c >= p.cols) continue
        const cell = cells[r * p.cols + c]
        expect(cell.isMine).toBe(false)
        expect(cell.revealed).toBe(true)
      }
    }
  })

  it('雷数与预设一致（布雷后）', () => {
    const engine = new MinesweeperEngine({ difficulty: 'beginner' })
    engine.move(0)
    const s = engine.getState()
    const mineCount = s.cells.filter((c) => c.isMine).length
    expect(mineCount).toBe(MINE_PRESETS.beginner.mines)
  })

  it('初态 ready，未布雷', () => {
    const engine = new MinesweeperEngine({ difficulty: 'beginner' })
    const s = engine.getState()
    expect(s.status).toBe('ready')
    expect(s.cells.every((c) => !c.isMine)).toBe(true)
  })
})

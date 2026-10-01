import { describe, it, expect } from 'vitest'
import { Merge1024Engine } from './GameEngine'
import type { Merge1024State } from './types'
import { chainMultiplier, levelTarget, MERGE1024_PRESETS, initialBoard, spawnPoolForMax, spawnWeightsForMax } from './types'

/** 构造可预测盘面的引擎：用 loadState 覆盖。 */
function engineWithGrid(grid: number[][], level = 1, difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
  const e = new Merge1024Engine({ difficulty, level })
  const s: Merge1024State = {
    rows: grid.length,
    cols: grid[0].length,
    grid: grid.map((r) => [...r]),
    chainPath: null,
    hintPath: null,
    score: 0,
    bestScore: 0,
    target: levelTarget(level, MERGE1024_PRESETS[difficulty]),
    maxTile: 0,
    movesLeft: 100,
    maxCombo: 0,
    startTime: 0,
    status: 'playing',
    difficulty,
    theme: 'classic',
    level,
    undoLeft: 3,
  }
  e.loadState(s)
  return e
}

/**
 * 稳定棋盘：每行一种主值 + 少量异值，保证「2 连/3 连测试的合并点」四周无同数，
 * 从而不触发意外连锁。第 0 行 2 2 2 用于 3 连；列结构保证重力后结论可预测。
 */
function stableGrid(): number[][] {
  return [
    [2, 2, 2, 16, 32, 64, 128],
    [4, 8, 8, 16, 32, 64, 128],
    [8, 8, 8, 16, 32, 64, 128],
    [16, 16, 16, 16, 32, 64, 128],
    [32, 32, 32, 16, 32, 64, 128],
    [64, 64, 64, 16, 32, 64, 128],
    [128, 128, 128, 16, 32, 64, 128],
  ]
}

describe('Merge1024Engine', () => {
  it('构造后有占满的合法棋盘与目标数字', () => {
    const e = new Merge1024Engine({ difficulty: 'normal', level: 1 })
    const s = e.getState()
    expect(s.grid.flat().every((v) => v > 0)).toBe(true)
    expect(s.rows * s.cols).toBe(49)
    expect(s.movesLeft).toBeGreaterThan(0)
    expect(s.target).toBe(16)
    expect(s.status).toBe('playing')
  })

  it('开局铺底 < 目标，不会「连一步就胜」（各关均成立）', () => {
    for (let lv = 1; lv <= 7; lv++) {
      const e = new Merge1024Engine({ difficulty: 'normal', level: lv })
      const s = e.getState()
      expect(s.maxTile).toBeLessThan(s.target)
      expect(s.grid.flat().every((v) => v < s.target)).toBe(true)
      expect(s.status).toBe('playing')
    }
  })

  it('getState 返回独立 grid 拷贝', () => {
    const e = new Merge1024Engine()
    const a = e.getState()
    const b = e.getState()
    expect(a.grid).not.toBe(b.grid)
    a.grid[0][0] = 999
    expect(e.getState().grid[0][0]).not.toBe(999)
  })

  it('2 连求和：2+2 → 4，得分 = 4（2 格 ×1），消耗 1 步', () => {
    const e = engineWithGrid(stableGrid())
    e.beginChain(0, 0)
    e.extendChain(0, 1)
    expect(e.commitChain()).toBe(true)
    const s = e.getState()
    expect(s.score).toBe(4)
    expect(s.movesLeft).toBe(99)
  })

  it('3 连求和 ×2：2+2+2=6 → 得分 12', () => {
    const e = engineWithGrid(stableGrid())
    e.beginChain(0, 0)
    e.extendChain(0, 1)
    expect(e.extendChain(0, 2)).toBe(true)
    expect(e.commitChain()).toBe(true)
    expect(e.getState().score).toBe(12)
  })

  it('非法延伸：异值/非相邻/重复格被拒绝，单格提交无效', () => {
    const e = engineWithGrid(stableGrid())
    e.beginChain(0, 0)
    expect(e.extendChain(0, 2)).toBe(false) // 非相邻（跳格）
    expect(e.extendChain(1, 0)).toBe(false) // 异值（4）
    e.extendChain(0, 1)
    expect(e.extendChain(0, 0)).toBe(false) // 重复格
    const before = e.getState().movesLeft
    e.beginChain(5, 0)
    expect(e.commitChain()).toBe(false) // 单格无效
    expect(e.getState().movesLeft).toBe(before)
    e.beginChain(0, 0)
    e.extendChain(0, 1)
    e.commitChain()
    expect(e.getState().movesLeft).toBe(before - 1)
  })

  it('自动连锁：2+2=4，旁有 4 → 连锁成 8，连击 +1', () => {
    const grid: number[][] = []
    for (let r = 0; r < 7; r++) grid.push([2, 2, 4, 4, 8, 8, 16])
    const e = engineWithGrid(grid)
    e.beginChain(0, 0)
    e.extendChain(0, 1)
    e.commitChain()
    const s = e.getState()
    expect(s.maxCombo).toBe(2)
    expect(s.score).toBe(4 + 8) // 主链 4 + 连锁 8×1
  })

  it('连锁收敛：全盘 2 连一行 7 个 → 求和 14，无同数邻居正常结束', () => {
    const grid: number[][] = []
    for (let r = 0; r < 7; r++) grid.push([2, 2, 2, 2, 2, 2, 2])
    const e = engineWithGrid(grid)
    for (let c = 0; c < 7; c++) {
      if (c === 0) e.beginChain(0, 0)
      else e.extendChain(0, c)
    }
    expect(e.commitChain()).toBe(true)
    expect(e.getState().status).toBe('playing')
    expect(e.lastCascade.length).toBeGreaterThanOrEqual(1)
  })

  it('达成目标数字 → 胜利', () => {
    const grid: number[][] = []
    for (let r = 0; r < 7; r++) grid.push([16, 16, 16, 16, 16, 16, 16])
    const e = engineWithGrid(grid)
    for (let c = 0; c < 7; c++) {
      if (c === 0) e.beginChain(3, 0)
      else e.extendChain(3, c)
    }
    e.commitChain()
    expect(e.getState().status).toBe('won')
  })

  it('步数用尽 → 失败（合并值未达目标）', () => {
    const grid: number[][] = []
    for (let r = 0; r < 7; r++) grid.push([2, 2, 2, 2, 2, 2, 2])
    const e = engineWithGrid(grid)
    e.loadState({ ...e.getState(), movesLeft: 1 })
    e.beginChain(0, 0)
    e.extendChain(0, 1)
    e.commitChain()
    expect(e.getState().status).toBe('lost')
  })

  it('撤销：恢复盘面与分数', () => {
    const e = engineWithGrid(stableGrid())
    const before = e.getState()
    e.beginChain(0, 0)
    e.extendChain(0, 1)
    e.commitChain()
    expect(e.getState().score).toBeGreaterThan(before.score)
    expect(e.canUndo()).toBe(true)
    expect(e.undo()).toBe(true)
    const after = e.getState()
    expect(after.score).toBe(before.score)
    expect(after.grid).toEqual(before.grid)
  })

  it('提示能找到 ≥2 的连线', () => {
    const e = new Merge1024Engine({ difficulty: 'normal', level: 1 })
    expect(e.hintNow()).toBe(true)
    const h = e.getHint()
    expect(h && h.length >= 2).toBe(true)
  })
})

describe('merge1024 常量', () => {
  it('chainMultiplier 封顶', () => {
    expect(chainMultiplier(2)).toBe(1)
    expect(chainMultiplier(3)).toBe(2)
    expect(chainMultiplier(5)).toBe(4)
    expect(chainMultiplier(8)).toBe(5)
  })

  it('levelTarget 每关翻倍至难度终局', () => {
    const p = MERGE1024_PRESETS.normal
    expect(levelTarget(1, p)).toBe(16)
    expect(levelTarget(2, p)).toBe(32)
    expect(levelTarget(7, p)).toBe(1024)
    expect(levelTarget(99, p)).toBe(1024)
  })

  it('initialBoard 总数 = rows×cols 且均为 2 的幂', () => {
    const cells = initialBoard(7, 7)
    expect(cells).toHaveLength(49)
    for (const v of cells) {
      expect(v & (v - 1)).toBe(0)
    }
  })

  it('initialBoard(maxAllowed) 限制铺底不超过该值', () => {
    const cells = initialBoard(7, 7, 8)
    expect(cells).toHaveLength(49)
    for (const v of cells) {
      expect(v).toBeLessThanOrEqual(8)
      expect(v & (v - 1)).toBe(0)
    }
  })

  it('spawnPoolForMax 与 spawnWeightsForMax 长度一致（避免 8 永不补充）', () => {
    for (const max of [2, 4, 7, 8, 16, 31, 32, 64, 128, 256, 512, 1024]) {
      expect(spawnPoolForMax(max)).toHaveLength(spawnWeightsForMax(max).length)
    }
  })
})

import { describe, it, expect } from 'vitest'
import { NumberChainEngine } from './GameEngine'
import { isAdjacent } from './types'

/** 在棋盘上找出某个数字的坐标 */
function findValue(grid: number[][], v: number): { r: number; c: number } {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === v) return { r, c }
    }
  }
  throw new Error(`值 ${v} 不在棋盘上`)
}

describe('NumberChainEngine', () => {
  it('构造后棋盘合法且从 1 开始', () => {
    const engine = new NumberChainEngine()
    const s = engine.getState()
    expect(s.size).toBeGreaterThanOrEqual(4)
    expect(s.grid).toHaveLength(s.size)
    expect(s.next).toBe(1)
    expect(s.status).toBe('playing')
    // 棋盘恰好包含 1..N² 各一次
    const values = s.grid.flat().sort((a, b) => a - b)
    expect(values[0]).toBe(1)
    expect(values[values.length - 1]).toBe(s.size * s.size)
    expect(new Set(values).size).toBe(s.size * s.size)
  })

  it('getState 返回独立 grid', () => {
    const engine = new NumberChainEngine()
    const a = engine.getState()
    const b = engine.getState()
    expect(a.grid).not.toBe(b.grid)
    a.grid[0][0] = -1
    expect(engine.getState().grid[0][0]).not.toBe(-1)
  })

  it('每局布局都不一样：起点随机 + 路径形状不重复', () => {
    // 这是曾经的严重回归：生成器里没有任何随机，导致 60 次生成只有 1 种形状、
    // ① 永远在左上角，玩家反映"每盘走线都一个样"。用本测试锁住多样性。
    const shapes = new Set<string>()
    const starts = new Set<string>()
    const N = 40
    for (let i = 0; i < N; i++) {
      const engine = new NumberChainEngine({ difficulty: 'normal', level: 4 }) // 8×8
      const { grid, size } = engine.getState()
      expect(size).toBe(8)
      // ① 的落点
      const p1 = findValue(grid, 1)
      starts.add(`${p1.r},${p1.c}`)
      // 路径形状签名：每一步的相对方向
      let sig = ''
      for (let v = 1; v < size * size; v++) {
        const a = findValue(grid, v)
        const b = findValue(grid, v + 1)
        sig += `${b.r - a.r + 1}${b.c - a.c + 1}`
      }
      shapes.add(sig)
    }
    // 形状应几乎两两不同。8×8 的路径空间虽大但仍可能偶发撞车
    // （实测 40 局里偶尔 38~39 种），所以阈值留出余量，避免测试本身 flaky；
    // 关键是它绝不能退化成"只有 1~2 种形状"（那才是真正的回归）。
    expect(shapes.size).toBeGreaterThanOrEqual(30)
    // ① 必须能落在多个不同位置，而不是永远左上角
    expect(starts.size).toBeGreaterThanOrEqual(5)
  })

  it('起点不会固定在左上角', () => {
    const starts = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 }) // 4×4
      const { grid } = engine.getState()
      const p1 = findValue(grid, 1)
      starts.add(`${p1.r},${p1.c}`)
    }
    // 4×4 共 16 格，30 次里至少应出现过多个不同起点；绝不能恒为 (0,0)
    expect(starts.size).toBeGreaterThan(1)
  })

  it('生成的棋盘保证 1→2→…→N 全部相邻（可解性）', () => {
    // 多难度 × 多关卡重复验证
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      for (let level = 1; level <= 4; level++) {
        for (let trial = 0; trial < 5; trial++) {
          const engine = new NumberChainEngine({ difficulty, level })
          const { grid, size } = engine.getState()
          for (let v = 1; v < size * size; v++) {
            expect(isAdjacent(findValue(grid, v), findValue(grid, v + 1))).toBe(true)
          }
        }
      }
    }
  })

  it('无尽模式大棋盘（16×16）也全程相邻', () => {
    for (let trial = 0; trial < 3; trial++) {
      const engine = new NumberChainEngine({ difficulty: 'hard', mode: 'endless', level: 13 })
      const { grid, size } = engine.getState()
      expect(size).toBe(16)
      for (let v = 1; v < size * size; v++) {
        expect(isAdjacent(findValue(grid, v), findValue(grid, v + 1))).toBe(true)
      }
    }
  })

  it('局部聚集：连续数字挨得足够近，玩家能找到下一个', () => {
    // 关键可玩性指标：从 ① 出发，② 必须就在它旁边（周围 8 格内），
    // 而不是隔着十几格空白。统计 1→2 的实际切比雪夫距离，必须恒为 1。
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      for (let level = 1; level <= 5; level++) {
        for (let trial = 0; trial < 4; trial++) {
          const engine = new NumberChainEngine({ difficulty, level })
          const { grid, size } = engine.getState()
          for (let v = 1; v < size * size; v++) {
            const a = findValue(grid, v)
            const b = findValue(grid, v + 1)
            const cheb = Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c))
            expect(cheb).toBe(1)
          }
        }
      }
    }
  })

  it('局部聚集：连续数字构成的簇总体紧凑（统计多次，避免单局偶然）', () => {
    // 注意：不能用"单局外接框 ≤4"来断言——生成带随机性，单局可能是 5 或 6，
    // 那样测试会 flaky。这里改看**统计特征**：多数局应落在 4×4 内。
    const boxes: number[] = []
    for (let t = 0; t < 60; t++) {
      const engine = new NumberChainEngine({ difficulty: 'normal', level: 4 }) // 8×8
      const { grid, size } = engine.getState()
      expect(size).toBe(8)
      let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity
      for (let v = 1; v <= 9; v++) {
        const p = findValue(grid, v)
        minR = Math.min(minR, p.r); maxR = Math.max(maxR, p.r)
        minC = Math.min(minC, p.c); maxC = Math.max(maxC, p.c)
      }
      boxes.push(Math.max(maxR - minR + 1, maxC - minC + 1))
    }
    const within4 = boxes.filter((b) => b <= 4).length
    const avg = boxes.reduce((a, b) => a + b, 0) / boxes.length
    // 实测 BLOCK_SIZE=4 时约 52% 落在 4×4、平均 ~5.2。阈值取宽松些防止偶发抖动。
    expect(within4).toBeGreaterThanOrEqual(20)
    expect(avg).toBeLessThanOrEqual(6.5)
  })

  it('按 1→2→… 依次 move 推进 next', () => {
    const engine = new NumberChainEngine()
    const s0 = engine.getState()
    const pos1 = findValue(s0.grid, 1)
    engine.move(pos1)
    expect(engine.getState().next).toBe(2)

    const s1 = engine.getState()
    const pos2 = findValue(s1.grid, 2)
    engine.move(pos2)
    expect(engine.getState().next).toBe(3)
  })

  it('相邻约束：非相邻的下一数连不上，但不给任何反馈（不计数）', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 })
    const s0 = engine.getState()
    const pos1 = findValue(s0.grid, 1)
    expect(engine.startAt(pos1.r, pos1.c)).toBe(true)
    expect(engine.getState().next).toBe(2)

    // 生成保证 1→2 相邻
    const s1 = engine.getState()
    const pos2 = findValue(s1.grid, 2)
    expect(isAdjacent(pos1, pos2)).toBe(true)
    expect(engine.extendTo(pos2.r, pos2.c)).toBe('locked')
    expect(engine.getState().next).toBe(3)

    // 找一个离 2 距离 >1 的格子：撞上去应静默忽略、目标不推进。
    // 注意这里**不再断言失误计数**——该机制已整个移除。
    const s2 = engine.getState()
    let far: { r: number; c: number } | null = null
    for (let r = 0; r < s2.size && !far; r++) {
      for (let c = 0; c < s2.size; c++) {
        if (Math.abs(r - pos2.r) > 1 || Math.abs(c - pos2.c) > 1) {
          far = { r, c }
          break
        }
      }
    }
    expect(far).not.toBeNull()
    expect(engine.extendTo(far!.r, far!.c)).toBe('ignored')
    expect(engine.getState().next).toBe(3)
    expect(engine.getState().committed).toHaveLength(2)
  })

  it('相邻的下一数可以正常锁定（拖动路径）', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 })
    const { grid } = engine.getState()
    const pos1 = findValue(grid, 1)
    engine.startAt(pos1.r, pos1.c)
    const pos2 = findValue(grid, 2)
    expect(engine.extendTo(pos2.r, pos2.c)).toBe('locked')
    const pos3 = findValue(grid, 3)
    expect(engine.extendTo(pos3.r, pos3.c)).toBe('locked')
    expect(engine.getState().next).toBe(4)
  })

  it('撤回 undo：退掉最后一步并回退目标', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 })
    const { grid } = engine.getState()
    const pos1 = findValue(grid, 1)
    engine.startAt(pos1.r, pos1.c)
    const pos2 = findValue(grid, 2)
    engine.extendTo(pos2.r, pos2.c)
    expect(engine.getState().next).toBe(3)
    expect(engine.canUndo()).toBe(true)

    expect(engine.undo()).toBe(true)
    const s = engine.getState()
    expect(s.next).toBe(2)
    expect(s.committed).toHaveLength(1)
  })

  it('清空 clearChain：回到只连了 ①', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 })
    const { grid } = engine.getState()
    engine.startAt(findValue(grid, 1).r, findValue(grid, 1).c)
    engine.extendTo(findValue(grid, 2).r, findValue(grid, 2).c)
    engine.extendTo(findValue(grid, 3).r, findValue(grid, 3).c)
    expect(engine.getState().committed).toHaveLength(3)

    expect(engine.clearChain()).toBe(true)
    const s = engine.getState()
    expect(s.committed).toHaveLength(1)
    expect(s.next).toBe(2)
  })

  it('空白格：按难度显示一部分，① 保底可见', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const engine = new NumberChainEngine({ difficulty, level: 1 })
      const s = engine.getState()
      const total = s.size * s.size
      const shown = s.revealed.flat().filter(Boolean).length
      // 必然是"部分显示"
      expect(shown).toBeLessThan(total)
      expect(shown).toBeGreaterThan(0)
      // ① 始终可见
      const p1 = findValue(s.grid, 1)
      expect(s.revealed[p1.r][p1.c]).toBe(true)
    }
  })

  it('难度决定显示比例：同尺寸棋盘下 简单 > 普通 > 困难', () => {
    // 三档起始尺寸不同，要比较"显示得多不多"必须固定同一棋盘尺寸，
    // 所以统一用 8×8（简单/普通/困难分别在第 5/4/3 关达到 8×8）。
    const levelFor8 = { easy: 5, normal: 4, hard: 3 } as const
    const shownOf = (d: 'easy' | 'normal' | 'hard') => {
      const e = new NumberChainEngine({ difficulty: d, mode: 'classic', level: levelFor8[d] })
      const s = e.getState()
      expect(s.size).toBe(8)
      return s.revealed.flat().filter(Boolean).length
    }
    expect(shownOf('easy')).toBeGreaterThan(shownOf('normal'))
    expect(shownOf('normal')).toBeGreaterThan(shownOf('hard'))
  })

  it('大棋盘也有足够线索（保底数量生效，不会只剩几个）', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const engine = new NumberChainEngine({ difficulty, mode: 'endless', level: 13 })
      const s = engine.getState()
      expect(s.size).toBe(16)
      const shown = s.revealed.flat().filter(Boolean).length
      // 16×16=256 格，至少要显示 12 个以上才有推理余地
      expect(shown).toBeGreaterThanOrEqual(12)
    }
  })

  it('关键规则：连上哪格就显示哪格，但**不会**提前显示下一个', () => {
    const engine = new NumberChainEngine({ difficulty: 'hard', level: 2 })
    const s0 = engine.getState()
    const p1 = findValue(s0.grid, 1)
    engine.startAt(p1.r, p1.c)
    const p2 = findValue(s0.grid, 2)
    expect(engine.extendTo(p2.r, p2.c)).toBe('locked')

    const s1 = engine.getState()
    expect(s1.next).toBe(3)
    // 刚连上的 ② 现在必须可见
    expect(s1.revealed[p2.r][p2.c]).toBe(true)
    // 但 ③ 的可见性必须和开局时一致——不能因为"连上了 2"就被翻出来
    const p3 = findValue(s1.grid, 3)
    expect(s1.revealed[p3.r][p3.c]).toBe(s0.revealed[p3.r][p3.c])
  })

  it('关键规则：整条链走完后，可见集 == 开局可见集 ∪ 全部连过的格', () => {
    const engine = new NumberChainEngine({ difficulty: 'hard', level: 1 })
    const s0 = engine.getState()
    const { grid, size } = s0
    const total = size * size
    const p1 = findValue(grid, 1)
    engine.startAt(p1.r, p1.c)
    for (let v = 2; v <= total; v++) {
      const p = findValue(grid, v)
      expect(engine.extendTo(p.r, p.c)).toBe('locked')
    }
    const s1 = engine.getState()
    expect(s1.status).toBe('won')
    // 全部格子都连过了，所以最终应当全部可见
    expect(s1.revealed.flat().every(Boolean)).toBe(true)
    // 而且可见集只增不减：开局可见的格子依然可见
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (s0.revealed[r][c]) expect(s1.revealed[r][c]).toBe(true)
      }
    }
  })

  it('撞到错误的空白格不会显示它的数字', () => {
    const engine = new NumberChainEngine({ difficulty: 'hard', level: 1 })
    const s0 = engine.getState()
    const p1 = findValue(s0.grid, 1)
    engine.startAt(p1.r, p1.c)
    // 找一个空白格且不是当前目标
    let target: { r: number; c: number } | null = null
    for (let r = 0; r < s0.size && !target; r++) {
      for (let c = 0; c < s0.size; c++) {
        if (!s0.revealed[r][c] && s0.grid[r][c] !== 2) {
          target = { r, c }
          break
        }
      }
    }
    expect(target).not.toBeNull()
    expect(engine.extendTo(target!.r, target!.c)).toBe('ignored')
    // 撞过之后仍然不可见——碰对才显示
    expect(engine.getState().revealed[target!.r][target!.c]).toBe(false)
  })

  it('撤回后，本来空白的格子要重新变回不可见', () => {
    // 找一个"开局是空白"的目标来连，验证撤回会把它重新藏起来
    const engine = new NumberChainEngine({ difficulty: 'hard', level: 2 })
    const s0 = engine.getState()
    const p1 = findValue(s0.grid, 1)
    engine.startAt(p1.r, p1.c)

    const s1 = engine.getState()
    const p2 = findValue(s1.grid, 2)
    const wasHidden = !s0.revealed[p2.r][p2.c]
    expect(engine.extendTo(p2.r, p2.c)).toBe('locked')
    // 连上后就该可见（连到哪显示到哪）
    expect(engine.getState().revealed[p2.r][p2.c]).toBe(true)

    // 撤回
    expect(engine.undo()).toBe(true)
    const s2 = engine.getState()
    expect(s2.next).toBe(2)
    if (wasHidden) {
      // 本来空白的，撤回后必须重新变回不可见
      expect(s2.revealed[p2.r][p2.c]).toBe(false)
    } else {
      // 开局就显示的，撤回不应把它藏起来
      expect(s2.revealed[p2.r][p2.c]).toBe(true)
    }
  })

  it('清空后，连上才显示的格子也重新变回不可见', () => {
    const engine = new NumberChainEngine({ difficulty: 'hard', level: 2 })
    const s0 = engine.getState()
    const p1 = findValue(s0.grid, 1)
    engine.startAt(p1.r, p1.c)
    const p2 = findValue(s0.grid, 2)
    engine.extendTo(p2.r, p2.c)
    expect(engine.clearChain()).toBe(true)
    const s1 = engine.getState()
    // 清空后可见集应完全等于开局可见集
    expect(s1.revealed).toEqual(s0.revealed)
  })

  it('撤回不会误藏开局就显示的格子', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 })
    const s0 = engine.getState()
    const p1 = findValue(s0.grid, 1)
    engine.startAt(p1.r, p1.c)
    const p2 = findValue(s0.grid, 2)
    engine.extendTo(p2.r, p2.c)
    engine.undo()
    const s1 = engine.getState()
    // 开局可见的格子必须全部保持可见
    for (let r = 0; r < s0.size; r++) {
      for (let c = 0; c < s0.size; c++) {
        if (s0.revealed[r][c]) expect(s1.revealed[r][c]).toBe(true)
      }
    }
  })

  it('存档往返：initialRevealed 保留（撤回行为可复现）', () => {
    const engine = new NumberChainEngine({ difficulty: 'hard', level: 2 })
    const s0 = engine.getState()
    const clone = new NumberChainEngine()
    clone.loadState(s0)
    expect(clone.getState().initialRevealed).toEqual(s0.initialRevealed)
  })

  it('完整通关一条相邻链', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 })
    const { grid, size } = engine.getState()
    const total = size * size
    engine.startAt(...([findValue(grid, 1).r, findValue(grid, 1).c] as [number, number]))
    for (let v = 2; v <= total; v++) {
      const p = findValue(grid, v)
      expect(engine.extendTo(p.r, p.c)).toBe('locked')
    }
    const s = engine.getState()
    expect(s.status).toBe('won')
    expect(s.next).toBe(total + 1)
    expect(s.lastLevelScore).toBeGreaterThan(0)
  })

  it('无尽模式：关卡不封顶且棋盘持续变大', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', mode: 'endless' })
    expect(engine.getMode()).toBe('endless')
    // 一路推进到超过经典上限
    for (let i = 0; i < 10; i++) engine.nextLevel()
    const s = engine.getState()
    expect(s.level).toBe(11)
    expect(s.size).toBeGreaterThan(8)
  })

  it('经典模式：棋盘封顶 8×8', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', mode: 'classic' })
    for (let i = 0; i < 10; i++) engine.nextLevel()
    expect(engine.getState().size).toBe(8)
  })

  it('无尽模式：连错多次也不会自动结束（已无失误机制）', () => {
    const engine = new NumberChainEngine({ difficulty: 'hard', mode: 'endless' })
    const { grid } = engine.getState()
    const p1 = findValue(grid, 1)
    engine.startAt(p1.r, p1.c)
    // 反复撞不相邻的格子：以前会攒满失误直接结束，现在应始终静默忽略
    for (let i = 0; i < 60; i++) {
      const s = engine.getState()
      const last = s.committed[s.committed.length - 1]
      let far: { r: number; c: number } | null = null
      for (let r = 0; r < s.size && !far; r++) {
        for (let c = 0; c < s.size; c++) {
          if (s.committed.some((p) => p.r === r && p.c === c)) continue
          if (Math.abs(r - last.r) > 1 || Math.abs(c - last.c) > 1) {
            far = { r, c }
            break
          }
        }
      }
      if (!far) break
      expect(engine.extendTo(far.r, far.c)).toBe('ignored')
    }
    // 状态必须仍是 playing，只有主动 giveUp 才会结束
    expect(engine.getState().status).toBe('playing')
  })

  it('无尽模式：只有主动结束才结算', () => {
    const engine = new NumberChainEngine({ difficulty: 'normal', mode: 'endless' })
    expect(engine.getState().status).toBe('playing')
    engine.giveUp()
    expect(engine.getState().status).toBe('over')
  })

  it('restartRun 重置关卡与总分', () => {
    const engine = new NumberChainEngine({ difficulty: 'normal', mode: 'endless' })
    engine.nextLevel()
    engine.nextLevel()
    engine.restartRun()
    const s = engine.getState()
    expect(s.level).toBe(1)
    expect(s.totalScore).toBe(0)
    expect(s.clearedLevels).toBe(0)
    expect(s.status).toBe('playing')
  })

  it('存档往返：revealed 与 mode 保留', () => {
    const engine = new NumberChainEngine({ difficulty: 'hard', mode: 'endless', level: 2 })
    const s0 = engine.getState()
    const clone = new NumberChainEngine()
    clone.loadState(s0)
    const s1 = clone.getState()
    expect(s1.size).toBe(s0.size)
    expect(s1.mode).toBe('endless')
    expect(s1.revealed).toEqual(s0.revealed)
    expect(s1.grid).toEqual(s0.grid)
    expect(s1.next).toBe(s0.next)
  })

  it('旧存档没有 revealed 字段时兜底为全揭示', () => {
    const engine = new NumberChainEngine({ difficulty: 'easy', level: 1 })
    const legacy = engine.getState() as Partial<ReturnType<typeof engine.getState>>
    delete legacy.revealed
    delete legacy.mode
    engine.loadState(legacy as ReturnType<typeof engine.getState>)
    const s = engine.getState()
    expect(s.revealed.flat().every(Boolean)).toBe(true)
  })
})

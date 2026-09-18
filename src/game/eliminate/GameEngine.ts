/**
 * 消消乐引擎（纯 TS，无 DOM 依赖）
 *
 * - 生成无预成型且有可行交换的合法开局
 * - 交换相邻图案并判定消除；消除后重力下落 + 顶部分段补新（避免补新即成行）
 * - 无效交换自动还原，不消耗步数（lastSwapInvalid 供视图播放抖动反馈）
 * - 连锁（连击）计分：第 k 次连锁乘 k 倍
 * - 炸弹/彩虹直接触发：按清除格数计分（SPECIAL_CLEAR_SCORE），并作为连锁首步供动画播放
 * - 无可行交换时自动洗牌
 * - 步数用尽仍未达目标 → 失败；达到目标 → 胜利
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  EliminateState,
  EliminateConfig,
  EliminateMove,
  EliminateDifficulty,
  EliminateTheme,
  EliminateStatus,
  EliminateProgress,
} from './types'
import {
  ELIMINATE_PRESETS,
  DEFAULT_ELIMINATE_CONFIG,
  eliminateScoreForMatch,
  comboMultiplier,
  LEVEL_PROGRESS_KEY,
  deriveLevelParams,
  SPECIAL_BOMB,
  SPECIAL_RAINBOW,
  SPECIAL_CLEAR_SCORE,
  isSpecial,
  isBomb,
  isRainbow,
  specialType,
  MAX_UNDO,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-eliminate-best'

function randInt(n: number): number {
  return Math.floor(Math.random() * n)
}

function swap<T>(arr: Array<Array<T>>, r1: number, c1: number, r2: number, c2: number): void {
  const t = arr[r1][c1]
  arr[r1][c1] = arr[r2][c2]
  arr[r2][c2] = t
}

export class EliminateEngine implements BaseGame<EliminateState, EliminateMove> {
  private config: EliminateConfig
  private rows!: number
  private cols!: number
  private colorCount!: number
  private targetScore!: number
  private grid: number[][] = []
  private selected: { r: number; c: number } | null = null
  private hint: EliminateState['hint'] = null
  private score = 0
  private bestScore = 0
  private bestScoreKey: string
  private movesLeft = 0
  private cleared = 0
  private maxCombo = 0
  private startTime = 0
  private status: EliminateStatus = 'ready'
  /** 当前关卡（1 起） */
  private level = 1
  /** 撤销历史栈（滑动窗口保留 MAX_UNDO 步） */
  private history: Array<{
    grid: number[][]
    score: number
    movesLeft: number
    cleared: number
    maxCombo: number
  }> = []
  /** 剩余撤销次数 */
  private undoLeft = MAX_UNDO
  /** 最近一次无效交换的两格（供视图播放抖动反馈），无则 null */
  lastSwapInvalid: { r1: number; c1: number; r2: number; c2: number } | null = null
  /** 最近一次有效普通交换的两格（供视图播放滑动动画），特殊格触发/选择类操作为 null */
  lastSwap: { r1: number; c1: number; r2: number; c2: number } | null = null

  constructor(config: Partial<EliminateConfig> = {}) {
    this.config = { ...DEFAULT_ELIMINATE_CONFIG, ...config }
    // 关卡：优先 config，其次读取存储进度，最后默认 1
    const progress = StorageAdapter.get<EliminateProgress>(LEVEL_PROGRESS_KEY)
    this.level = config.level ?? progress?.currentLevel ?? 1
    this.applyPreset()
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${this.config.difficulty}-${this.config.theme}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? 0
    this.init()
  }

  getConfig(): EliminateConfig {
    return { ...this.config }
  }

  private applyPreset(): void {
    const preset = deriveLevelParams(this.level, this.config.difficulty)
    this.rows = preset.rows
    this.cols = preset.cols
    this.colorCount = preset.colorCount
    this.targetScore = preset.targetScore
    this.movesLeft = preset.moves
  }

  /** 初始化：铺无成行且至少存在一个可行交换的棋盘（不主动投放特殊格，仅由 4/5 连生成） */
  private init(): void {
    let guard = 0
    do {
      const g: number[][] = []
      for (let r = 0; r < this.rows; r++) {
        const row: number[] = []
        for (let c = 0; c < this.cols; c++) {
          // 避免与左/上形成三连
          let v = randInt(this.colorCount) + 1
          while (
            (c >= 2 && row[c - 1] === v && row[c - 2] === v) ||
            (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v)
          ) {
            v = randInt(this.colorCount) + 1
          }
          row.push(v)
        }
        g.push(row)
      }
      this.grid = g
      guard++
    } while (!this.hasAnySwap() && guard < 50)
    this.lastSwapInvalid = null
    this.lastSwap = null
    this.lastCascade = []
    this.selected = null
    this.hint = null
    this.score = 0
    this.movesLeft = deriveLevelParams(this.level, this.config.difficulty).moves
    this.cleared = 0
    this.maxCombo = 0
    this.startTime = Date.now()
    this.status = 'playing'
    // 重置撤销
    this.undoLeft = MAX_UNDO
    this.history = []
  }

  // ---------------- 匹配检测 ----------------

  /** 找出 grid 中所有的成行/成列消除块（≥3），返回要去除的格子集合 */
  private findMatches(): Set<string> {
    return this.findMatchesWithScore().cells
  }

  /**
   * 找出 grid 中所有消除块并按匹配段计分（每段只计一次，而非逐格计分）。
   * 返回：
   *   - cells: 待清除的格子集合
   *   - baseScore: 基础总分
   *   - spawns: 4 连生成炸弹、5+ 连生成彩虹（锚点格从 cells 剔除，原地升级）
   *   - triggers: cells 中含有的特殊格（被消除时引爆）
   *
   * 关键守卫：run 判定加 `this.grid[r][c] > 0`，防止特殊格（负数）误判成行
   * （否则两个相邻炸弹 -1===-1 会被误判为三连）。
   */
  private findMatchesWithScore(): {
    cells: Set<string>
    baseScore: number
    spawns: Array<{ r: number; c: number; type: 'bomb' | 'rainbow' }>
    triggers: Array<{ r: number; c: number; type: 'bomb' | 'rainbow' }>
  } {
    const matched = new Set<string>()
    const spawns: Array<{ r: number; c: number; type: 'bomb' | 'rainbow' }> = []
    let baseScore = 0

    /** 记录某 run 中点为 spawn 并从 cells 剔除锚点（原地升级，不消除） */
    const markSpawn = (rMid: number, cMid: number, len: number): void => {
      const type: 'bomb' | 'rainbow' = len >= 5 ? 'rainbow' : 'bomb'
      spawns.push({ r: rMid, c: cMid, type })
      matched.delete(`${rMid},${cMid}`)
    }

    // 横向
    for (let r = 0; r < this.rows; r++) {
      let run = 1
      for (let c = 1; c <= this.cols; c++) {
        // 守卫：>0 排除特殊格与空格
        if (c < this.cols && this.grid[r][c] > 0 && this.grid[r][c] === this.grid[r][c - 1]) {
          run++
        } else {
          if (run >= 3) {
            for (let k = c - run; k < c; k++) matched.add(`${r},${k}`)
            baseScore += eliminateScoreForMatch(run)
            if (run >= 4) markSpawn(r, c - run + Math.floor(run / 2), run)
          }
          run = 1
        }
      }
    }
    // 纵向
    for (let c = 0; c < this.cols; c++) {
      let run = 1
      for (let r = 1; r <= this.rows; r++) {
        if (r < this.rows && this.grid[r][c] > 0 && this.grid[r][c] === this.grid[r - 1][c]) {
          run++
        } else {
          if (run >= 3) {
            for (let k = r - run; k < r; k++) matched.add(`${k},${c}`)
            baseScore += eliminateScoreForMatch(run)
            if (run >= 4) markSpawn(r - run + Math.floor(run / 2), c, run)
          }
          run = 1
        }
      }
    }
    // 遍历 cells，若某格 isBomb/isRainbow → 加入 triggers
    const triggers: Array<{ r: number; c: number; type: 'bomb' | 'rainbow' }> = []
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number)
      const t = specialType(this.grid[r][c])
      if (t) triggers.push({ r, c, type: t })
    }
    return { cells: matched, baseScore, spawns, triggers }
  }

  /**
   * 交换后是否会形成一次消除（公开给视图/测试做可行性判断）。
   * 特殊格交换总是有效（在 move 中单独处理），不参与成行判定。
   */
  swapCreatesMatch(r1: number, c1: number, r2: number, c2: number): boolean {
    if (isSpecial(this.grid[r1][c1]) || isSpecial(this.grid[r2][c2])) return true
    swap(this.grid, r1, c1, r2, c2)
    const has = this.findMatches().size > 0
    swap(this.grid, r1, c1, r2, c2)
    return has
  }

  /** 清除匹配格子（统一置零） */
  private clearCells(cells: Set<string>): void {
    for (const key of cells) {
      const [r, c] = key.split(',').map(Number)
      this.grid[r][c] = 0
    }
  }

  /** 深拷贝当前盘面（连锁快照 / 对外状态共用） */
  private cloneGrid(): number[][] {
    return this.grid.map((row) => [...row])
  }

  /** 重力下落 + 顶部补新（补新避免立即成行） */
  private applyGravity(): void {
    for (let c = 0; c < this.cols; c++) {
      // 自底向上收集非空格（保持原相对顺序，col[0] 是最底部图案）
      const col: number[] = []
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== 0) col.push(this.grid[r][c])
      }
      // 从底部向上填充：先放原有图案（顺序不变），顶部剩余行补新
      let fill = this.rows - 1
      let k = 0
      for (; k < col.length && fill >= 0; k++, fill--) {
        this.grid[fill][c] = col[k]
      }
      // 顶部补新图案，避免填充后与下方/左方/右方立即成三连
      for (; fill >= 0; fill--) {
        let v = randInt(this.colorCount) + 1
        while (
          (fill + 2 < this.rows && this.grid[fill + 1][c] === v && this.grid[fill + 2][c] === v) ||
          (c >= 2 && this.grid[fill][c - 1] === v && this.grid[fill][c - 2] === v) ||
          (c >= 1 && c + 1 < this.cols && this.grid[fill][c - 1] === v && this.grid[fill][c + 1] === v) ||
          (c + 2 < this.cols && this.grid[fill][c + 1] === v && this.grid[fill][c + 2] === v)
        ) {
          v = randInt(this.colorCount) + 1
        }
        this.grid[fill][c] = v
      }
    }
  }

  /**
   * 解析一次完整消除（含连锁）：
   * 每轮连锁记录到 lastCascade（供视图播放"消除→下落"分步动画）
   * 流程：取 cells/spawns/triggers → 处理触发器（炸弹 3×3、彩虹全盘同色）
   *      → 剔除 spawn 锚点 → clearCells → 写入特殊格 → applyGravity
   * @param initial 炸弹/彩虹等"直接清除"的格子与奖励分：作为连锁第 1 步记录
   *                （保证重力必定执行，修复直接清除后棋盘留洞的问题）
   * @returns 本次操作累计得分
   */
  private resolveBoard(initial?: { cleared: Set<string>; bonus: number }): number {
    let total = 0
    let combo = 0
    this.lastCascade = []
    if (initial && initial.cleared.size > 0) {
      this.applyGravity()
      total += initial.bonus
      this.cleared++
      this.lastCascade.push({
        matched: Array.from(initial.cleared),
        gained: initial.bonus,
        gridAfter: this.cloneGrid(),
        spawned: [],
      })
    }
    while (true) {
      const { cells, baseScore, spawns, triggers } = this.findMatchesWithScore()
      if (cells.size === 0) break
      combo++
      if (combo > this.maxCombo) this.maxCombo = combo

      // 处理 triggers：炸弹/彩虹被消除时引爆，用 triggeredSet 去重防链式死循环
      if (triggers.length > 0) {
        const triggeredSet = new Set<string>()
        const queue = [...triggers]
        while (queue.length > 0) {
          const t = queue.shift()!
          const key = `${t.r},${t.c}`
          if (triggeredSet.has(key)) continue
          triggeredSet.add(key)
          cells.add(key)
          if (t.type === 'bomb') {
            // 炸弹 → 3×3 范围并入 cells
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = t.r + dr
                const nc = t.c + dc
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue
                const k = `${nr},${nc}`
                cells.add(k)
                // 链式：范围内的特殊格入队
                const st = specialType(this.grid[nr][nc])
                if (st && !triggeredSet.has(k)) {
                  queue.push({ r: nr, c: nc, type: st })
                }
              }
            }
          } else {
            // 彩虹 → 全盘同色并入 cells（取当前 cells 中最多的颜色）
            const color = this.dominantColorIn(cells)
            if (color > 0) {
              for (let rr = 0; rr < this.rows; rr++) {
                for (let cc = 0; cc < this.cols; cc++) {
                  if (this.grid[rr][cc] === color) cells.add(`${rr},${cc}`)
                }
              }
            }
          }
        }
      }

      // spawns 锚点格从 cells 剔除（原地升级，不消除）
      for (const s of spawns) {
        cells.delete(`${s.r},${s.c}`)
      }

      this.clearCells(cells)
      this.cleared++

      // 在 spawns 锚点格写入特殊格
      for (const s of spawns) {
        this.grid[s.r][s.c] = s.type === 'bomb' ? SPECIAL_BOMB : SPECIAL_RAINBOW
      }

      const gained = baseScore * comboMultiplier(combo)
      total += gained
      // 先下落补新，再记录本轮快照（视图按步播放"消除→下落"动画）
      this.applyGravity()
      this.lastCascade.push({
        matched: Array.from(cells),
        gained,
        gridAfter: this.cloneGrid(),
        spawned: [...spawns],
      })
    }
    return total
  }

  /** 返回 cells 集合中出现次数最多的正数颜色 id（无则 0） */
  private dominantColorIn(cells: Set<string>): number {
    const counts = new Map<number, number>()
    for (const key of cells) {
      const [r, c] = key.split(',').map(Number)
      const v = this.grid[r][c]
      if (v > 0) counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    let best = 0
    let bestCount = 0
    for (const [v, cnt] of counts) {
      if (cnt > bestCount) {
        best = v
        bestCount = cnt
      }
    }
    return best
  }

  /** 最近一次消除的连锁步骤（move 后读取，视图播放动画） */
  lastCascade: Array<{
    matched: string[]
    gained: number
    gridAfter: number[][]
    spawned?: Array<{ r: number; c: number; type: 'bomb' | 'rainbow' }>
  }> = []

  // ---------------- 移动 / 交换 ----------------

  move(m: EliminateMove): boolean {
    if (this.status !== 'playing') return false
    const { r, c } = m
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false
    // 每次操作前清空上一次的连锁动画数据，避免 UI 误判重复播放
    this.lastCascade = []
    this.lastSwapInvalid = null
    this.lastSwap = null
    this.hint = null
    if (!this.selected) {
      this.selected = { r, c }
      return true
    }
    const sel = this.selected
    if (sel.r === r && sel.c === c) {
      this.selected = null
      return true
    }
    // 非相邻 → 改选
    if (Math.abs(sel.r - r) + Math.abs(sel.c - c) !== 1) {
      this.selected = { r, c }
      return true
    }
    // 相邻 → 尝试交换
    this.selected = null
    const selV = this.grid[sel.r][sel.c]
    const tgtV = this.grid[r][c]

    // 特殊交换：彩虹（在 swapCreatesMatch 之前判定）
    // 与相邻任意图案交换 → 消除该颜色全部 + 彩虹格
    if (isRainbow(selV) || isRainbow(tgtV)) {
      this.saveHistory()
      this.movesLeft--
      const rainbowPos = isRainbow(selV) ? sel : { r, c }
      const otherPos = isRainbow(selV) ? { r, c } : sel
      const otherV = this.grid[otherPos.r][otherPos.c]
      const cleared = new Set<string>([`${rainbowPos.r},${rainbowPos.c}`])
      // 彩虹格置 0
      this.grid[rainbowPos.r][rainbowPos.c] = 0
      if (otherV > 0) {
        // 清除全盘同色
        for (let rr = 0; rr < this.rows; rr++) {
          for (let cc = 0; cc < this.cols; cc++) {
            if (this.grid[rr][cc] === otherV) {
              this.grid[rr][cc] = 0
              cleared.add(`${rr},${cc}`)
            }
          }
        }
      } else if (isSpecial(otherV)) {
        // 彩虹换特殊：清除全盘所有非空格（强力组合）
        for (let rr = 0; rr < this.rows; rr++) {
          for (let cc = 0; cc < this.cols; cc++) {
            if (this.grid[rr][cc] !== 0) {
              this.grid[rr][cc] = 0
              cleared.add(`${rr},${cc}`)
            }
          }
        }
      }
      this.score += this.resolveBoard({
        cleared,
        bonus: cleared.size * SPECIAL_CLEAR_SCORE,
      })
      this.checkEnd()
      return true
    }

    // 特殊交换：炸弹
    // 与相邻任意图案交换 → 直接触发该炸弹 3×3 清除
    if (isBomb(selV) || isBomb(tgtV)) {
      this.saveHistory()
      this.movesLeft--
      const bombPos = isBomb(selV) ? sel : { r, c }
      const cleared = this.triggerBombCascade(bombPos.r, bombPos.c)
      this.score += this.resolveBoard({
        cleared,
        bonus: cleared.size * SPECIAL_CLEAR_SCORE,
      })
      this.checkEnd()
      return true
    }

    // 普通交换：先判定是否成行；无消除则还原且不耗步（只给抖动反馈）
    if (!this.swapCreatesMatch(sel.r, sel.c, r, c)) {
      this.lastSwapInvalid = { r1: sel.r, c1: sel.c, r2: r, c2: c }
      // 不耗步不会触发 checkEnd，这里补一次死局检测：无可行交换则自动洗牌
      if (!this.hasAnySwap()) this.reshuffleBoard()
      return true
    }
    this.saveHistory()
    this.movesLeft--
    swap(this.grid, sel.r, sel.c, r, c)
    this.lastSwap = { r1: sel.r, c1: sel.c, r2: r, c2: c }
    const gained = this.resolveBoard()
    this.score += gained
    this.checkEnd()
    return true
  }

  /**
   * 触发炸弹 3×3 清除（含链式：范围内其他炸弹也会被引爆）。
   * 使用 triggeredSet 去重防止死循环。
   * @returns 被清除的格子集合（含炸弹自身与连锁范围）
   */
  private triggerBombCascade(br: number, bc: number): Set<string> {
    const cleared = new Set<string>()
    const queue: Array<{ r: number; c: number }> = [{ r: br, c: bc }]
    const triggered = new Set<string>()
    while (queue.length > 0) {
      const { r: cr, c: cc } = queue.shift()!
      const key = `${cr},${cc}`
      if (triggered.has(key)) continue
      triggered.add(key)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr
          const nc = cc + dc
          if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue
          const k = `${nr},${nc}`
          cleared.add(k)
          // 链式：范围内的炸弹入队
          if (isBomb(this.grid[nr][nc]) && !triggered.has(k)) {
            queue.push({ r: nr, c: nc })
          }
          this.grid[nr][nc] = 0
        }
      }
    }
    return cleared
  }

  /** 判断并更新结束状态 */
  private checkEnd(): void {
    if (this.status !== 'playing') return
    if (this.score >= this.targetScore) {
      this.status = 'won'
      this.updateBest()
      return
    }
    if (this.movesLeft <= 0) {
      this.status = 'lost'
      return
    }
    // 无可交换的合法移动 → 洗牌
    if (!this.hasAnySwap()) {
      this.reshuffleBoard()
    }
  }

  private hasAnySwap(): boolean {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && this.swapCreatesMatch(r, c, r, c + 1)) return true
        if (r + 1 < this.rows && this.swapCreatesMatch(r, c, r + 1, c)) return true
      }
    }
    return false
  }

  /** 重新排列棋盘（保留现有颜色分布，含特殊格），消除所有已成型块 */
  private reshuffleBoard(): void {
    this.lastCascade = []
    // 收集所有非零值（含负数特殊格）一起洗牌
    const flat: number[] = []
    for (const row of this.grid) for (const v of row) if (v !== 0) flat.push(v)
    // Fisher-Yates
    for (let i = flat.length - 1; i > 0; i--) {
      const j = randInt(i + 1)
      ;[flat[i], flat[j]] = [flat[j], flat[i]]
    }
    let idx = 0
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = flat[idx++] ?? 1
      }
    }
    // 消除意外成型块
    this.resolveBoard()
    // 再检查是否有可用移动；无则再洗（有限次数兜底）
    if (!this.hasAnySwap()) {
      // 极限兜底：清空重排
      const g = this.grid
      flat.length = 0
      for (const row of g) for (const v of row) if (v !== 0) flat.push(v)
      for (let i = flat.length - 1; i > 0; i--) {
        const j = randInt(i + 1)
        ;[flat[i], flat[j]] = [flat[j], flat[i]]
      }
      idx = 0
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.grid[r][c] = flat[idx++] ?? 1
      this.resolveBoard()
    }
    this.selected = null
    this.hint = null
    this.lastSwapInvalid = null
    this.lastSwap = null
  }

  /** 手动洗牌 */
  reshuffle(): void {
    if (this.status !== 'playing') return
    this.lastCascade = []
    this.lastSwapInvalid = null
    this.lastSwap = null
    this.reshuffleBoard()
  }

  /** 返回某列自底向上的非空图案序列（测试/调试辅助，只读） */
  columnNonEmpty(c: number): number[] {
    const out: number[] = []
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r][c] !== 0) out.push(this.grid[r][c])
    }
    return out
  }

  /** 提示：找一组可行的交换并高亮 */
  hintNow(): boolean {
    if (this.status !== 'playing') return false
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && this.swapCreatesMatch(r, c, r, c + 1)) {
          this.hint = { r1: r, c1: c, r2: r, c2: c + 1 }
          return true
        }
        if (r + 1 < this.rows && this.swapCreatesMatch(r, c, r + 1, c)) {
          this.hint = { r1: r, c1: c, r2: r + 1, c2: c }
          return true
        }
      }
    }
    return false
  }

  getHint(): EliminateState['hint'] {
    return this.hint
  }

  private updateBest(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
  }

  // ---------------- 撤销 ----------------

  /** 入栈当前快照（深拷贝 grid/score/movesLeft/cleared/maxCombo），滑动窗口保留 MAX_UNDO 步 */
  private saveHistory(): void {
    this.history.push({
      grid: this.cloneGrid(),
      score: this.score,
      movesLeft: this.movesLeft,
      cleared: this.cleared,
      maxCombo: this.maxCombo,
    })
    while (this.history.length > MAX_UNDO) this.history.shift()
  }

  /** 是否可撤销：仍有撤销次数且历史非空 */
  canUndo(): boolean {
    return this.undoLeft > 0 && this.history.length > 0
  }

  /** 撤销上一步：弹栈恢复，undoLeft--，清 lastCascade/selected/hint；不可撤销返回 false */
  undo(): boolean {
    if (!this.canUndo()) return false
    const prev = this.history.pop()!
    this.grid = prev.grid.map((row) => [...row])
    this.score = prev.score
    this.movesLeft = prev.movesLeft
    this.cleared = prev.cleared
    this.maxCombo = prev.maxCombo
    this.undoLeft--
    this.lastCascade = []
    this.lastSwapInvalid = null
    this.lastSwap = null
    this.selected = null
    this.hint = null
    return true
  }

  // ---------------- 关卡 ----------------

  /** 保存当前关卡进度到存储（maxUnlocked 取已解锁与新关卡的最大值） */
  private saveProgress(): void {
    const existing = StorageAdapter.get<EliminateProgress>(LEVEL_PROGRESS_KEY)
    const maxUnlocked = Math.max(existing?.maxUnlocked ?? 1, this.level)
    StorageAdapter.set(LEVEL_PROGRESS_KEY, {
      currentLevel: this.level,
      maxUnlocked,
    })
  }

  /** 进入下一关：level++，保存进度，重新初始化 */
  nextLevel(): void {
    this.level++
    this.saveProgress()
    this.init()
  }

  /** 设置关卡：level=n，重新初始化（不保存进度） */
  setLevel(n: number): void {
    this.level = n
    this.init()
  }

  /** 重置到第 1 关：保存进度，重新初始化 */
  resetLevel(): void {
    this.level = 1
    this.saveProgress()
    this.init()
  }

  /** 获取当前关卡 */
  getLevel(): number {
    return this.level
  }

  // ---------------- 状态 ----------------

  /** 页面隐藏/弹窗打开时挂起计时（不累计用时），resumeClock 时补偿 */
  private pausedAt: number | null = null

  pauseClock(): void {
    if (this.status !== 'playing') return
    if (this.pausedAt === null) this.pausedAt = Date.now()
  }

  /** 恢复计时：把暂停时长从用时统计中剔除 */
  resumeClock(): void {
    if (this.pausedAt === null) return
    const delta = Date.now() - this.pausedAt
    this.pausedAt = null
    this.startTime += delta
  }

  /** 恢复存档后校正用时统计：把离开时长从 startTime 中剔除（存档时已记录 savedAt） */
  shiftClock(ms: number): void {
    if (ms > 0) this.startTime += ms
    this.pausedAt = null
  }

  getState(): EliminateState {
    return {
      rows: this.rows,
      cols: this.cols,
      grid: this.cloneGrid(),
      selected: this.selected ? { ...this.selected } : null,
      hint: this.hint ? { ...this.hint } : null,
      score: this.score,
      bestScore: this.bestScore,
      movesLeft: this.movesLeft,
      cleared: this.cleared,
      maxCombo: this.maxCombo,
      star: this.maxCombo,
      targetScore: this.targetScore,
      startTime: this.startTime,
      status: this.status,
      difficulty: this.config.difficulty,
      theme: this.config.theme,
      level: this.level,
      undoLeft: this.undoLeft,
    }
  }

  loadState(state: EliminateState): void {
    // 兼容旧存档（旧格式只有 size 方阵）
    const oldState = state as EliminateState & { size?: number }
    this.rows = state.rows ?? oldState.size ?? 8
    this.cols = state.cols ?? oldState.size ?? 8
    this.grid = state.grid.map((row) => [...row])
    this.lastCascade = []
    this.selected = state.selected ? { ...state.selected } : null
    this.hint = state.hint ? { ...state.hint } : null
    this.score = state.score
    this.bestScore = state.bestScore
    this.movesLeft = state.movesLeft
    this.cleared = state.cleared
    this.maxCombo = state.maxCombo
    this.targetScore = state.targetScore
    this.startTime = state.startTime
    this.status = state.status
    this.config.difficulty = state.difficulty
    this.config.theme = state.theme
    this.colorCount = ELIMINATE_PRESETS[state.difficulty]?.colorCount ?? 6
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${state.difficulty}-${state.theme}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? state.bestScore
    // 关卡/撤销缺省回退
    this.level = state.level ?? 1
    this.undoLeft = state.undoLeft ?? MAX_UNDO
    this.history = []
    this.lastSwapInvalid = null
    this.lastSwap = null
  }

  isGameOver(): boolean {
    return this.status === 'won' || this.status === 'lost'
  }

  isWin(): boolean {
    return this.status === 'won'
  }

  reset(): void {
    this.init()
  }

  getScore(): number {
    return this.score
  }

  getDifficulty(): EliminateDifficulty {
    return this.config.difficulty
  }

  getTheme(): EliminateTheme {
    return this.config.theme
  }
}

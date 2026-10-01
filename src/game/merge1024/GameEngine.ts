/**
 * 1024 消消乐引擎（纯 TS，无 DOM 依赖）
 *
 * - 开局棋盘占满（按难度铺设低值铺底 + 少量中值启动跳板）
 * - 拖拽/点击连线：相邻同数可续，最小 2 格；提交后求和生成新数字（数值守恒，腾出 N-1 格）
 * - 空位重力下落 + 顶部按「渐进式补充池」补新（棋盘始终满格，补新避免立即成型）
 * - 合并出的新数字若与相邻同数自动连锁合并（连击计分：第 k 次连锁乘 k 倍）
 * - 无可行连线时自动洗牌（保留数值集合）
 * - 步数用尽未达目标 → 失败；合成目标数字 → 胜利
 * - 撤销（MAX_UNDO 次）、提示（找最长可行连线）、关卡递进（目标数字每关翻倍）
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  Merge1024State,
  Merge1024Config,
  Merge1024Move,
  Merge1024Difficulty,
  Merge1024Theme,
  Merge1024Status,
  Merge1024Progress,
  ChainCell,
} from './types'
import {
  MERGE1024_PRESETS,
  DEFAULT_MERGE1024_CONFIG,
  chainMultiplier,
  comboMultiplier,
  LEVEL_PROGRESS_KEY,
  levelTarget,
  initialBoard,
  spawnPoolForMax,
  spawnWeightsForMax,
  MAX_UNDO,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-merge1024-best'

function randInt(n: number): number {
  return Math.floor(Math.random() * n)
}

function keyOf(r: number, c: number): string {
  return `${r},${c}`
}

/** 相邻 4 方向 */
const DIRS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export class Merge1024Engine implements BaseGame<Merge1024State, Merge1024Move> {
  private config: Merge1024Config
  private preset: { rows: number; cols: number; moves: number; target: number }
  private grid: number[][] = []
  /**
   * 连锁期间并行标记：每个格子的值是否为「本步移动前已存在」。
   * 重力下落时随值一起搬迁；顶部补新生成的标记为 false。
   * 连锁只吸收 preexisting=true 的同数邻居，确保补充池的新数字
   * 不会立即被当成本步连锁对象（呼应「补新避免立即成型」的设计意图）。
   */
  private preexisting: boolean[][] = []
  private chainPath: ChainCell[] | null = null
  private hintPath: ChainCell[] | null = null
  private score = 0
  private bestScore = 0
  private bestScoreKey: string
  private target = 16
  private maxTile = 2
  private movesLeft = 0
  private maxCombo = 0
  private startTime = 0
  private status: Merge1024Status = 'ready'
  private level = 1
  private history: Array<{ grid: number[][]; score: number; movesLeft: number; maxCombo: number; maxTile: number }> = []
  private undoLeft = MAX_UNDO
  private pausedAt: number | null = null

  /** 最近一次连线的连锁步骤（move 后读取，视图播放动画） */
  lastCascade: Array<{
    /** 本步被合并的格子（被吃掉） */
    merged: string[]
    /** 本步落点（生成新数字的格子，连锁中固定不动） */
    anchor: { r: number; c: number }
    /** 落点本步后的数字 */
    value: number
    /** 本步得分 */
    gained: number
    /** 本步合并前（上一落下完成后）的棋盘快照 */
    gridBefore: number[][]
    /** 本步合并 + 重力 + 补新后的棋盘快照 */
    gridAfter: number[][]
  }> = []

  constructor(config: Partial<Merge1024Config> = {}) {
    this.config = { ...DEFAULT_MERGE1024_CONFIG, ...config }
    const progress = StorageAdapter.get<Merge1024Progress>(LEVEL_PROGRESS_KEY)
    this.level = config.level ?? progress?.currentLevel ?? 1
    this.preset = { ...MERGE1024_PRESETS[this.config.difficulty] }
    this.target = levelTarget(this.level, this.preset)
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${this.config.difficulty}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? 0
    this.init()
  }

  getConfig(): Merge1024Config {
    return { ...this.config }
  }

  private init(): void {
    this.applyPresetForLevel()
    // 开局铺底最大值 = target/2：确保不含 ≥ 目标的数字，必须合成才能通关
    const maxAllowed = Math.max(2, this.target >> 1)
    const cells = initialBoard(this.preset.rows, this.preset.cols, maxAllowed)
    // Fisher-Yates 洗牌后铺满
    for (let i = cells.length - 1; i > 0; i--) {
      const j = randInt(i + 1)
      ;[cells[i], cells[j]] = [cells[j], cells[i]]
    }
    let idx = 0
    this.grid = []
    for (let r = 0; r < this.preset.rows; r++) {
      const row: number[] = []
      for (let c = 0; c < this.preset.cols; c++) row.push(cells[idx++] ?? 2)
      this.grid.push(row)
    }
    this.chainPath = null
    this.hintPath = null
    this.score = 0
    this.movesLeft = this.preset.moves
    this.maxCombo = 0
    this.startTime = Date.now()
    this.status = 'playing'
    this.undoLeft = MAX_UNDO
    this.history = []
    this.lastCascade = []
    this.maxTile = this.computeMax()
    // 无可行连线时自动重排
    if (!this.hasAnyMove()) this.reshuffleBoard()
    // 安全兜底：若开局已意外达到目标（不应发生），立即判胜
    this.checkEnd()
  }

  private applyPresetForLevel(): void {
    this.preset = { ...MERGE1024_PRESETS[this.config.difficulty] }
    this.target = levelTarget(this.level, this.preset)
  }

  private computeMax(): number {
    let m = 0
    for (const row of this.grid) for (const v of row) if (v > m) m = v
    return m
  }

  private cloneGrid(): number[][] {
    return this.grid.map((row) => [...row])
  }

  // ---------------- 连线校验（视图拖拽时逐格调用） ----------------

  /**
   * 是否可从 path 末格继续连到 (r,c)：相邻、同数、且未被该路径占用。
   * 空 path 时任意非空格均可作为起点。
   */
  canExtend(path: ChainCell[], r: number, c: number): boolean {
    if (path.length === 0) return r >= 0 && r < this.preset.rows && c >= 0 && c < this.preset.cols
    const last = path[path.length - 1]
    if (Math.abs(last.r - r) + Math.abs(last.c - c) !== 1) return false
    const used = new Set(path.map((p) => keyOf(p.r, p.c)))
    if (used.has(keyOf(r, c))) return false
    const v = this.grid[r][c]
    return v > 0 && v === this.grid[last.r][last.c]
  }

  /** 当前连线路径 */
  getChainPath(): ChainCell[] | null {
    return this.chainPath ? this.chainPath.map((p) => ({ ...p })) : null
  }

  /** 开始一条新连线（替换现有路径） */
  beginChain(r: number, c: number): boolean {
    if (this.status !== 'playing') return false
    if (r < 0 || r >= this.preset.rows || c < 0 || c >= this.preset.cols) return false
    if (this.grid[r][c] <= 0) return false
    this.chainPath = [{ r, c }]
    this.hintPath = null
    return true
  }

  /** 沿路径延伸一格；非法则返回 false 且不改变路径 */
  extendChain(r: number, c: number): boolean {
    if (this.status !== 'playing') return false
    if (!this.chainPath) return this.beginChain(r, c)
    if (!this.canExtend(this.chainPath, r, c)) return false
    this.chainPath.push({ r, c })
    return true
  }

  /** 提交当前连线并结算；不足 2 格返回 false（不消耗步数） */
  commitChain(): boolean {
    if (this.status !== 'playing') return false
    const path = this.chainPath
    if (!path || path.length < 2) return false
    this.lastCascade = []

    const consumed = new Set(path.map((p) => keyOf(p.r, p.c)))
    const anchor = path[path.length - 1]
    const sum = path.reduce((acc, p) => acc + this.grid[p.r][p.c], 0)
    const gained = sum * chainMultiplier(path.length)

    this.saveHistory()
    this.movesLeft--
    this.score += gained
    this.maxCombo = Math.max(this.maxCombo, 1)

    // 连锁前快照：标记当前所有非空格为「移动前已存在」，补新生成格后续标记为 false
    this.preexisting = this.grid.map((row) => row.map((v) => v > 0))

    // ---- 第 0 步：主连线合并 ----
    const before0 = this.cloneGrid()
    this.grid[anchor.r][anchor.c] = sum
    for (const p of path) {
      if (p.r === anchor.r && p.c === anchor.c) continue
      this.grid[p.r][p.c] = 0
    }
    this.applyGravityAndRefill()
    this.lastCascade.push({
      merged: Array.from(consumed),
      anchor: { ...anchor },
      value: sum,
      gained,
      gridBefore: before0,
      gridAfter: this.cloneGrid(),
    })

    // ---- 自动连锁：新数字与相邻同数反复合并（锚点固定不动） ----
    let combo = 1
    let guard = 0
    while (guard++ < 500) {
      const neighbors = this.sameValueNeighbors(anchor.r, anchor.c)
      if (neighbors.length === 0) break
      const before = this.cloneGrid()
      let newValue = this.grid[anchor.r][anchor.c]
      const eaten: string[] = []
      for (const nb of neighbors) {
        newValue += this.grid[nb.r][nb.c]
        eaten.push(keyOf(nb.r, nb.c))
      }
      this.grid[anchor.r][anchor.c] = newValue
      for (const nb of neighbors) this.grid[nb.r][nb.c] = 0
      this.applyGravityAndRefill()
      const g = newValue * comboMultiplier(combo)
      this.score += g
      combo++
      if (combo > this.maxCombo) this.maxCombo = combo
      this.lastCascade.push({
        merged: eaten,
        anchor: { ...anchor },
        value: newValue,
        gained: g,
        gridBefore: before,
        gridAfter: this.cloneGrid(),
      })
    }

    this.maxTile = this.computeMax()
    this.chainPath = null
    this.hintPath = null
    this.checkEnd()
    return true
  }

  /** BaseGame 接口入口：直接提交一条完整路径 */
  move(m: Merge1024Move): boolean {
    if (m.path.length < 2) return false
    this.chainPath = m.path.map((p) => ({ ...p }))
    return this.commitChain()
  }

  private sameValueNeighbors(r: number, c: number): ChainCell[] {
    const v = this.grid[r][c]
    if (v <= 0) return []
    const out: ChainCell[] = []
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= this.preset.rows || nc < 0 || nc >= this.preset.cols) continue
      if (this.grid[nr][nc] !== v) continue
      // 仅吸收「移动前已存在」的同数邻居；补充池新生数字不参与本步连锁
      const pre = this.preexisting[nr]?.[nc] ?? true
      if (pre) out.push({ r: nr, c: nc })
    }
    return out
  }

  /** 重力下落 + 顶部补新（棋盘始终满格；补新避免立即成型） */
  private applyGravityAndRefill(): void {
    const rows = this.preset.rows
    const cols = this.preset.cols
    const tracking = this.preexisting.length > 0
    for (let c = 0; c < cols; c++) {
      // 自底向上收集非空格（保持相对顺序），同时搬迁 preexisting 标记
      const col: number[] = []
      const colPre: boolean[] = []
      for (let r = rows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== 0) {
          col.push(this.grid[r][c])
          colPre.push(tracking ? this.preexisting[r][c] : true)
        }
      }
      let fill = rows - 1
      let k = 0
      for (; k < col.length && fill >= 0; k++, fill--) {
        this.grid[fill][c] = col[k]
        if (tracking) this.preexisting[fill][c] = colPre[k]
      }
      // 顶部补新（标记为非 preexisting）
      for (; fill >= 0; fill--) {
        this.grid[fill][c] = this.spawnValue(fill, c)
        if (tracking) this.preexisting[fill][c] = false
      }
    }
  }

  /** 按补充池生成一个新数字；若会与邻居立即成型则重掷（有限次） */
  private spawnValue(r: number, c: number): number {
    const max = this.computeMax()
    const pool = spawnPoolForMax(max)
    const weights = spawnWeightsForMax(max)
    const total = weights.reduce((a, b) => a + b, 0)
    for (let attempt = 0; attempt < 12; attempt++) {
      let pick = randInt(total)
      let v = pool[pool.length - 1]
      for (let i = 0; i < pool.length; i++) {
        if (pick < weights[i]) {
          v = pool[i]
          break
        }
        pick -= weights[i]
      }
      if (!this.wouldFormImmediate(v, r, c)) return v
    }
    return 2
  }

  private wouldFormImmediate(v: number, r: number, c: number): boolean {
    const rows = this.preset.rows
    const cols = this.preset.cols
    let same = 0
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (this.grid[nr][nc] === v) same++
    }
    return same >= 2
  }

  /** 是否有任意可行连线（至少一对相邻同数） */
  private hasAnyMove(): boolean {
    const rows = this.preset.rows
    const cols = this.preset.cols
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = this.grid[r][c]
        if (v <= 0) continue
        if (c + 1 < cols && this.grid[r][c + 1] === v) return true
        if (r + 1 < rows && this.grid[r + 1][c] === v) return true
      }
    }
    return false
  }

  /** 重新排列棋盘（保留数值集合），消除孤立数 */
  private reshuffleBoard(): void {
    const rows = this.preset.rows
    const cols = this.preset.cols
    for (let attempt = 0; attempt < 50; attempt++) {
      const flat: number[] = []
      for (const row of this.grid) for (const v of row) if (v !== 0) flat.push(v)
      for (let i = flat.length - 1; i > 0; i--) {
        const j = randInt(i + 1)
        ;[flat[i], flat[j]] = [flat[j], flat[i]]
      }
      let idx = 0
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.grid[r][c] = flat[idx++] ?? 2
        }
      }
      if (this.hasAnyMove()) {
        this.chainPath = null
        this.hintPath = null
        return
      }
    }
    // 极限兜底：清盘后按初始分布重铺（同样限制在 target/2 内）
    const cells = initialBoard(rows, cols, Math.max(2, this.target >> 1))
    for (let i = cells.length - 1; i > 0; i--) {
      const j = randInt(i + 1)
      ;[cells[i], cells[j]] = [cells[j], cells[i]]
    }
    let idx = 0
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.grid[r][c] = cells[idx++] ?? 2
    this.chainPath = null
    this.hintPath = null
  }

  /** 手动洗牌 */
  reshuffle(): void {
    if (this.status !== 'playing') return
    this.chainPath = null
    this.hintPath = null
    this.lastCascade = []
    this.reshuffleBoard()
  }

  /** 提示：找一条可行连线（贪心延伸，取最长），返回路径 */
  hintNow(): boolean {
    if (this.status !== 'playing') return false
    const rows = this.preset.rows
    const cols = this.preset.cols
    let best: ChainCell[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.grid[r][c] <= 0) continue
        const chain = this.longestFrom(r, c)
        if (chain.length > best.length) best = chain
      }
    }
    if (best.length < 2) return false
    this.hintPath = best
    return true
  }

  /** 从 (r,c) 贪心延伸出最长连线（每次优先还有同数邻居的方向，走完为止） */
  private longestFrom(r: number, c: number): ChainCell[] {
    const v = this.grid[r][c]
    if (v <= 0) return []
    const path: ChainCell[] = [{ r, c }]
    const used = new Set<string>([keyOf(r, c)])
    let cur = { r, c }
    for (let guard = 0; guard < 100; guard++) {
      const nbs: ChainCell[] = []
      for (const [dr, dc] of DIRS) {
        const nr = cur.r + dr
        const nc = cur.c + dc
        if (nr < 0 || nr >= this.preset.rows || nc < 0 || nc >= this.preset.cols) continue
        const k = keyOf(nr, nc)
        if (used.has(k)) continue
        if (this.grid[nr][nc] === v) nbs.push({ r: nr, c: nc })
      }
      if (nbs.length === 0) break
      const next = nbs[0]
      used.add(keyOf(next.r, next.c))
      path.push(next)
      cur = next
    }
    return path
  }

  getHint(): Merge1024State['hintPath'] {
    return this.hintPath ? this.hintPath.map((p) => ({ ...p })) : null
  }

  // ---------------- 撤销 ----------------

  private saveHistory(): void {
    this.history.push({
      grid: this.cloneGrid(),
      score: this.score,
      movesLeft: this.movesLeft,
      maxCombo: this.maxCombo,
      maxTile: this.maxTile,
    })
    while (this.history.length > MAX_UNDO) this.history.shift()
  }

  canUndo(): boolean {
    return this.undoLeft > 0 && this.history.length > 0
  }

  undo(): boolean {
    if (!this.canUndo()) return false
    const prev = this.history.pop()!
    this.grid = prev.grid.map((row) => [...row])
    this.score = prev.score
    this.movesLeft = prev.movesLeft
    this.maxCombo = prev.maxCombo
    this.maxTile = prev.maxTile
    this.undoLeft--
    this.chainPath = null
    this.hintPath = null
    this.lastCascade = []
    return true
  }

  // ---------------- 关卡 ----------------

  private saveProgress(): void {
    const existing = StorageAdapter.get<Merge1024Progress>(LEVEL_PROGRESS_KEY)
    const maxUnlocked = Math.max(existing?.maxUnlocked ?? 1, this.level)
    StorageAdapter.set(LEVEL_PROGRESS_KEY, { currentLevel: this.level, maxUnlocked })
  }

  nextLevel(): void {
    if (this.level >= this.maxLevel()) return
    this.level++
    this.saveProgress()
    this.applyPresetForLevel()
    this.init()
  }

  private maxLevel(): number {
    const preset = MERGE1024_PRESETS[this.config.difficulty]
    let t = 16
    let lv = 1
    while (t < preset.target) {
      t *= 2
      lv++
    }
    return lv
  }

  resetLevel(): void {
    this.level = 1
    this.saveProgress()
    this.applyPresetForLevel()
    this.init()
  }

  getLevel(): number {
    return this.level
  }

  getMaxLevel(): number {
    return this.maxLevel()
  }

  // ---------------- 状态 ----------------

  private checkEnd(): void {
    if (this.status !== 'playing') return
    if (this.maxTile >= this.target) {
      this.status = 'won'
      this.updateBest()
      return
    }
    if (this.movesLeft <= 0) {
      this.status = 'lost'
      return
    }
    if (!this.hasAnyMove()) {
      this.reshuffleBoard()
    }
  }

  private updateBest(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
  }

  pauseClock(): void {
    if (this.status !== 'playing') return
    if (this.pausedAt === null) this.pausedAt = Date.now()
  }

  resumeClock(): void {
    if (this.pausedAt === null) return
    const delta = Date.now() - this.pausedAt
    this.pausedAt = null
    this.startTime += delta
  }

  shiftClock(ms: number): void {
    if (ms > 0) this.startTime += ms
    this.pausedAt = null
  }

  getState(): Merge1024State {
    return {
      rows: this.preset.rows,
      cols: this.preset.cols,
      grid: this.cloneGrid(),
      chainPath: this.chainPath ? this.chainPath.map((p) => ({ ...p })) : null,
      hintPath: this.hintPath ? this.hintPath.map((p) => ({ ...p })) : null,
      score: this.score,
      bestScore: this.bestScore,
      target: this.target,
      maxTile: this.maxTile,
      movesLeft: this.movesLeft,
      maxCombo: this.maxCombo,
      startTime: this.startTime,
      status: this.status,
      difficulty: this.config.difficulty,
      theme: this.config.theme,
      level: this.level,
      undoLeft: this.undoLeft,
    }
  }

  loadState(state: Merge1024State): void {
    this.preset = {
      rows: state.rows,
      cols: state.cols,
      moves: MERGE1024_PRESETS[state.difficulty]?.moves ?? 30,
      target: state.target,
    }
    this.grid = state.grid.map((row) => [...row])
    this.chainPath = state.chainPath ? state.chainPath.map((p) => ({ ...p })) : null
    this.hintPath = state.hintPath ? state.hintPath.map((p) => ({ ...p })) : null
    this.score = state.score
    this.bestScore = state.bestScore
    this.target = state.target
    this.maxTile = state.maxTile
    this.movesLeft = state.movesLeft
    this.maxCombo = state.maxCombo
    this.startTime = state.startTime
    this.status = state.status
    this.config.difficulty = state.difficulty
    this.config.theme = state.theme
    this.level = state.level
    this.undoLeft = state.undoLeft ?? MAX_UNDO
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${state.difficulty}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? state.bestScore
    this.history = []
    this.lastCascade = []
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

  getDifficulty(): Merge1024Difficulty {
    return this.config.difficulty
  }

  getTheme(): Merge1024Theme {
    return this.config.theme
  }
}

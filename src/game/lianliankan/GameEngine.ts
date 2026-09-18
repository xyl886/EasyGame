/**
 * 连连看引擎（纯 TS，无 DOM 依赖）
 *
 * - 生成保证"每种图案成偶数个"的随机棋盘
 * - 经典 ≤2 弯路径判定（BFS 带方向转角计数，棋盘外围含虚拟空白可绕过）
 * - 提示：自动寻找一对可消除的相同图案
 * - 无解检测：任意两次 shuffle 后仍无解则重铺
 * - 撤销：保留最近 MAX_UNDO 步快照，可回退一步（不恢复倒计时）
 * - 关卡：level 越高时间越短、图案种类越多；进度持久化到 storage
 * - 倒计时：用 Date.now() 差值累计，页面隐藏后恢复可自动补偿
 * - 特殊图案（金卡）：随机标记若干对，消除时额外加分并连带再消一对
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  LinkState,
  LinkConfig,
  LinkMove,
  LinkDifficulty,
  LinkTheme,
  LinkStatus,
  LinkProgress,
} from './types'
import {
  SYMBOL_POOL,
  DEFAULT_LINK_CONFIG,
  linkScoreForPair,
  linkTimeBonus,
  LEVEL_PROGRESS_KEY,
  deriveLinkLevelParams,
  baseSymbol,
  isSpecialTile,
  LINK_SPECIAL_FLAG,
  LINK_SPECIAL_BONUS,
  LINK_TIME_BONUS_PER_SEC,
  MAX_UNDO,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-lianliankan-best'

/** 洗牌：产生一个每位置有解且两两成对的布局（用 Fisher-Yates 打乱图案序列） */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class LianliankanEngine implements BaseGame<LinkState, LinkMove> {
  private config: LinkConfig
  private rows!: number
  private cols!: number
  private grid: number[][] = []
  private selected: { r: number; c: number } | null = null
  private hint: LinkState['hint'] = null
  /**
   * 最近一次金卡对连带消除的额外一对（含消除前路径，供视图绘制连线反馈）。
   * 瞬态动画数据，不进入存档。
   */
  lastExtra: { r1: number; c1: number; r2: number; c2: number; path: Array<[number, number]> } | null = null
  private pairs = 0
  private moves = 0
  private score = 0
  private bestScore = 0
  private bestScoreKey: string
  private startTime = 0
  private status: LinkStatus = 'ready'
  // 关卡
  private level = 1
  // 倒计时
  private timeLimit = 0
  private timeLeft = 0
  private lastTickAt = 0
  // 撤销快照栈
  private history: Array<{ grid: number[][]; pairs: number; moves: number; score: number }> = []
  private undoLeft = MAX_UNDO

  constructor(config: Partial<LinkConfig> = {}) {
    this.config = { ...DEFAULT_LINK_CONFIG, ...config }
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${this.config.difficulty}-${this.config.theme}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? 0
    // 关卡：优先构造参数 → 持久化进度 → 默认 1
    const progress = StorageAdapter.get<LinkProgress>(LEVEL_PROGRESS_KEY)
    this.level =
      (config as Partial<LinkConfig> & { level?: number }).level ?? progress?.currentLevel ?? 1
    this.applyPreset()
    this.init()
  }

  getConfig(): LinkConfig {
    return { ...this.config }
  }

  private applyPreset(): void {
    const params = deriveLinkLevelParams(this.level, this.config.difficulty)
    this.rows = params.rows
    this.cols = params.cols
  }

  private makeSymbolList(): number[] {
    // 每个图案成对：取成对数量（向下取整到偶数个格子对应的对数）
    const total = this.rows * this.cols
    const qty = Math.floor(total / 2)
    const pool = SYMBOL_POOL[this.config.theme] ?? SYMBOL_POOL.fruit
    const params = deriveLinkLevelParams(this.level, this.config.difficulty)
    const symbolCount = Math.min(params.symbolCount, pool.length)
    // 先生成成对图案（每对两个相同 id）
    const pairs: number[][] = []
    for (let i = 0; i < qty; i++) {
      const sym = (i % symbolCount) + 1
      pairs.push([sym, sym])
    }
    // 随机选若干对标记为金卡（值 += LINK_SPECIAL_FLAG），保证成对
    const goldCount = Math.min(Math.max(1, Math.floor(qty * 0.1)), qty)
    const goldIndices = new Set<number>()
    while (goldIndices.size < goldCount) {
      goldIndices.add(Math.floor(Math.random() * qty))
    }
    for (const idx of goldIndices) {
      pairs[idx][0] += LINK_SPECIAL_FLAG
      pairs[idx][1] += LINK_SPECIAL_FLAG
    }
    // 展平为一维序列
    const list: number[] = []
    for (const p of pairs) list.push(p[0], p[1])
    return list
  }

  private init(): void {
    const list = shuffle(this.makeSymbolList())
    const total = this.rows * this.cols
    // 若格子数为奇数，去掉尾部一个（保证成对布局）
    const cells = total % 2 === 0 ? total : total - 1
    this.grid = Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.cols }, (_, c) => {
        const idx = r * this.cols + c
        return idx < cells ? list[idx] : 0
      }),
    )
    this.selected = null
    this.hint = null
    this.lastExtra = null
    this.pairs = 0
    this.moves = 0
    this.score = 0
    this.startTime = Date.now()
    this.status = 'playing'
    // 倒计时与撤销
    const params = deriveLinkLevelParams(this.level, this.config.difficulty)
    this.timeLimit = params.timeLimit
    this.timeLeft = this.timeLimit
    this.lastTickAt = Date.now()
    this.undoLeft = MAX_UNDO
    this.history = []
    // 开局若已无解则重铺
    let guard = 0
    while (!this.findAnyMove() && guard < 50) {
      const l2 = shuffle(this.makeSymbolList())
      this.grid = Array.from({ length: this.rows }, (_, r) =>
        Array.from({ length: this.cols }, (_, c) => {
          const idx = r * this.cols + c
          return idx < cells ? l2[idx] : 0
        }),
      )
      guard++
    }
  }

  /** ------------- 路径判定：BFS 带转弯计数 ------------- */

  /** 边界 + 同图案（按基础 id）预检，不含寻路 */
  private canPairTiles(r1: number, c1: number, r2: number, c2: number): boolean {
    if (
      (r1 === r2 && c1 === c2) ||
      r1 < 0 || r1 >= this.rows || c1 < 0 || c1 >= this.cols ||
      r2 < 0 || r2 >= this.rows || c2 < 0 || c2 >= this.cols
    ) {
      return false
    }
    const v1 = this.grid[r1][c1]
    const v2 = this.grid[r2][c2]
    if (v1 === 0 || v2 === 0 || baseSymbol(v1) !== baseSymbol(v2)) return false
    return true
  }

  /**
   * 判断两点是否可消除：相同图案（按基础 id 比较，金卡与普通同色卡可互配）且路径最多拐 2 次。
   * 用放大的虚拟棋盘（四周各扩 1 圈空白），允许从棋盘边缘绕出。
   */
  canConnect(r1: number, c1: number, r2: number, c2: number): boolean {
    if (!this.canPairTiles(r1, c1, r2, c2)) return false
    return this.findPath(r1, c1, r2, c2) !== null
  }

  /**
   * BFS（上下左右走，带转角计数限制 ≤2），返回路径虚拟坐标点列。
   * dp / parent 用 Int32Array 平面索引，避免每次三维数组与字符串 Map 分配。
   */
  private findPath(r1: number, c1: number, r2: number, c2: number): Array<[number, number]> | null {
    // 虚拟棋盘尺寸：四周各扩一圈
    const H = this.rows + 2
    const W = this.cols + 2
    const sR = r1 + 1
    const sC = c1 + 1
    const tR = r2 + 1
    const tC = c2 + 1

    const isBlock = (i: number, j: number): boolean => {
      if (i === sR && j === sC) return false
      if (i === tR && j === tC) return false
      if (i <= 0 || i >= H - 1 || j <= 0 || j >= W - 1) return false
      return this.grid[i - 1][j - 1] !== 0
    }

    const DR = [0, 1, 0, -1]
    const DC = [1, 0, -1, 0]
    const cells = H * W
    const plane = cells * 4
    const INF = 99
    // dp 索引 = (i * W + j) * 4 + d，值 = 以方向 d 进入 (i,j) 的最小转弯数
    const dp = new Int32Array(plane)
    dp.fill(INF)
    // parent 同索引；-2=未访问，-1=从起点直接进入
    const parent = new Int32Array(plane)
    parent.fill(-2)
    const stateIdx = (i: number, j: number, d: number) => (i * W + j) * 4 + d

    // 每 state 最多因转弯数变优入队约 3 次，预留 4 倍
    const qCap = plane * 4
    const qState = new Int32Array(qCap)
    const qTurns = new Int32Array(qCap)
    let head = 0
    let tail = 0
    let foundState = -1

    for (let d = 0; d < 4; d++) {
      const ni = sR + DR[d]
      const nj = sC + DC[d]
      if (ni < 0 || ni >= H || nj < 0 || nj >= W) continue
      if (isBlock(ni, nj)) continue
      const si = stateIdx(ni, nj, d)
      if (ni === tR && nj === tC) {
        parent[si] = -1
        foundState = si
        break
      }
      dp[si] = 0
      parent[si] = -1
      if (tail < qCap) {
        qState[tail] = si
        qTurns[tail] = 0
        tail++
      }
    }
    if (foundState < 0) {
      outer: while (head < tail) {
        const si = qState[head]
        const turns = qTurns[head]
        head++
        const cell = si >> 2
        const d = si & 3
        const i = (cell / W) | 0
        const j = cell - i * W
        for (let nd = 0; nd < 4; nd++) {
          if ((nd ^ 2) === d) continue
          const nt = turns + (nd === d ? 0 : 1)
          if (nt > 2) continue
          const ni = i + DR[nd]
          const nj = j + DC[nd]
          if (ni < 0 || ni >= H || nj < 0 || nj >= W) continue
          if (isBlock(ni, nj)) continue
          const nsi = stateIdx(ni, nj, nd)
          if (ni === tR && nj === tC) {
            if (nt < dp[nsi] || parent[nsi] === -2) {
              parent[nsi] = si
              dp[nsi] = nt
            }
            foundState = nsi
            break outer
          }
          if (nt < dp[nsi]) {
            dp[nsi] = nt
            parent[nsi] = si
            if (tail < qCap) {
              qState[tail] = nsi
              qTurns[tail] = nt
              tail++
            }
          }
        }
      }
    }
    if (foundState < 0) return null

    // 回溯路径（虚拟坐标序列，含起点与目标），并去除相邻重复点
    const path: Array<[number, number]> = []
    let si = foundState
    let guard = 0
    while (si >= 0 && guard++ < plane) {
      const cell = si >> 2
      const i = (cell / W) | 0
      const j = cell - i * W
      const last = path[path.length - 1]
      if (!last || last[0] !== i || last[1] !== j) path.push([i, j])
      const p = parent[si]
      if (p === -1) break
      if (p === -2) break
      si = p
    }
    path.push([sR, sC])
    path.reverse()
    // 二次去重（reverse 后首尾可能又相邻重复）
    const deduped: Array<[number, number]> = []
    for (const pt of path) {
      const last = deduped[deduped.length - 1]
      if (!last || last[0] !== pt[0] || last[1] !== pt[1]) deduped.push(pt)
    }
    return deduped
  }

  /**
   * 计算两点间的连通路径（≤2 弯）；不可连返回 null。
   * @returns 路径点序列（虚拟坐标，含起点终点），或 null
   */
  getPath(r1: number, c1: number, r2: number, c2: number): Array<[number, number]> | null {
    if (!this.canPairTiles(r1, c1, r2, c2)) return null
    return this.findPath(r1, c1, r2, c2)
  }

  /** 由已有路径统计转角次数（不再二次 BFS）；路径过短返回 0 */
  private turnsFromPath(path: Array<[number, number]>): number {
    let turns = 0
    for (let i = 2; i < path.length; i++) {
      const [pr, pc] = path[i - 2]
      const [r, c] = path[i - 1]
      const [nr, nc] = path[i]
      const dir1r = r - pr
      const dir1c = c - pc
      const dir2r = nr - r
      const dir2c = nc - c
      if (dir1r !== dir2r || dir1c !== dir2c) turns++
    }
    return Math.min(turns, 2)
  }

  // ------------- 移动 / 选择 -------------

  /** 处理一次点击：无选中→选中；已选中→尝试配对 */
  move(m: LinkMove): boolean {
    if (this.status !== 'playing') return false
    const { r, c } = m
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false
    const v = this.grid[r][c]
    if (v === 0) return false
    this.moves++
    this.hint = null
    this.lastExtra = null
    if (!this.selected) {
      this.selected = { r, c }
      return true
    }
    const sel = this.selected
    if (sel.r === r && sel.c === c) {
      // 再点同一个：取消选中
      this.selected = null
      return true
    }
    if (
      this.canPairTiles(sel.r, sel.c, r, c) &&
      baseSymbol(this.grid[sel.r][sel.c]) === baseSymbol(v)
    ) {
      // 单次 BFS：路径同时用于连通判定与转角计分
      const path = this.findPath(sel.r, sel.c, r, c)
      if (path) {
        // 真实消除前入栈快照（仅对消除入栈）
        this.saveHistory()
        const turns = this.turnsFromPath(path)
        const pairScore = linkScoreForPair(turns)
        const v1 = this.grid[sel.r][sel.c]
        const v2 = v
        const isGoldPair = isSpecialTile(v1) && isSpecialTile(v2)
        this.grid[sel.r][sel.c] = 0
        this.grid[r][c] = 0
        this.selected = null
        this.pairs++
        this.score += pairScore
        // 金卡对：额外加分并连带再消一对
        if (isGoldPair) {
          this.score += LINK_SPECIAL_BONUS
          const extra = this.findAnyMove()
          if (extra) {
            const et = extra.path ? this.turnsFromPath(extra.path) : 0
            this.grid[extra.r1][extra.c1] = 0
            this.grid[extra.r2][extra.c2] = 0
            this.pairs++
            this.score += linkScoreForPair(et)
            this.lastExtra = {
              r1: extra.r1, c1: extra.c1, r2: extra.r2, c2: extra.c2,
              path: extra.path ?? [[extra.r1 + 1, extra.c1 + 1], [extra.r2 + 1, extra.c2 + 1]],
            }
          }
        }
        if (this.isCleared()) {
          const elapsed = Math.floor((Date.now() - this.startTime) / 1000)
          this.score += linkTimeBonus(elapsed)
          // 倒计时剩余每秒额外奖励（在 linkTimeBonus 之外叠加）
          this.score += Math.floor(this.timeLeft) * LINK_TIME_BONUS_PER_SEC
          this.status = 'won'
          this.finalizeBest()
        } else if (!this.findAnyMove()) {
          // 死局：自动重铺剩余图案
          this.reshuffleRemaining()
        }
        return true
      }
    }
    // 不相同或不可连接：改选新格
    this.selected = { r, c }
    return true
  }

  // ------------- 撤销 -------------

  /** 深拷贝当前 grid/pairs/moves/score 入栈，滑动窗口保留 MAX_UNDO 步 */
  private saveHistory(): void {
    this.history.push({
      grid: this.grid.map((row) => [...row]),
      pairs: this.pairs,
      moves: this.moves,
      score: this.score,
    })
    if (this.history.length > MAX_UNDO) this.history.shift()
  }

  /** 撤销一步：弹栈恢复（不含 timeLeft），undoLeft--，清 selected/hint */
  undo(): boolean {
    if (this.undoLeft <= 0 || this.history.length === 0) return false
    const prev = this.history.pop()!
    this.grid = prev.grid.map((row) => [...row])
    this.pairs = prev.pairs
    this.moves = prev.moves
    this.score = prev.score
    this.undoLeft--
    this.selected = null
    this.hint = null
    this.lastExtra = null
    return true
  }

  canUndo(): boolean {
    return this.undoLeft > 0 && this.history.length > 0
  }

  // ------------- 关卡 -------------

  /** 进入下一关：level++、持久化进度、重新初始化 */
  nextLevel(): void {
    this.level++
    this.saveProgress()
    this.init()
  }

  /** 设置关卡：level=n 并重新初始化 */
  setLevel(n: number): void {
    this.level = n
    this.init()
  }

  /** 重置回第 1 关：持久化进度并重新初始化 */
  resetLevel(): void {
    this.level = 1
    this.saveProgress()
    this.init()
  }

  /** 持久化当前关卡进度（保留已解锁最大关卡） */
  private saveProgress(): void {
    const prev = StorageAdapter.get<LinkProgress>(LEVEL_PROGRESS_KEY)
    const progress: LinkProgress = {
      currentLevel: this.level,
      maxUnlocked: Math.max(this.level, prev?.maxUnlocked ?? 1),
    }
    StorageAdapter.set(LEVEL_PROGRESS_KEY, progress)
  }

  // ------------- 倒计时 -------------

  /** 页面隐藏/弹窗打开时挂起计时（不扣时间），resumeClock 时补偿 */
  private pausedAt: number | null = null

  pauseClock(): void {
    if (this.status !== 'playing') return
    if (this.pausedAt === null) this.pausedAt = Date.now()
  }

  /** 恢复计时：把暂停时长从倒计时和用时统计中剔除 */
  resumeClock(): void {
    if (this.pausedAt === null) return
    const delta = Date.now() - this.pausedAt
    this.pausedAt = null
    this.startTime += delta
    this.lastTickAt = Date.now()
  }

  /** 恢复存档后校正用时统计：把离开时长从 startTime 中剔除（存档时已记录 savedAt） */
  shiftClock(ms: number): void {
    if (ms > 0) this.startTime += ms
    this.lastTickAt = Date.now()
    this.pausedAt = null
  }

  /** 推进倒计时：非 playing 返回 false；归零后置 lost 并返回 true */
  tick(): boolean {
    if (this.status !== 'playing') return false
    if (this.pausedAt !== null) return false
    const now = Date.now()
    const delta = (now - this.lastTickAt) / 1000
    this.lastTickAt = now
    this.timeLeft = Math.max(0, this.timeLeft - delta)
    if (this.timeLeft <= 0) {
      this.status = 'lost'
      return true
    }
    return false
  }

  /** 重新铺满剩余空位（保留空格），清空选中/提示；洗后若仍无解则再次重铺 */
  reshuffleRemaining(): void {
    let guard = 0
    do {
      // 收集剩余图案（保留金卡标记的原值），洗后填回原位置
      const remaining: number[] = []
      for (const row of this.grid) {
        for (const v of row) {
          if (v !== 0) remaining.push(v)
        }
      }
      const filled = shuffle(remaining)
      let idx = 0
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] !== 0) {
            this.grid[r][c] = filled[idx++] ?? 0
          }
        }
      }
      this.selected = null
      this.hint = null
      guard++
      if (guard >= 100) break
    } while (!this.findAnyMove() && this.isAnyTileLeft())
  }

  /** 是否还有未消除的图案 */
  private isAnyTileLeft(): boolean {
    for (const row of this.grid) for (const v of row) if (v !== 0) return true
    return false
  }

  /** 手动洗牌按钮：重铺剩余图案 */
  reshuffle(): void {
    if (this.status !== 'playing') return
    this.reshuffleRemaining()
  }

  /** 提示：找一对可连接的相同图案并高亮 */
  hintNow(): boolean {
    if (this.status !== 'playing') return false
    const pair = this.findAnyMove()
    if (pair) {
      this.hint = { r1: pair.r1, c1: pair.c1, r2: pair.r2, c2: pair.c2 }
      return true
    }
    return false
  }

  /** 找到任意一对可连接的相同图案（按基础 id 分组）并附带路径；无则 null */
  private findAnyMove(): {
    r1: number
    c1: number
    r2: number
    c2: number
    path: Array<[number, number]> | null
  } | null {
    // 收集每种基础图案的位置
    const bySymbol = new Map<number, Array<[number, number]>>()
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const v = this.grid[r][c]
        if (v !== 0) {
          const base = baseSymbol(v)
          const arr = bySymbol.get(base) ?? []
          arr.push([r, c])
          bySymbol.set(base, arr)
        }
      }
    }
    for (const posList of bySymbol.values()) {
      for (let i = 0; i < posList.length; i++) {
        for (let j = i + 1; j < posList.length; j++) {
          const [r1, c1] = posList[i]
          const [r2, c2] = posList[j]
          const path = this.findPath(r1, c1, r2, c2)
          if (path) {
            return { r1, c1, r2, c2, path }
          }
        }
      }
    }
    return null
  }

  getSelected(): { r: number; c: number } | null {
    return this.selected
  }

  getHint(): LinkState['hint'] {
    return this.hint
  }

  private isCleared(): boolean {
    return this.grid.every((row) => row.every((v) => v === 0))
  }

  private finalizeBest(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
  }

  // ------------- 状态 -------------

  getState(): LinkState {
    return {
      rows: this.rows,
      cols: this.cols,
      grid: this.grid.map((row) => [...row]),
      selected: this.selected ? { ...this.selected } : null,
      hint: this.hint ? { ...this.hint } : null,
      pairs: this.pairs,
      moves: this.moves,
      score: this.score,
      bestScore: this.bestScore,
      startTime: this.startTime,
      status: this.status,
      difficulty: this.config.difficulty,
      theme: this.config.theme,
      timeLimit: this.timeLimit,
      timeLeft: this.timeLeft,
      level: this.level,
      undoLeft: this.undoLeft,
    }
  }

  loadState(state: LinkState): void {
    this.rows = state.rows
    this.cols = state.cols
    this.grid = state.grid.map((row) => [...row])
    this.selected = state.selected ? { ...state.selected } : null
    this.hint = state.hint ? { ...state.hint } : null
    this.pairs = state.pairs
    this.moves = state.moves
    this.score = state.score
    this.bestScore = state.bestScore
    this.startTime = state.startTime
    this.status = state.status
    this.config.difficulty = state.difficulty
    this.config.theme = state.theme
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${state.difficulty}-${state.theme}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? state.bestScore
    // 关卡/撤销/倒计时缺省回退（兼容旧存档）
    this.level = state.level ?? 1
    this.undoLeft = state.undoLeft ?? MAX_UNDO
    this.timeLimit =
      state.timeLimit ?? deriveLinkLevelParams(this.level, this.config.difficulty).timeLimit
    this.timeLeft = state.timeLeft ?? this.timeLimit
    this.lastTickAt = Date.now()
    this.pausedAt = null
    this.lastExtra = null
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

  getDifficulty(): LinkDifficulty {
    return this.config.difficulty
  }

  getTheme(): LinkTheme {
    return this.config.theme
  }
}

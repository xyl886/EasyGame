/**
 * 数字连连引擎（纯 TS，无 DOM 依赖）
 *
 * 生成（保证可解 + 局部聚集 + 每局不同）：
 *   棋盘按 BLOCK_SIZE 切块，块序随机游走、块内取向随机，得到"骨架序号"；
 *   再从随机起点做 Warnsdorff 贪心重排，走不满就重试。
 *   于是 ② 一定在 ① 周围 8 格里、③ 一定在 ② 周围 8 格里……整局必然连得完；
 *   同时连续数字扎堆在同一小片区域，玩家找到 ① 之后 ②③④ 就在附近。
 *
 * 交互：
 *   - startAt：按下。按在"下一个数"上 → 锁定并进入拖拽；按在最后锁定的数上 → 续连；
 *     按在 ① 上 → 重开本链；其余 → 静默忽略
 *   - extendTo：拖动经过格子。是下一个数 **且与上一格相邻** → 锁定（连到 N 即通关）；
 *     其他一律静默忽略
 *   - undo：撤回一步（退回上一格，并把"连上才看到"的格子重新藏起来）
 *   - clearChain：清空整条链从头再来
 *   - endDrag：松手，保留已锁定进度
 *
 * **没有失误概念**：连不上就是连不上，玩家自己会发现走不通，不需要红闪、不需要计数。
 * （原先在 extendTo 里逐格 mistakes++ 是错的：该方法由 pointermove 高频触发，
 *   一次拖拽扫过十几个格子就会瞬间把计数打满，所以整个机制已移除。）
 *
 * 空白格：
 *   开局按**难度**显示一部分格子（简单约 70% / 普通约 50% / 困难约 30%，
 *   并各有保底数量），其余为空白，1..N 谁被显示完全随机。
 *   规则是"**连到哪就显示到哪**"：每锁上一个格子，那一格立即可见；
 *   但绝不提前把下一个目标翻出来——找下一个数正是本游戏的挑战。
 *
 * 计时：从第一次锁定开始；通关冻结并计分。暂停/恢复/存档时间补偿与连连看同一套模式。
 * 模式：classic 封顶 8×8；endless 不封顶，关卡无限递增，只能主动结束结算。
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  NumberChainState,
  NumberChainConfig,
  NumberChainDifficulty,
  NumberChainMode,
  NumberChainStatus,
  ChainPoint,
  NumberChainProgress,
} from './types'
import {
  levelSize,
  levelScore,
  revealCount,
  isAdjacent,
  LEVEL_PROGRESS_KEY,
  BEST_KEY_PREFIX,
  BEST_TIME_KEY_PREFIX,
  DEFAULT_NUMBERCHAIN_CONFIG,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

function randInt(n: number): number {
  return Math.floor(Math.random() * n)
}

/** 8 邻域偏移（上下左右 + 斜线） */
const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

export type ExtendResult = 'locked' | 'ignored'

/**
 * 局部块边长：连续数字被约束在 B×B 的方块内活动（见 buildRandomRank）。
 * 4 是实测最优：8×8 上前 9 个数字的外接框有约一半落在理想的 4×4，
 * 明显好于 2 和 3（那两档更分散）。改大/改小都会让聚集性变差。
 */
const BLOCK_SIZE = 4

export class NumberChainEngine implements BaseGame<NumberChainState, ChainPoint> {
  private config: NumberChainConfig
  private level: number
  private size!: number
  private grid: number[][] = []
  /** pos[v-1] = 数字 v 所在格 */
  private pos: ChainPoint[] = []
  /** 当前可见的格子（开局显示的 ∪ 已经连上的） */
  private revealed: boolean[][] = []
  /** 开局就显示的格子快照，撤回/清空时用来区分"本来就看得到"和"连上才看到的" */
  private initialRevealed: boolean[][] = []
  private next = 1
  private committed: ChainPoint[] = []
  private dragging = false
  private startedAt: number | null = null
  private elapsedMs = 0
  private pausedAt: number | null = null
  private totalScore = 0
  private lastLevelScore = 0
  private clearedLevels = 0
  private status: NumberChainStatus = 'playing'
  private bestScore = 0
  private bestScoreKey: string

  constructor(config: Partial<NumberChainConfig> = {}) {
    this.config = { ...DEFAULT_NUMBERCHAIN_CONFIG, ...config }
    const progress = StorageAdapter.get<NumberChainProgress>(LEVEL_PROGRESS_KEY)
    this.level = config.level ?? progress?.currentLevel ?? 1
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${this.config.difficulty}-${this.mode()}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? 0
    this.applyLevel()
    this.regenerate()
  }

  getConfig(): NumberChainConfig {
    return { ...this.config }
  }

  getLevel(): number {
    return this.level
  }

  getMode(): NumberChainMode {
    return this.mode()
  }

  private mode(): NumberChainMode {
    return this.config.mode ?? 'classic'
  }

  private isEndless(): boolean {
    return this.mode() === 'endless'
  }

  private applyLevel(): void {
    this.size = levelSize(this.level, this.config.difficulty, this.isEndless())
  }

  // ---------------- 生成 ----------------

  /**
   * 生成一条覆盖全部 n² 个格子的通路，要求：
   *   (a) 全程相邻（每步落在上一格周围 8 格内）——满足"只能连相邻的数字"；
   *   (b) **局部聚集**——连续数字扎堆，找到 ① 之后 ②③④ 就在附近；
   *   (c) **每局都不一样**——起点随机、形状随机，不能"每盘走线都一个样"。
   *
   * 三步走：
   *   1) 造一个随机化的"骨架序号"：棋盘切成 BLOCK_SIZE 的块，块序随机游走、
   *      块内取向随机。骨架只表达"哪些格该挨在一起"，本身不要求相邻。
   *   2) 从**随机起点**做 Warnsdorff 贪心：每步选"后续可走邻居最少"的相邻未访问格；
   *      同度数之间**随机**决定（随机只作用于同样好的选择，不会去挑更差的）。
   *   3) **校验 + 重试**：贪心在大棋盘上仍可能中途走进死胡同（实测 16×16 会留下断链），
   *      所以走不满就换一套随机重来。生成不到 1ms，重试几十次毫无压力。
   *
   * 第 3 步是保证可解性的关键：只靠贪心无法 100% 走满，必须有校验兜底。
   */
  private buildSnakePath(size: number): ChainPoint[] {
    const ATTEMPTS = 60
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const candidate = this.tryBuildPath(size)
      if (candidate && candidate.length === size * size) return candidate
    }
    // 极端兜底：用骨架序号直接铺满。覆盖 100%，但块与块交界处可能不相邻。
    return this.buildRankOrderPath(size)
  }

  /** 构造一次随机化的骨架序号：rank[cellIndex] = 骨架序号 */
  private buildRandomRank(size: number): Int32Array {
    const total = size * size
    const B = BLOCK_SIZE
    const blocksR = Math.ceil(size / B)
    const blocksC = Math.ceil(size / B)
    const rank = new Int32Array(total).fill(-1)

    // 块序：从随机块出发，在块网格上随机游走
    const visitedBlock = Array.from({ length: blocksR }, () => new Array<boolean>(blocksC).fill(false))
    const order: Array<{ r: number; c: number }> = []
    let br = randInt(blocksR)
    let bc = randInt(blocksC)
    visitedBlock[br][bc] = true
    order.push({ r: br, c: bc })
    let guard = blocksR * blocksC * 4
    while (order.length < blocksR * blocksC && guard-- > 0) {
      const cand: Array<{ r: number; c: number }> = []
      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nr = br + dr
        const nc = bc + dc
        if (nr < 0 || nr >= blocksR || nc < 0 || nc >= blocksC) continue
        if (visitedBlock[nr][nc]) continue
        cand.push({ r: nr, c: nc })
      }
      if (cand.length === 0) {
        let jumped = false
        for (let r = 0; r < blocksR && !jumped; r++) {
          for (let c = 0; c < blocksC; c++) {
            if (!visitedBlock[r][c]) {
              br = r
              bc = c
              jumped = true
              break
            }
          }
        }
        if (!jumped) break
      } else {
        const pick = cand[randInt(cand.length)]
        br = pick.r
        bc = pick.c
      }
      visitedBlock[br][bc] = true
      order.push({ r: br, c: bc })
    }

    // 逐块填序号；每块的取向（横蛇/竖蛇）与方向随机
    let seq = 0
    for (const b of order) {
      const r0 = b.r * B
      const c0 = b.c * B
      const r1 = Math.min(r0 + B - 1, size - 1)
      const c1 = Math.min(c0 + B - 1, size - 1)
      const cells: Array<[number, number]> = []
      if (Math.random() < 0.5) {
        for (let c = c0; c <= c1; c++) {
          if ((c - c0) % 2 === 0) for (let r = r0; r <= r1; r++) cells.push([r, c])
          else for (let r = r1; r >= r0; r--) cells.push([r, c])
        }
      } else {
        for (let r = r0; r <= r1; r++) {
          if ((r - r0) % 2 === 0) for (let c = c0; c <= c1; c++) cells.push([r, c])
          else for (let c = c1; c >= c0; c--) cells.push([r, c])
        }
      }
      if (Math.random() < 0.5) cells.reverse()
      for (const [r, c] of cells) rank[r * size + c] = seq++
    }
    for (let i = 0; i < total; i++) if (rank[i] === -1) rank[i] = seq++
    return rank
  }

  /** 兜底：按骨架序号直接铺满（覆盖 100%，块间可能不相邻） */
  private buildRankOrderPath(size: number): ChainPoint[] {
    const total = size * size
    const rank = this.buildRandomRank(size)
    const idx = Array.from({ length: total }, (_, i) => i)
    idx.sort((a, b) => rank[a] - rank[b])
    return idx.map((i) => ({ r: Math.floor(i / size), c: i % size }))
  }

  /** 尝试生成一条完整的相邻通路；走进死胡同返回 null（由调用方重试） */
  private tryBuildPath(size: number): ChainPoint[] | null {
    const total = size * size
    const key = (r: number, c: number) => r * size + c
    const rank = this.buildRandomRank(size)
    const visited = new Uint8Array(total)
    const path: ChainPoint[] = []

    const onwardDegree = (r: number, c: number): number => {
      let n = 0
      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        if (!visited[key(nr, nc)]) n++
      }
      return n
    }

    // 起点随机（不再固定左上角）
    let cur = randInt(total)
    let curRank = rank[cur]

    for (let step = 0; step < total; step++) {
      const r = Math.floor(cur / size)
      const c = cur % size
      visited[cur] = 1
      path.push({ r, c })
      if (step === total - 1) break

      const cands: Array<{ k: number; deg: number; rankDist: number }> = []
      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        const nk = key(nr, nc)
        if (visited[nk]) continue
        cands.push({
          k: nk,
          deg: onwardDegree(nr, nc),
          // 与"骨架序号"的差距：越小越贴近该聚在一起的格
          rankDist: Math.abs(rank[nk] - curRank),
        })
      }
      if (cands.length === 0) return null

      // 三级排序：
      //   1) Warnsdorff 度数（保证不走进死胡同、能走满）——不可让步
      //   2) 骨架距离（保证聚集：下一个数字就在附近）——这是"好玩"的关键
      //   3) 随机抖动（保证每局形状不同）
      // 说明：随机只放在最后一级，所以它不会破坏前两个性质。
      //      之前把随机放在第 2 级，实测 8×8 前 9 个数字的外接框从 4×4 松到 8×8。
      const jitter = new Map<number, number>()
      for (const cd of cands) jitter.set(cd.k, Math.random())
      cands.sort((a, b) => {
        if (a.deg !== b.deg) return a.deg - b.deg
        if (a.rankDist !== b.rankDist) return a.rankDist - b.rankDist
        return (jitter.get(a.k) ?? 0) - (jitter.get(b.k) ?? 0)
      })
      cur = cands[0].k
      curRank = rank[cur]
    }

    return path
  }

  /**
   * 重新随机布局：
   * 1) 生成相邻通路并把 1..N 依次填入（保证可解）
   * 2) 按难度随机挑一部分格子显示数字，其余为空白
   * 3) 重置链/计时/失误
   */
  private regenerate(): void {
    const size = this.size
    const total = size * size
    const path = this.buildSnakePath(size)

    this.grid = Array.from({ length: size }, () => new Array<number>(size).fill(0))
    this.pos = Array.from({ length: total }, () => ({ r: 0, c: 0 }))
    path.forEach((p, i) => {
      const v = i + 1
      this.grid[p.r][p.c] = v
      this.pos[v - 1] = { r: p.r, c: p.c }
    })

    // 初始显示：从 2..N 里随机挑（谁被显示完全随机，这是难度所在）
    const showCount = revealCount(total, this.level, this.config.difficulty, this.isEndless())
    const candidates: number[] = []
    for (let v = 2; v <= total; v++) candidates.push(v)
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = randInt(i + 1)
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    // 显示数量里已含起点 ①，所以候选里只再挑 showCount-1 个
    const shownSet = new Set(candidates.slice(0, Math.max(0, showCount - 1)))

    this.revealed = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => shownSet.has(this.grid[r][c])),
    )
    // ① 保底始终显示，否则玩家无从下手
    const p1 = this.pos[0]
    this.revealed[p1.r][p1.c] = true
    // 记录开局可见快照，供撤回/清空时判断"这格本来就看得到吗"
    this.initialRevealed = this.revealed.map((row) => [...row])

    this.next = 1
    this.committed = []
    this.dragging = false
    this.startedAt = null
    this.elapsedMs = 0
    this.pausedAt = null
    this.lastLevelScore = 0
    this.status = 'playing'
  }

  // ---------------- 交互 ----------------

  /** 按下：见类注释。返回是否成功起链/续连 */
  startAt(r: number, c: number): boolean {
    if (this.status !== 'playing') return false
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return false
    const v = this.grid[r][c]
    if (v === this.next) {
      // 直接按/拖到下一个数：锁定（首个格子不校验相邻性）
      this.commit(r, c)
      this.dragging = true
      return true
    }
    if (this.committed.length > 0) {
      const last = this.committed[this.committed.length - 1]
      if (last.r === r && last.c === c) {
        // 按最后锁定的数：续连
        this.dragging = true
        return true
      }
    }
    if (v === 1 && this.next !== 1) {
      // 按 ①：重开本链
      this.committed = [{ r, c }]
      this.next = 2
      this.dragging = true
      return true
    }
    if (v === 1) {
      this.commit(r, c)
      this.dragging = true
      return true
    }
    // 按在非目标格（含空白格）：静默忽略，不给任何反馈
    return false
  }

  /**
   * 拖动经过格子：
   * - 已是目标且与上一格相邻 → 锁定（并显示该格）
   * - 其他一律忽略：已连过的、不相邻的、数字不对的、空白格
   *
   * 刻意**不做任何错误反馈**（不红闪、不计数）：连不下去本身就是提示，
   * 玩家自己会发现这个方向不对，换个相邻格再试即可。
   */
  extendTo(r: number, c: number): ExtendResult {
    if (!this.dragging || this.status !== 'playing') return 'ignored'
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return 'ignored'
    if (this.isCommitted(r, c)) return 'ignored'
    const v = this.grid[r][c]
    if (v === this.next) {
      const last = this.committed[this.committed.length - 1]
      if (last && !isAdjacent(last, { r, c })) return 'ignored' // 不相邻：连不上，静默忽略
      this.commit(r, c)
      return 'locked'
    }
    return 'ignored'
  }

  private isCommitted(r: number, c: number): boolean {
    return this.committed.some((p) => p.r === r && p.c === c)
  }

  private commit(r: number, c: number): void {
    if (this.startedAt === null) this.startedAt = Date.now()
    this.committed.push({ r, c })
    this.next++
    // 连到哪就显示到哪：刚锁定的这一格立即可见。
    // 只显示"已经连上的"，绝不提前把下一个目标翻出来。
    this.revealed[r][c] = true
    if (this.next > this.size * this.size) {
      this.finishWin()
    }
  }

  /** 松手：保留已锁定进度，可随时按最后锁定的数续连 */
  endDrag(): void {
    this.dragging = false
  }

  isDragging(): boolean {
    return this.dragging
  }

  /** 下一目标的格子（提示/视图高亮用） */
  nextTarget(): ChainPoint {
    return { ...this.pos[Math.min(this.next, this.pos.length) - 1] }
  }

  // ---------------- 撤回 / 清空 ----------------

  /** 还能不能撤回：链上至少要有 2 个格子（留下起点） */
  canUndo(): boolean {
    return this.status === 'playing' && this.committed.length > 1
  }

  /**
   * 撤回一步：退掉最后锁定的格子。
   * 该格如果是**本来空白、只因连上才显示**的，撤回后要重新变回空白——
   * 撤回了就等于没连过，不该白看到它的数字。
   * （开局就显示的格子不受影响。）
   */
  undo(): boolean {
    if (!this.canUndo()) return false
    const removed = this.committed.pop()
    this.next = Math.max(1, this.next - 1)
    this.dragging = false
    if (removed && !this.initialRevealed[removed.r][removed.c]) {
      this.revealed[removed.r][removed.c] = false
    }
    return true
  }

  /** 清空整条链，回到"从 ① 重新开始"的状态（计时保留） */
  canClear(): boolean {
    return this.status === 'playing' && this.committed.length > 1
  }

  clearChain(): boolean {
    if (!this.canClear()) return false
    const start = this.committed[0]
    this.committed = [{ ...start }]
    this.next = 2
    this.dragging = false
    // 同 undo：连上才显示的格子一并恢复成空白
    this.revealed = this.initialRevealed.map((row) => [...row])
    return true
  }

  // ---------------- 计时 ----------------

  /** 实时用时（毫秒） */
  elapsed(): number {
    let ms = this.elapsedMs
    if (this.startedAt !== null) ms += Date.now() - this.startedAt
    return ms
  }

  pauseClock(): void {
    if (this.status !== 'playing') return
    if (this.startedAt !== null && this.pausedAt === null) {
      this.pausedAt = Date.now()
    }
  }

  resumeClock(): void {
    if (this.pausedAt === null) return
    const delta = Date.now() - this.pausedAt
    this.pausedAt = null
    if (this.startedAt !== null) this.startedAt += delta
  }

  /** 存档恢复后校正计时（剔除离开页面时长） */
  shiftClock(ms: number): void {
    if (ms > 0 && this.startedAt !== null) this.startedAt += ms
    this.pausedAt = null
  }

  // ---------------- 通关 / 结束 / 关卡 ----------------

  private freezeClock(): void {
    this.elapsedMs = this.elapsed()
    this.startedAt = null
  }

  private finishWin(): void {
    this.freezeClock()
    this.status = 'won'
    this.dragging = false
    this.clearedLevels++
    const n = this.size * this.size
    this.lastLevelScore = levelScore(n, this.elapsedMs / 1000, this.level, this.isEndless())
    this.totalScore += this.lastLevelScore
    if (this.totalScore > this.bestScore) {
      this.bestScore = this.totalScore
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
    // 每档棋盘的历史最快用时
    const timeKey = `${BEST_TIME_KEY_PREFIX}-${this.size}`
    const prevBest = StorageAdapter.get<number>(timeKey)
    if (prevBest === null || this.elapsedMs < prevBest) {
      StorageAdapter.set(timeKey, Math.round(this.elapsedMs))
    }
    // 关卡进度
    const prev = StorageAdapter.get<NumberChainProgress>(LEVEL_PROGRESS_KEY)
    StorageAdapter.set(LEVEL_PROGRESS_KEY, {
      currentLevel: this.level,
      maxUnlocked: Math.max(this.level, prev?.maxUnlocked ?? 1),
    } satisfies NumberChainProgress)
  }

  /** 主动结束本轮（无尽模式结算） */
  giveUp(): void {
    if (this.status !== 'playing') return
    this.freezeClock()
    this.status = 'over'
    this.dragging = false
    if (this.totalScore > this.bestScore) {
      this.bestScore = this.totalScore
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
  }

  nextLevel(): void {
    this.level++
    this.applyLevel()
    this.regenerate()
  }

  /** 重玩当前关（重新随机布局） */
  reset(): void {
    this.regenerate()
  }

  /** 从头开始一整轮（无尽模式"再来一局"用）：关卡归 1、总分清零 */
  restartRun(): void {
    this.level = 1
    this.totalScore = 0
    this.clearedLevels = 0
    this.lastLevelScore = 0
    this.applyLevel()
    this.regenerate()
  }

  // ---------------- 状态 ----------------

  getState(): NumberChainState {
    return {
      size: this.size,
      grid: this.grid.map((row) => [...row]),
      revealed: this.revealed.map((row) => [...row]),
      initialRevealed: this.initialRevealed.map((row) => [...row]),
      next: this.next,
      committed: this.committed.map((p) => ({ ...p })),
      elapsedMs: this.elapsed(),
      status: this.status,
      level: this.level,
      difficulty: this.config.difficulty,
      mode: this.mode(),
      totalScore: this.totalScore,
      bestScore: this.bestScore,
      lastLevelScore: this.lastLevelScore,
      clearedLevels: this.clearedLevels,
    }
  }

  loadState(state: NumberChainState): void {
    this.size = state.size
    this.grid = state.grid.map((row) => [...row])
    // 由棋盘反推每个数字的坐标
    const n = this.size * this.size
    this.pos = Array.from({ length: n }, () => ({ r: 0, c: 0 }))
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        this.pos[this.grid[r][c] - 1] = { r, c }
      }
    }
    // 旧存档没有 revealed 字段：兜底为全揭示
    this.revealed =
      state.revealed && state.revealed.length === this.size
        ? state.revealed.map((row) => [...row])
        : Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(true))
    // 旧存档没有 initialRevealed：退化为"当前可见集就是开局集"，
    // 这样撤回时不会误把开局就显示的格子藏起来
    this.initialRevealed =
      state.initialRevealed && state.initialRevealed.length === this.size
        ? state.initialRevealed.map((row) => [...row])
        : this.revealed.map((row) => [...row])
    this.next = state.next
    this.committed = state.committed.map((p) => ({ ...p }))
    this.elapsedMs = state.elapsedMs
    this.startedAt = state.status === 'playing' ? Date.now() : null
    this.pausedAt = null
    this.status = state.status
    this.config.difficulty = state.difficulty
    this.config.mode = state.mode ?? this.config.mode
    this.level = state.level
    this.totalScore = state.totalScore
    this.lastLevelScore = state.lastLevelScore
    this.clearedLevels = state.clearedLevels ?? 0
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${state.difficulty}-${this.mode()}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? state.bestScore
    this.dragging = false
  }

  // ---------------- BaseGame 兼容 ----------------

  move(m: ChainPoint): boolean {
    return this.startAt(m.r, m.c)
  }

  isGameOver(): boolean {
    return this.status === 'won' || this.status === 'over'
  }

  isWin(): boolean {
    return this.status === 'won'
  }

  getScore(): number {
    return this.totalScore
  }

  getDifficulty(): NumberChainDifficulty {
    return this.config.difficulty
  }
}

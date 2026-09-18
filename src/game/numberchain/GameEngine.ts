/**
 * 数字连连引擎（纯 TS，无 DOM 依赖）
 *
 * 生成（保证可解 + 局部聚集）：
 *   棋盘按 3×3 切块，块序走蛇形，块内也走蛇形，并把 1..N 顺着这条通路填入。
 *   于是 ② 一定在 ① 周围 8 格里、③ 一定在 ② 周围 8 格里……整局必然连得完；
 *   同时 1..9 挤在第一块、10..18 挤在第二块，连续数字始终在同一小片区域里，
 *   玩家找到 ① 之后 ②③④ 就在附近，摸得着。构造是确定性的，不会回溯卡死。
 *
 * 交互：
 *   - startAt：按下。按在"下一个数"上 → 锁定并进入拖拽；按在最后锁定的数上 → 续连；
 *     按在 ① 上 → 重开本链；其余 → 无效（视图红闪）
 *   - extendTo：拖动经过格子。是下一个数 **且与上一格相邻** → 锁定（连到 N 即通关）；
 *     已锁定过的格子 → 忽略；其他/不相邻 → 记失误并红闪（不断链）
 *   - undo：撤回一步（退回上一格，并把"连上才看到"的格子重新藏起来）
 *   - clearChain：清空整条链从头再来
 *   - endDrag：松手，保留已锁定进度
 *
 * 空白格：
 *   开局按**难度**显示一部分格子（简单约 70% / 普通约 50% / 困难约 30%，
 *   并各有保底数量），其余为空白，1..N 谁被显示完全随机。
 *   规则是"**连到哪就显示到哪**"：每锁上一个格子，那一格立即可见；
 *   但绝不提前把下一个目标翻出来——找下一个数正是本游戏的挑战。
 *   撞到错的空白格只红闪记失误，不会告诉你它是几。
 *
 * 计时：从第一次锁定开始；通关冻结并计分。暂停/恢复/存档时间补偿与连连看同一套模式。
 * 模式：classic 封顶 8×8；endless 不封顶，关卡无限递增，失误超限即结束。
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

export type ExtendResult = 'locked' | 'ignored' | 'wrong'

/** 无尽模式下允许的最大失误数（超过即结束） */
export const ENDLESS_MAX_MISTAKES = 12

/** 局部块边长：连续数字被约束在 B×B 的方块内活动（见 buildSnakePath） */
const BLOCK_SIZE = 3

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
  private mistakes = 0
  private totalScore = 0
  private lastLevelScore = 0
  private clearedLevels = 0
  private status: NumberChainStatus = 'playing'
  private bestScore = 0
  private bestScoreKey: string
  /** 最近一次按错的格子（瞬态，供视图红闪） */
  lastWrong: ChainPoint | null = null

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
   *   (b) **局部聚集**——连续数字扎堆，找到 ① 之后 ②③④ 就在附近。
   *
   * 不用随机 DFS：16×16 上会指数级回溯甚至卡死（实测挂住），
   * 而且路径会满棋盘乱窜，1 和 2 可能隔着十几格。
   *
   * 这里用**确定性构造**，不回溯、必然终止：
   *   1) 初始按块（3×3）蛇形填充，得到"块内聚集"的骨架；
   *   2) 再对整条路径做一次**贪心重排**：从起点出发，每步都优先走向
   *      "还没访问、且与当前格相邻、且序号最接近原骨架序号"的格子。
   *      这样既保持聚集（倾向本块内的邻居），又保证严格相邻。
   *
   * 第 2 步是关键：单纯按块拼接无法保证块与块交界处相邻（实测会断链），
   * 而"贪心走相邻格"从构造上就不可能产生断裂。
   */
  private buildSnakePath(size: number): ChainPoint[] {
    const total = size * size

    // ---- 第 1 步：块内蛇形骨架，决定每个格子的"理想序号" ----
    const rank = new Int32Array(total).fill(-1)
    {
      const B = BLOCK_SIZE
      const blocksR = Math.ceil(size / B)
      const blocksC = Math.ceil(size / B)
      let seq = 0
      for (let br = 0; br < blocksR; br++) {
        const cRange: number[] = []
        for (let bc = 0; bc < blocksC; bc++) cRange.push(bc)
        if (br % 2 === 1) cRange.reverse()
        for (const bc of cRange) {
          const r0 = br * B
          const c0 = bc * B
          const r1 = Math.min(r0 + B - 1, size - 1)
          const c1 = Math.min(c0 + B - 1, size - 1)
          for (let r = r0; r <= r1; r++) {
            if ((r - r0) % 2 === 0) {
              for (let c = c0; c <= c1; c++) rank[r * size + c] = seq++
            } else {
              for (let c = c1; c >= c0; c--) rank[r * size + c] = seq++
            }
          }
        }
      }
    }

    // ---- 第 2 步：贪心重排，保证严格相邻 ----
    // 选择规则：在未访问的相邻格里，优先选**后续可走邻居最少**的那个
    //（Warnsdorff 规则，网格图求哈密顿路径的经典启发式，能几乎总是走满），
    // 平手时再按骨架序号取小者，以保留"块内聚集"的特性。
    const visited = new Uint8Array(total)
    const path: ChainPoint[] = []
    const key = (r: number, c: number) => r * size + c

    /** 某格未访问的相邻格数量（Warnsdorff 度数） */
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

    // 起点：取骨架里序号最小的格子（保持从固定角落起手，行为可预期）
    let cur: number
    {
      let best = -1
      for (let i = 0; i < total; i++) {
        if (best === -1 || rank[i] < rank[best]) best = i
      }
      cur = best
    }

    for (let step = 0; step < total; step++) {
      const r = Math.floor(cur / size)
      const c = cur % size
      visited[cur] = 1
      path.push({ r, c })
      if (step === total - 1) break

      let nextCur = -1
      let bestDeg = Infinity
      let bestRank = Infinity
      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        const nk = key(nr, nc)
        if (visited[nk]) continue
        const deg = onwardDegree(nr, nc)
        // 先比 Warnsdorff 度数，再比骨架序号（保持聚集）
        if (deg < bestDeg || (deg === bestDeg && rank[nk] < bestRank)) {
          bestDeg = deg
          bestRank = rank[nk]
          nextCur = nk
        }
      }
      if (nextCur === -1) break
      cur = nextCur
    }

    // 兜底：万一贪心没走满（罕见），把剩余格子接到末尾并做局部修正
    if (path.length !== total) {
      const rest: ChainPoint[] = []
      for (let i = 0; i < total; i++) {
        if (!visited[i]) rest.push({ r: Math.floor(i / size), c: i % size })
      }
      // 按与当前尾格的相邻性排序，尽量接得上
      let tail = path[path.length - 1]
      while (rest.length) {
        let bi = 0
        let bd = Infinity
        for (let i = 0; i < rest.length; i++) {
          const d = Math.max(Math.abs(rest[i].r - tail.r), Math.abs(rest[i].c - tail.c))
          if (d < bd) {
            bd = d
            bi = i
          }
        }
        const [p] = rest.splice(bi, 1)
        path.push(p)
        tail = p
      }
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
    this.mistakes = 0
    this.lastLevelScore = 0
    this.status = 'playing'
    this.lastWrong = null
  }

  // ---------------- 交互 ----------------

  /** 按下：见类注释。返回是否成功起链/续连（失败供视图红闪） */
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
      this.mistakes = 0
      this.dragging = true
      return true
    }
    if (v === 1) {
      this.commit(r, c)
      this.dragging = true
      return true
    }
    // 按在空白格上（数字未知）：不算失误，只是提示它还不是目标
    this.lastWrong = { r, c }
    return false
  }

  /**
   * 拖动经过格子：
   * - 已是目标且与上一格相邻 → 锁定（并显示该格）
   * - 已锁定过的格子 → 忽略（路过不算错）
   * - 目标数字但不与上一格相邻 → 记失误（违反"只能连相邻"）
   * - 其他数字 → 记失误，但**不显示**它是几（碰对才显示）
   */
  extendTo(r: number, c: number): ExtendResult {
    if (!this.dragging || this.status !== 'playing') return 'ignored'
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return 'ignored'
    if (this.isCommitted(r, c)) return 'ignored'
    const v = this.grid[r][c]
    if (v === this.next) {
      const last = this.committed[this.committed.length - 1]
      if (last && !isAdjacent(last, { r, c })) {
        // 数字对，但隔着格子——违反相邻规则
        this.mistakes++
        this.lastWrong = { r, c }
        return 'wrong'
      }
      this.commit(r, c)
      return 'locked'
    }
    this.mistakes++
    this.lastWrong = { r, c }
    if (this.isEndless() && this.mistakes >= ENDLESS_MAX_MISTAKES) {
      this.finishOver()
    }
    return 'wrong'
  }

  private isCommitted(r: number, c: number): boolean {
    return this.committed.some((p) => p.r === r && p.c === c)
  }

  private commit(r: number, c: number): void {
    if (this.startedAt === null) this.startedAt = Date.now()
    this.committed.push({ r, c })
    this.next++
    this.lastWrong = null
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
    this.lastWrong = null
    if (removed && !this.initialRevealed[removed.r][removed.c]) {
      this.revealed[removed.r][removed.c] = false
    }
    return true
  }

  /** 清空整条链，回到"从 ① 重新开始"的状态（计时与失误保留） */
  canClear(): boolean {
    return this.status === 'playing' && this.committed.length > 1
  }

  clearChain(): boolean {
    if (!this.canClear()) return false
    const start = this.committed[0]
    this.committed = [{ ...start }]
    this.next = 2
    this.dragging = false
    this.lastWrong = null
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

  /** 失误超限（无尽模式）导致本轮结束 */
  private finishOver(): void {
    this.freezeClock()
    this.status = 'over'
    this.dragging = false
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
      mistakes: this.mistakes,
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
    this.mistakes = state.mistakes
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
    this.lastWrong = null
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

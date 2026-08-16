/**
 * 蜘蛛纸牌引擎（纯 TS，无 DOM 依赖）
 *
 * 规则：
 * - 两副牌共 104 张，10 列；目标把同花色 K→A 完整序列收集完（8 组）即获胜
 * - 可移动一串同花色且降序连续的牌到另一列（目标列顶牌 = 串底牌+1，或空列）
 * - 牌堆剩余时点击发牌，给每列各发一张
 * - 任何列出现完整 K→A 同花色序列自动收走
 */
import type { BaseGame } from '../base/BaseGame'
import type {
  SpiderState,
  SpiderConfig,
  Card,
  SpiderStatus,
  DealResult,
} from './types'
import {
  SPIDER_TOTAL_GROUPS,
  spiderScore,
  shuffleStrength,
  difficultyId,
  DEFAULT_SPIDER_CONFIG,
} from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_KEY_PREFIX = 'easygame-spider-best'

const COLS = 10

function shuffled<T>(arr: T[], strength = 1): T[] {
  const a = [...arr]
  // strength 控制洗牌强度：<1 只随机交换部分位置（简单档保留更多顺序）
  const swapCount = Math.floor(a.length * strength)
  for (let i = 0; i < swapCount; i++) {
    const j = Math.floor(Math.random() * a.length)
    const k = Math.floor(Math.random() * a.length)
    ;[a[j], a[k]] = [a[k], a[j]]
  }
  return a
}

export class SpiderEngine implements BaseGame<SpiderState, number> {
  private config: SpiderConfig
  private columns: Card[][] = []
  private stock: Card[] = []
  private completed = 0
  private moves = 0
  private status: SpiderStatus = 'ready'
  private selected: { col: number; count: number } | null = null
  private startTime = 0
  private bestScore = 0
  private bestScoreKey: string
  /** 撤销历史：每步操作的反向描述 */
  private history: Array<() => void> = []
  /** 最近一次收牌事件（视图动画用）：{ 列号, 时间戳 } */
  private lastCompletedEvent: { col: number; time: number } | null = null

  constructor(config: Partial<SpiderConfig> = {}) {
    this.config = { ...DEFAULT_SPIDER_CONFIG, ...config }
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${difficultyId(this.config)}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? 0
    this.init()
  }

  getConfig(): SpiderConfig {
    return { ...this.config }
  }

  private init(): void {
    // 按花色数组牌（两副 = 104 张）
    const suits = [0, 1, 2, 3].slice(0, this.config.suits)
    const deck: Card[] = []
    for (const suit of suits) {
      for (let copy = 0; copy < 8 / suits.length; copy++) {
        for (let rank = 1; rank <= 13; rank++) {
          deck.push({ rank, suit })
        }
      }
    }
    const cards = shuffled(deck, shuffleStrength(this.config.mode))
    // 发 54 张到 10 列（前 4 列 6 张、后 6 列 5 张），每列末张翻开
    this.columns = Array.from({ length: COLS }, () => [] as Card[])
    let idx = 0
    for (let c = 0; c < COLS; c++) {
      const n = c < 4 ? 6 : 5
      for (let i = 0; i < n; i++) {
        this.columns[c].push(cards[idx++])
      }
    }
    this.stock = cards.slice(idx)
    this.completed = 0
    this.moves = 0
    this.status = 'ready'
    this.selected = null
    this.startTime = 0
    this.history = []
  }

  // ===== 可移动性判定 =====

  /** 从列顶向下检查：同花色且降序连续的串长度（至少 1） */
  private topRunLength(col: number): number {
    const colCards = this.columns[col]
    if (colCards.length === 0) return 0
    let len = 1
    for (let i = colCards.length - 1; i > 0; i--) {
      const cur = colCards[i]
      const prev = colCards[i - 1]
      if (cur.suit === prev.suit && cur.rank === prev.rank - 1) len++
      else break
    }
    return len
  }

  /** 从列内 index 位置到列顶是否构成同花色降序串 */
  private isRunFrom(col: number, fromIdx: number): boolean {
    for (let i = fromIdx; i < this.columns[col].length - 1; i++) {
      const cur = this.columns[col][i]
      const next = this.columns[col][i + 1]
      if (cur.suit !== next.suit || cur.rank !== next.rank + 1) return false
    }
    return true
  }

  /**
   * 选中一列中的一串牌（点击该列某张牌时调用）。
   * 点击列顶 → 选中最长可移动串；点击列内 → 从该牌到列顶必须是同花色降序串。
   * @returns 选中的 count（0 = 无法选中）
   */
  selectAt(col: number, fromIdx: number): number {
    if (this.status !== 'ready' && this.status !== 'playing') return 0
    const colCards = this.columns[col]
    if (colCards.length === 0) return 0
    if (fromIdx < 0 || fromIdx >= colCards.length) return 0
    if (!this.isRunFrom(col, fromIdx)) return 0
    const count = colCards.length - fromIdx
    this.selected = { col, count }
    return count
  }

  /** 点击列顶 → 选中最长同花色降序串 */
  selectTop(col: number): number {
    if (this.status !== 'ready' && this.status !== 'playing') return 0
    if (this.columns[col].length === 0) return 0
    const run = this.topRunLength(col)
    if (run === 0) return 0
    this.selected = { col, count: run }
    return run
  }

  clearSelection(): void {
    this.selected = null
  }

  getSelected(): { col: number; count: number } | null {
    return this.selected
  }

  /** BaseGame 接口：move = 把选中串移到目标列 */
  move(toCol: number): boolean {
    return this.moveSelected(toCol)
  }

  /** 尝试把选中的串移动到目标列。返回是否成功 */
  moveSelected(toCol: number): boolean {
    if (this.status !== 'ready' && this.status !== 'playing') return false
    if (!this.selected) return false
    if (this.selected.col === toCol) {
      this.selected = null
      return false
    }
    const ok = this.tryMove(this.selected.col, toCol, this.selected.count)
    if (ok) this.selected = null
    return ok
  }

  /**
   * 直接尝试移动 fromCol 顶部 count 张到 toCol。
   * 校验：串合法（同花色降序）+ 目标合法（空列或顶牌=串底+1）。
   */
  tryMove(fromCol: number, toCol: number, count: number): boolean {
    if (!this.canMoveTo(fromCol, toCol, count)) return false
    const from = this.columns[fromCol]
    const to = this.columns[toCol]
    const fromIdx = from.length - count
    // 执行移动
    const moved = from.splice(fromIdx, count)
    const fromBefore = [...from]
    const toBefore = [...to]
    to.push(...moved)
    this.moves++
    if (this.status === 'ready') this.startTime = Date.now()
    this.status = 'playing'
    // 撤销记录
    this.history.push(() => {
      // 从 to 尾部移除 count 张
      for (let i = 0; i < count; i++) to.pop()
      // 恢复
      this.columns[fromCol] = fromBefore
      this.columns[toCol] = toBefore
    })
    this.completeAndCheck()
    this.updateBest()
    return true
  }

  /** 纯校验：fromCol 顶部 count 张能否移到 toCol（不改变状态） */
  canMoveTo(fromCol: number, toCol: number, count: number): boolean {
    if (fromCol < 0 || fromCol >= COLS || toCol < 0 || toCol >= COLS) return false
    if (fromCol === toCol) return false
    if (count <= 0) return false
    const from = this.columns[fromCol]
    const to = this.columns[toCol]
    if (count > from.length) return false
    const fromIdx = from.length - count
    if (!this.isRunFrom(fromCol, fromIdx)) return false
    const bottom = from[fromIdx]
    if (to.length > 0) {
      const top = to[to.length - 1]
      if (top.rank !== bottom.rank + 1) return false
    }
    return true
  }

  /** 所有可移动串及其合法目标列（提示功能用） */
  findMoves(): Array<{ col: number; count: number; targets: number[] }> {
    if (this.status !== 'ready' && this.status !== 'playing') return []
    const moves: Array<{ col: number; count: number; targets: number[] }> = []
    for (let c = 0; c < COLS; c++) {
      const run = this.topRunLength(c)
      if (run === 0) continue
      const targets: number[] = []
      for (let t = 0; t < COLS; t++) {
        if (this.canMoveTo(c, t, run)) targets.push(t)
      }
      if (targets.length > 0) moves.push({ col: c, count: run, targets })
    }
    return moves
  }

  /** 自动把 (col, count) 串移到第一个合法目标（双击/提示用）。返回是否成功 */
  autoMove(col: number, count: number): boolean {
    const targets: number[] = []
    for (let t = 0; t < COLS; t++) {
      if (this.canMoveTo(col, t, count)) targets.push(t)
    }
    if (targets.length === 0) return false
    return this.tryMove(col, targets[0], count)
  }

  /** 发牌：参考经典规则——有空列不能发牌；剩余不足 10 张不能发牌（游戏结束） */
  deal(): DealResult {
    if (this.status !== 'ready' && this.status !== 'playing') return 'done'
    if (this.stock.length < 10) return 'insufficient'
    if (this.columns.some((c) => c.length === 0)) return 'empty-col'
    const before = this.columns.map((c) => [...c])
    const stockBefore = [...this.stock]
    for (let c = 0; c < COLS; c++) {
      const card = this.stock.pop()!
      this.columns[c].push(card)
    }
    this.moves++
    if (this.status === 'ready') this.startTime = Date.now()
    this.status = 'playing'
    this.history.push(() => {
      this.columns = before.map((c) => [...c])
      this.stock = [...stockBefore]
    })
    this.completeAndCheck()
    this.updateBest()
    return 'ok'
  }

  /** 自动收走所有完整 K→A 同花色序列 */
  private completeAndCheck(): void {
    let found = true
    while (found) {
      found = false
      for (let c = 0; c < COLS; c++) {
        const col = this.columns[c]
        if (col.length < 13) continue
        // 检查列尾 13 张是否 K..A 同花色
        const top13 = col.slice(col.length - 13)
        const suit = top13[0].suit
        let ok = true
        for (let i = 0; i < 13; i++) {
          if (top13[i].suit !== suit || top13[i].rank !== 13 - i) {
            ok = false
            break
          }
        }
        if (ok) {
          const before = [...col]
          col.splice(col.length - 13, 13)
          this.completed++
          this.lastCompletedEvent = { col: c, time: Date.now() }
          this.history.push(() => {
            this.columns[c] = before
            this.completed--
          })
          found = true
          break
        }
      }
    }
    if (this.completed >= SPIDER_TOTAL_GROUPS) {
      this.status = 'won'
      this.updateBest()
    }
  }

  private updateBest(): void {
    const s = this.getScore()
    if (s > this.bestScore) {
      this.bestScore = s
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
  }

  /** 最近一次收牌事件（null=尚无；视图检测后置空） */
  getLastCompleted(): { col: number; time: number } | null {
    return this.lastCompletedEvent
  }

  clearLastCompleted(): void {
    this.lastCompletedEvent = null
  }

  /** 撤销一步（含移动/发牌/收牌） */
  undo(): boolean {
    if (this.status === 'won' || this.history.length === 0) return false
    const undoFn = this.history.pop()!
    undoFn()
    this.moves--
    if (this.status === 'playing' && this.moves === 0) this.status = 'ready'
    this.selected = null
    return true
  }

  canUndo(): boolean {
    return this.status !== 'won' && this.history.length > 0
  }

  getScore(): number {
    return spiderScore(this.moves, this.completed)
  }

  getState(): SpiderState {
    return {
      columns: this.columns.map((c) => [...c]),
      stock: [...this.stock],
      completed: this.completed,
      moves: this.moves,
      score: this.getScore(),
      selected: this.selected ? { ...this.selected } : null,
      status: this.status,
      startTime: this.startTime,
      bestScore: this.bestScore,
      suits: this.config.suits,
      mode: this.config.mode,
    }
  }

  loadState(state: SpiderState): void {
    this.columns = state.columns.map((c) => [...c])
    this.stock = [...state.stock]
    this.completed = state.completed
    this.moves = state.moves
    this.selected = state.selected ? { ...state.selected } : null
    this.status = state.status
    this.startTime = state.startTime
    this.config.suits = state.suits
    this.config.mode = state.mode
    this.bestScoreKey = `${BEST_KEY_PREFIX}-${difficultyId(this.config)}`
    this.bestScore = StorageAdapter.get<number>(this.bestScoreKey) ?? 0
    // 撤销历史不跨存档
    this.history = []
  }

  isGameOver(): boolean {
    return this.status === 'won'
  }

  isWin(): boolean {
    return this.status === 'won'
  }

  reset(): void {
    this.init()
  }
}

import type { BaseGame } from '../base/BaseGame'

export type MemoryStatus = 'playing' | 'won'

export interface MemoryCard {
  id: number
  symbol: string
  open: boolean
  matched: boolean
}

export interface MemoryState {
  cards: MemoryCard[]
  pairCount: number
  moves: number
  pairs: number
  status: MemoryStatus
  mismatchPending: boolean
  startedAt: number
}

const SYMBOLS = ['🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🦊', '🐸']

export interface MemoryConfig {
  pairs: number
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export class MemoryMatchEngine implements BaseGame<MemoryState, number> {
  private state!: MemoryState
  private pairCount: number

  constructor(config: Partial<MemoryConfig> = {}) {
    this.pairCount = [4, 6, 8].includes(config.pairs ?? 8) ? config.pairs ?? 8 : 8
    this.reset()
  }

  getState(): MemoryState {
    return { ...this.state, cards: this.state.cards.map((card) => ({ ...card })) }
  }

  loadState(state: MemoryState): void {
    const pairCount = [4, 6, 8].includes(state.pairCount) ? state.pairCount : 8
    this.pairCount = pairCount
    this.state = { ...state, pairCount, cards: state.cards.map((card) => ({ ...card })) }
  }

  move(index: number): boolean {
    const card = this.state.cards[index]
    if (!card || this.state.status !== 'playing' || this.state.mismatchPending || card.open || card.matched) {
      return false
    }
    if (!this.state.startedAt) this.state.startedAt = Date.now()
    card.open = true
    const opened = this.state.cards.filter((item) => item.open && !item.matched)
    if (opened.length === 2) {
      this.state.moves++
      if (opened[0].symbol === opened[1].symbol) {
        opened.forEach((item) => (item.matched = true))
        this.state.pairs++
        if (this.state.pairs === this.pairCount) this.state.status = 'won'
      } else {
        this.state.mismatchPending = true
      }
    }
    return true
  }

  resolveMismatch(): void {
    if (!this.state.mismatchPending) return
    this.state.cards.forEach((card) => {
      if (!card.matched) card.open = false
    })
    this.state.mismatchPending = false
  }

  isGameOver(): boolean {
    return this.state.status === 'won'
  }

  isWin(): boolean {
    return this.state.status === 'won'
  }

  reset(): void {
    const symbols = SYMBOLS.slice(0, this.pairCount)
    const deck = shuffled([...symbols, ...symbols])
    this.state = {
      pairCount: this.pairCount,
      cards: deck.map((symbol, id) => ({ id, symbol, open: false, matched: false })),
      moves: 0,
      pairs: 0,
      status: 'playing',
      mismatchPending: false,
      startedAt: 0,
    }
  }

  getScore(): number {
    return this.state.pairs
  }
}

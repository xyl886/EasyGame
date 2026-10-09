import type { BaseGame } from '../base/BaseGame'

export interface HashiIsland {
  id: number
  row: number
  col: number
  required: number
}

export interface HashiState {
  puzzleIndex: number
  islands: HashiIsland[]
  bridges: Record<string, number>
  selected: number | null
  status: 'playing' | 'won'
}

interface HashiSegment {
  horizontal: boolean
  row: number
  col: number
  min: number
  max: number
}

const PUZZLES: HashiIsland[][] = [
  [
    { id: 0, row: 1, col: 1, required: 1 }, { id: 1, row: 1, col: 3, required: 2 }, { id: 2, row: 1, col: 5, required: 1 },
  ],
  [
    { id: 0, row: 1, col: 3, required: 1 }, { id: 1, row: 3, col: 3, required: 2 }, { id: 2, row: 5, col: 3, required: 1 },
  ],
  [
    { id: 0, row: 1, col: 1, required: 1 }, { id: 1, row: 1, col: 3, required: 3 },
    { id: 2, row: 1, col: 5, required: 1 }, { id: 3, row: 3, col: 3, required: 2 },
    { id: 4, row: 5, col: 3, required: 1 },
  ],
  [
    { id: 0, row: 1, col: 1, required: 1 }, { id: 1, row: 1, col: 5, required: 2 },
    { id: 2, row: 5, col: 5, required: 2 }, { id: 3, row: 5, col: 1, required: 1 },
  ],
]

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

export class HashiEngine implements BaseGame<HashiState, number> {
  private state!: HashiState

  constructor() {
    this.reset()
  }

  getState(): HashiState {
    return { ...this.state, islands: this.state.islands.map((island) => ({ ...island })), bridges: { ...this.state.bridges } }
  }

  loadState(state: HashiState): void {
    this.state = { ...state, islands: state.islands.map((island) => ({ ...island })), bridges: { ...state.bridges } }
  }

  move(islandId: number): boolean {
    if (this.state.status !== 'playing' || !this.state.islands.some((island) => island.id === islandId)) return false
    if (this.state.selected === null) {
      this.state.selected = islandId
      return true
    }
    const from = this.state.selected
    this.state.selected = null
    if (from === islandId) return true
    if (!this.isVisible(from, islandId)) {
      this.state.selected = islandId
      return true
    }
    const key = edgeKey(from, islandId)
    const current = this.state.bridges[key] ?? 0
    if (current === 2) {
      delete this.state.bridges[key]
      this.updateWinStatus()
      return true
    }
    if (!this.crossesExisting(from, islandId) && this.degree(from) < this.island(from).required && this.degree(islandId) < this.island(islandId).required) {
      this.state.bridges[key] = current + 1
      this.updateWinStatus()
    } else if (current === 1) {
      delete this.state.bridges[key]
      this.updateWinStatus()
    } else {
      this.state.selected = islandId
    }
    return true
  }

  degree(islandId: number): number {
    let total = 0
    for (const [key, count] of Object.entries(this.state.bridges)) {
      const [a, b] = key.split('-').map(Number)
      if (a === islandId || b === islandId) total += count
    }
    return total
  }

  totalBridges(): number {
    return Object.values(this.state.bridges).reduce((sum, count) => sum + count, 0)
  }

  nextPuzzle(): void {
    const puzzleIndex = (this.state.puzzleIndex + 1) % PUZZLES.length
    this.loadPuzzle(puzzleIndex)
  }

  isGameOver(): boolean {
    return this.state.status === 'won'
  }

  isWin(): boolean {
    return this.state.status === 'won'
  }

  reset(): void {
    this.loadPuzzle(0)
  }

  getScore(): number {
    return this.totalBridges()
  }

  private loadPuzzle(index: number): void {
    this.state = {
      puzzleIndex: index,
      islands: PUZZLES[index].map((island) => ({ ...island })),
      bridges: {},
      selected: null,
      status: 'playing',
    }
  }

  private island(id: number): HashiIsland {
    return this.state.islands.find((island) => island.id === id)!
  }

  private isVisible(a: number, b: number): boolean {
    const first = this.island(a)
    const second = this.island(b)
    if (first.row !== second.row && first.col !== second.col) return false
    return !this.state.islands.some((island) => {
      if (island.id === a || island.id === b) return false
      if (first.row === second.row && island.row === first.row) {
        return island.col > Math.min(first.col, second.col) && island.col < Math.max(first.col, second.col)
      }
      if (first.col === second.col && island.col === first.col) {
        return island.row > Math.min(first.row, second.row) && island.row < Math.max(first.row, second.row)
      }
      return false
    })
  }

  private crossesExisting(a: number, b: number): boolean {
    const candidate = this.segment(a, b)
    return Object.keys(this.state.bridges).some((key) => {
      const [x, y] = key.split('-').map(Number)
      if (edgeKey(a, b) === key) return false
      return this.segmentsCross(candidate, this.segment(x, y))
    })
  }

  private segment(a: number, b: number): HashiSegment {
    const first = this.island(a)
    const second = this.island(b)
    return first.row === second.row
      ? { horizontal: true, row: first.row, col: 0, min: Math.min(first.col, second.col), max: Math.max(first.col, second.col) }
      : { horizontal: false, row: 0, col: first.col, min: Math.min(first.row, second.row), max: Math.max(first.row, second.row) }
  }

  private segmentsCross(a: HashiSegment, b: HashiSegment): boolean {
    if (a.horizontal === b.horizontal) return false
    const horizontal = a.horizontal ? a : b
    const vertical = a.horizontal ? b : a
    return vertical.col > horizontal.min && vertical.col < horizontal.max && horizontal.row > vertical.min && horizontal.row < vertical.max
  }

  private updateWinStatus(): void {
    const allSatisfied = this.state.islands.every((island) => this.degree(island.id) === island.required)
    if (!allSatisfied) return
    const seen = new Set<number>()
    const queue = [this.state.islands[0].id]
    while (queue.length) {
      const current = queue.pop()!
      if (seen.has(current)) continue
      seen.add(current)
      for (const [key, count] of Object.entries(this.state.bridges)) {
        if (!count) continue
        const [a, b] = key.split('-').map(Number)
        if (a === current && !seen.has(b)) queue.push(b)
        if (b === current && !seen.has(a)) queue.push(a)
      }
    }
    if (seen.size === this.state.islands.length) this.state.status = 'won'
  }
}

import type { BaseGame } from '../base/BaseGame'

export interface LightsOutState {
  size: number
  cells: boolean[]
  moves: number
  status: 'playing' | 'won'
}

export class LightsOutEngine implements BaseGame<LightsOutState, number> {
  private state!: LightsOutState

  constructor(size = 5) {
    const safeSize = [3, 5, 7].includes(size) ? size : 5
    this.state = { size: safeSize, cells: [], moves: 0, status: 'playing' }
    this.reset()
  }

  getState(): LightsOutState {
    return { ...this.state, cells: [...this.state.cells] }
  }

  loadState(state: LightsOutState): void {
    this.state = { ...state, cells: [...state.cells] }
  }

  move(index: number): boolean {
    if (this.state.status !== 'playing' || !Number.isInteger(index) || index < 0 || index >= this.state.cells.length) return false
    this.toggleCross(index)
    this.state.moves++
    if (this.state.cells.every(Boolean)) this.state.status = 'won'
    return true
  }

  isGameOver(): boolean {
    return this.state.status === 'won'
  }

  isWin(): boolean {
    return this.state.status === 'won'
  }

  reset(): void {
    this.state.cells = new Array(this.state.size * this.state.size).fill(true)
    this.state.moves = 0
    this.state.status = 'playing'
    for (let i = 0; i < this.state.cells.length; i++) {
      if (Math.random() < 0.48) this.toggleCross(i)
    }
    if (this.state.cells.every(Boolean)) this.toggleCross(Math.floor(this.state.cells.length / 2))
  }

  getScore(): number {
    return Math.max(0, 1000 - this.state.moves)
  }

  private toggleCross(index: number): void {
    const row = Math.floor(index / this.state.size)
    const col = index % this.state.size
    const cells = [index]
    if (row > 0) cells.push(index - this.state.size)
    if (row < this.state.size - 1) cells.push(index + this.state.size)
    if (col > 0) cells.push(index - 1)
    if (col < this.state.size - 1) cells.push(index + 1)
    cells.forEach((cell) => (this.state.cells[cell] = !this.state.cells[cell]))
  }
}

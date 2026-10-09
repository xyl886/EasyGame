import type { BaseGame } from '../base/BaseGame'

export interface NonogramPuzzle {
  id: string
  name: string
  rows: string[]
}

export interface NonogramState {
  puzzleId: string
  puzzleName: string
  solution: boolean[]
  filled: boolean[]
  marked: boolean[]
  markMode: boolean
  moves: number
  status: 'playing' | 'won'
}

const PUZZLES: NonogramPuzzle[] = [
  { id: 'heart', name: '爱心', rows: ['01010', '11111', '11111', '01110', '00100'] },
  { id: 'smiley', name: '笑脸', rows: ['00100', '01010', '00000', '10001', '01110'] },
  { id: 'tree', name: '小树', rows: ['00100', '01110', '11111', '01110', '01110'] },
  { id: 'cup', name: '杯子', rows: ['01110', '11111', '01110', '01110', '01110'] },
]

export function nonogramHints(cells: boolean[]): number[] {
  const result: number[] = []
  let run = 0
  for (const filled of cells) {
    if (filled) run++
    else if (run) {
      result.push(run)
      run = 0
    }
  }
  if (run) result.push(run)
  return result.length ? result : [0]
}

export class NonogramEngine implements BaseGame<NonogramState, [number, number]> {
  private puzzleIndex = 0
  private state!: NonogramState

  constructor() {
    this.reset()
  }

  getState(): NonogramState {
    return { ...this.state, solution: [...this.state.solution], filled: [...this.state.filled], marked: [...this.state.marked] }
  }

  loadState(state: NonogramState): void {
    this.state = { ...state, solution: [...state.solution], filled: [...state.filled], marked: [...state.marked] }
    this.puzzleIndex = Math.max(0, PUZZLES.findIndex((puzzle) => puzzle.id === state.puzzleId))
  }

  move([row, col]: [number, number]): boolean {
    const size = this.size()
    if (this.state.status !== 'playing' || row < 0 || row >= size || col < 0 || col >= size) return false
    const index = row * size + col
    if (this.state.markMode) {
      this.state.marked[index] = !this.state.marked[index]
      if (this.state.marked[index]) this.state.filled[index] = false
    } else {
      this.state.filled[index] = !this.state.filled[index]
      if (this.state.filled[index]) this.state.marked[index] = false
    }
    this.state.moves++
    if (this.isSolved()) this.state.status = 'won'
    return true
  }

  toggleMarkMode(): void {
    this.state.markMode = !this.state.markMode
  }

  rowHints(row: number): number[] {
    const size = this.size()
    return nonogramHints(this.state.solution.slice(row * size, (row + 1) * size))
  }

  columnHints(col: number): number[] {
    const size = this.size()
    return nonogramHints(Array.from({ length: size }, (_, row) => this.state.solution[row * size + col]))
  }

  isSolved(): boolean {
    return this.state.solution.every((cell, index) => cell === this.state.filled[index])
  }

  nextPuzzle(): void {
    this.puzzleIndex = (this.puzzleIndex + 1) % PUZZLES.length
    this.reset()
  }

  isGameOver(): boolean {
    return this.state.status === 'won'
  }

  isWin(): boolean {
    return this.state.status === 'won'
  }

  reset(): void {
    const puzzle = PUZZLES[this.puzzleIndex]
    const solution = puzzle.rows.flatMap((line) => [...line].map((cell) => cell === '1'))
    this.state = {
      puzzleId: puzzle.id,
      puzzleName: puzzle.name,
      solution,
      filled: new Array(solution.length).fill(false),
      marked: new Array(solution.length).fill(false),
      markMode: false,
      moves: 0,
      status: 'playing',
    }
  }

  getScore(): number {
    return Math.max(0, 1000 - this.state.moves)
  }

  private size(): number {
    return Math.sqrt(this.state.solution.length)
  }
}

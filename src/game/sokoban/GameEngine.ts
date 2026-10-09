import type { BaseGame } from '../base/BaseGame'

export type SokobanDirection = 'up' | 'down' | 'left' | 'right'

export interface SokobanLevel {
  map: string[]
}

export interface SokobanState {
  level: number
  rows: number
  cols: number
  walls: number[]
  targets: number[]
  boxes: number[]
  player: number
  moves: number
  status: 'playing' | 'won'
}

export interface SokobanConfig {
  startLevel: number
}

const LEVELS: SokobanLevel[] = [
  { map: ['######', '#    #', '# @$ .#', '#    #', '######'] },
  { map: ['#######', '#  .  #', '#  $  #', '#  @  #', '#  $  #', '#  .  #', '#######'] },
  { map: ['#######', '#...  #', '#$$$  #', '#  @  #', '#     #', '#######'] },
]

const DELTA: Record<SokobanDirection, [number, number]> = {
  up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
}

export class SokobanEngine implements BaseGame<SokobanState, SokobanDirection> {
  private state!: SokobanState
  private history: SokobanState[] = []
  private startLevel: number

  constructor(config: Partial<SokobanConfig> = {}) {
    this.startLevel = this.clampLevel(config.startLevel ?? 0)
    this.loadLevel(this.startLevel)
  }

  getState(): SokobanState {
    return {
      ...this.state,
      walls: [...this.state.walls],
      targets: [...this.state.targets],
      boxes: [...this.state.boxes],
    }
  }

  loadState(state: SokobanState): void {
    this.state = {
      ...state,
      walls: [...state.walls],
      targets: [...state.targets],
      boxes: [...state.boxes],
    }
    this.history = []
  }

  move(direction: SokobanDirection): boolean {
    if (this.state.status !== 'playing') return false
    if (!Object.prototype.hasOwnProperty.call(DELTA, direction)) return false
    const row = Math.floor(this.state.player / this.state.cols)
    const col = this.state.player % this.state.cols
    const [dr, dc] = DELTA[direction]
    const nextRow = row + dr
    const nextCol = col + dc
    if (nextRow < 0 || nextRow >= this.state.rows || nextCol < 0 || nextCol >= this.state.cols) return false
    const next = nextRow * this.state.cols + nextCol
    if (this.state.walls.includes(next)) return false
    const boxIndex = this.state.boxes.indexOf(next)
    let boxes = [...this.state.boxes]
    if (boxIndex >= 0) {
      const beyondRow = nextRow + dr
      const beyondCol = nextCol + dc
      if (beyondRow < 0 || beyondRow >= this.state.rows || beyondCol < 0 || beyondCol >= this.state.cols) return false
      const beyond = beyondRow * this.state.cols + beyondCol
      if (this.state.walls.includes(beyond) || boxes.includes(beyond)) return false
      boxes[boxIndex] = beyond
    }
    this.history.push(this.getState())
    this.state.player = next
    this.state.boxes = boxes
    this.state.moves++
    if (boxes.every((box) => this.state.targets.includes(box))) this.state.status = 'won'
    return true
  }

  undo(): boolean {
    const previous = this.history.pop()
    if (!previous) return false
    this.state = previous
    return true
  }

  nextLevel(): boolean {
    if (this.state.status !== 'won' || this.state.level >= LEVELS.length - 1) return false
    this.loadLevel(this.state.level + 1)
    return true
  }

  isGameOver(): boolean {
    return this.state.status === 'won'
  }

  isWin(): boolean {
    return this.state.status === 'won'
  }

  reset(): void {
    this.loadLevel(this.state.level)
  }

  setStartLevel(level: number): void {
    this.startLevel = this.clampLevel(level)
    this.loadLevel(this.startLevel)
  }

  getScore(): number {
    return Math.max(0, 1000 - this.state.moves)
  }

  private loadLevel(level: number): void {
    const map = LEVELS[level].map
    const walls: number[] = []
    const targets: number[] = []
    const boxes: number[] = []
    let player = 0
    const rows = map.length
    const cols = Math.max(...map.map((line) => line.length))
    map.forEach((line, row) => {
      for (let col = 0; col < line.length; col++) {
        const index = row * cols + col
        const cell = line[col]
        if (cell === '#') walls.push(index)
        if (cell === '.' || cell === '*' || cell === '+') targets.push(index)
        if (cell === '$' || cell === '*') boxes.push(index)
        if (cell === '@' || cell === '+') player = index
      }
    })
    this.state = { level, rows, cols, walls, targets, boxes, player, moves: 0, status: 'playing' }
    this.history = []
  }

  private clampLevel(level: number): number {
    return Number.isInteger(level) ? Math.max(0, Math.min(LEVELS.length - 1, level)) : 0
  }
}

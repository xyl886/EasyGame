import type { BaseGame } from '../base/BaseGame'
import type { Direction, Game2048State, Tile, Grid, Game2048Config } from './types'
import { DIFFICULTY_TWO_RATIO, DEFAULT_CONFIG } from './types'
import { StorageAdapter } from '../../adapters/StorageAdapter'

const BEST_SCORE_KEY_PREFIX = 'easygame-2048-best'
const SIZE_RANGE: [number, number] = [4, 7]

let tileIdCounter = 1

function nextTileId(): number {
  return tileIdCounter++
}

function createEmptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array<Tile | null>(size).fill(null))
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) =>
    row.map((tile) => (tile ? { ...tile, isNew: false, isMerged: false, mergedFrom: undefined } : null)),
  )
}

function getEmptyCells(grid: Grid): Array<{ row: number; col: number }> {
  const empty: Array<{ row: number; col: number }> = []
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) empty.push({ row: r, col: c })
    }
  }
  return empty
}

function clampSize(size: number): number {
  const [min, max] = SIZE_RANGE
  return Math.max(min, Math.min(max, Math.floor(size) || min))
}

/**
 * 2048 游戏核心引擎
 * 纯 TS 实现，不依赖 Vue 或 DOM，可直接迁移到小程序
 */
export class Game2048Engine implements BaseGame<Game2048State, Direction> {
  private config: Game2048Config
  private size: number
  private grid: Grid
  private score: number
  private bestScore: number
  private bestScoreKey: string
  private won: boolean
  private over: boolean
  private keepPlaying: boolean
  private history: Array<{ grid: Grid; score: number }>

  constructor(config: Partial<Game2048Config> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.config.size = clampSize(this.config.size)
    this.size = this.config.size
    // 最高分按尺寸+难度分键：4×4 经典与 7×7 噩梦不应共用同一个记录
    this.bestScoreKey = `${BEST_SCORE_KEY_PREFIX}-${this.size}-${this.config.difficulty}`
    // 迁移：若新键不存在但老键 easygame-2048-best 有值，迁移过来作为初始值
    const stored = StorageAdapter.get<number>(this.bestScoreKey)
    if (stored !== null && stored !== undefined) {
      this.bestScore = stored
    } else {
      const legacy = StorageAdapter.get<number>(BEST_SCORE_KEY_PREFIX)
      this.bestScore = legacy ?? 0
      if (this.bestScore > 0) {
        StorageAdapter.set(this.bestScoreKey, this.bestScore)
      }
    }
    this.grid = createEmptyGrid(this.size)
    this.score = 0
    this.won = false
    this.over = false
    this.keepPlaying = false
    this.history = []
    this.addInitialTiles()
  }

  getConfig(): Game2048Config {
    return { ...this.config }
  }

  private get twoRatio(): number {
    return DIFFICULTY_TWO_RATIO[this.config.difficulty]
  }

  private addInitialTiles(): void {
    for (let i = 0; i < this.config.initialTiles; i++) {
      this.addRandomTile()
    }
  }

  private addRandomTile(): Tile | null {
    const empty = getEmptyCells(this.grid)
    if (empty.length === 0) return null
    const { row, col } = empty[Math.floor(Math.random() * empty.length)]
    const value = Math.random() < this.twoRatio ? 2 : 4
    const tile: Tile = {
      id: nextTileId(),
      value,
      row,
      col,
      isNew: true,
    }
    this.grid[row][col] = tile
    return tile
  }

  private saveHistory(): void {
    this.history.push({
      grid: cloneGrid(this.grid),
      score: this.score,
    })
    if (this.history.length > 20) this.history.shift()
  }

  undo(): boolean {
    const snapshot = this.history.pop()
    if (!snapshot) return false
    this.grid = snapshot.grid
    this.score = snapshot.score
    this.over = false
    this.checkEnd()
    return true
  }

  canUndo(): boolean {
    return this.history.length > 0
  }

  getState(): Game2048State {
    return {
      grid: this.grid,
      score: this.score,
      bestScore: this.bestScore,
      won: this.won,
      over: this.over,
      keepPlaying: this.keepPlaying,
      size: this.size,
    }
  }

  loadState(state: Game2048State): void {
    this.size = state.size
    this.config.size = state.size
    this.grid = cloneGrid(state.grid)
    this.score = state.score
    this.bestScore = state.bestScore
    this.won = state.won
    this.over = state.over
    this.keepPlaying = state.keepPlaying
    tileIdCounter = 1
    for (const row of this.grid) {
      for (const tile of row) {
        if (tile) {
          tile.id = nextTileId()
          tile.isNew = false
          tile.isMerged = false
        }
      }
    }
  }

  /** 应用新配置并重新开始（棋盘尺寸变化时必须重建） */
  reconfigure(config: Partial<Game2048Config>): void {
    const newSize = config.size !== undefined ? clampSize(config.size) : this.size
    this.config = { ...this.config, ...config, size: newSize }
    this.size = newSize
    this.reset()
  }

  move(direction: Direction): boolean {
    for (const row of this.grid) {
      for (const tile of row) {
        if (tile) {
          tile.isNew = false
          tile.isMerged = false
          tile.mergedFrom = undefined
        }
      }
    }

    const before = this.serializeGrid()
    this.saveHistory()

    let moved = false
    switch (direction) {
      case 'left':
        moved = this.moveLeft()
        break
      case 'right':
        moved = this.moveRight()
        break
      case 'up':
        moved = this.moveUp()
        break
      case 'down':
        moved = this.moveDown()
        break
    }

    if (!moved) {
      this.history.pop()
      return false
    }

    const after = this.serializeGrid()
    if (before === after) {
      this.history.pop()
      return false
    }

    this.addRandomTile()
    this.checkEnd()
    this.updateBestScore()
    return true
  }

  private serializeGrid(): string {
    return this.grid
      .map((row) => row.map((t) => (t ? t.value : 0)).join(','))
      .join('|')
  }

  /**
   * 提取一条线，向起点方向移动并合并。
   * 关键：合并产生的新 tile 沿用「前一个 tile 的 id」，
   * 这样视图层 key 不变、元素被复用，CSS transition 能平滑过渡位置。
   */
  private traverse(getLine: (i: number) => Array<{ tile: Tile | null; r: number; c: number }>): boolean {
    let moved = false
    for (let i = 0; i < this.size; i++) {
      const line = getLine(i)
      const tiles = line.filter((x) => x.tile !== null) as Array<{ tile: Tile; r: number; c: number }>
      const result: Array<{ tile: Tile; r: number; c: number; isMerged: boolean }> = []
      let j = 0
      while (j < tiles.length) {
        const curr = tiles[j]
        if (j + 1 < tiles.length && curr.tile.value === tiles[j + 1].tile.value) {
          const mergedValue = curr.tile.value * 2
          // 合并：保留第一个 tile 的 id（视图层 key 不变，触发 merge 弹动动画）
          const mergedTile: Tile = {
            id: curr.tile.id,
            value: mergedValue,
            row: curr.r,
            col: curr.c,
            isMerged: true,
            mergedFrom: [curr.tile.id, tiles[j + 1].tile.id],
          }
          result.push({ tile: mergedTile, r: curr.r, c: curr.c, isMerged: true })
          this.score += mergedValue
          if (this.config.winValue > 0 && mergedValue >= this.config.winValue && !this.won) {
            this.won = true
          }
          j += 2
        } else {
          result.push({ tile: { ...curr.tile }, r: curr.r, c: curr.c, isMerged: false })
          j++
        }
      }
      for (let k = 0; k < line.length; k++) {
        const pos = line[k]
        const res = result[k]
        if (res) {
          res.tile.row = pos.r
          res.tile.col = pos.c
          const oldTile = this.grid[pos.r][pos.c]
          if (!oldTile || oldTile.value !== res.tile.value || oldTile.id !== res.tile.id) {
            moved = true
          }
          this.grid[pos.r][pos.c] = res.tile
        } else {
          if (this.grid[pos.r][pos.c] !== null) moved = true
          this.grid[pos.r][pos.c] = null
        }
      }
    }
    return moved
  }

  private moveLeft(): boolean {
    return this.traverse((r) =>
      Array.from({ length: this.size }, (_, c) => ({ tile: this.grid[r][c], r, c })),
    )
  }

  private moveRight(): boolean {
    return this.traverse((r) =>
      Array.from({ length: this.size }, (_, i) => {
        const c = this.size - 1 - i
        return { tile: this.grid[r][c], r, c }
      }),
    )
  }

  private moveUp(): boolean {
    return this.traverse((c) =>
      Array.from({ length: this.size }, (_, r) => ({ tile: this.grid[r][c], r, c })),
    )
  }

  private moveDown(): boolean {
    return this.traverse((c) =>
      Array.from({ length: this.size }, (_, i) => {
        const r = this.size - 1 - i
        return { tile: this.grid[r][c], r, c }
      }),
    )
  }

  private checkEnd(): void {
    if (getEmptyCells(this.grid).length > 0) {
      this.over = false
      return
    }
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const curr = this.grid[r][c]
        if (!curr) continue
        if (c + 1 < this.size && this.grid[r][c + 1]?.value === curr.value) {
          this.over = false
          return
        }
        if (r + 1 < this.size && this.grid[r + 1][c]?.value === curr.value) {
          this.over = false
          return
        }
      }
    }
    this.over = true
  }

  continueAfterWin(): void {
    this.keepPlaying = true
  }

  isGameOver(): boolean {
    return this.over
  }

  isWin(): boolean {
    return this.won && !this.keepPlaying
  }

  reset(): void {
    tileIdCounter = 1
    this.grid = createEmptyGrid(this.size)
    this.score = 0
    this.won = false
    this.over = false
    this.keepPlaying = false
    this.history = []
    this.addInitialTiles()
  }

  getScore(): number {
    return this.score
  }

  private updateBestScore(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score
      StorageAdapter.set(this.bestScoreKey, this.bestScore)
    }
  }
}

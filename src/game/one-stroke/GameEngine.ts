import type { BaseGame } from '../base/BaseGame'

export interface StrokeNode {
  id: number
  x: number
  y: number
}

export interface StrokeState {
  nodes: StrokeNode[]
  edges: Array<[number, number]>
  usedEdges: string[]
  startNode: number
  current: number | null
  status: 'playing' | 'stuck' | 'won'
}

const NODES: StrokeNode[] = [
  { id: 0, x: 12, y: 12 }, { id: 1, x: 88, y: 12 },
  { id: 2, x: 88, y: 88 }, { id: 3, x: 12, y: 88 },
  { id: 4, x: 50, y: 50 }, { id: 5, x: 12, y: 50 }, { id: 6, x: 88, y: 50 },
]
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4],
  [3, 4], [3, 5], [0, 5], [1, 6], [2, 6], [4, 5], [4, 6],
]

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

export class OneStrokeEngine implements BaseGame<StrokeState, number> {
  private usedEdges = new Set<string>()
  private current: number | null = null
  private status: StrokeState['status'] = 'playing'
  private startNode = 0

  constructor(startNode = 0) {
    this.setStartNode(startNode)
  }

  getState(): StrokeState {
    return {
      nodes: NODES.map((node) => ({ ...node })),
      edges: EDGES.map((edge) => [...edge] as [number, number]),
      usedEdges: [...this.usedEdges],
      startNode: this.startNode,
      current: this.current,
      status: this.status,
    }
  }

  loadState(state: StrokeState): void {
    this.usedEdges = new Set(state.usedEdges)
    this.startNode = [0, 5, 6].includes(state.startNode) ? state.startNode : 0
    this.current = state.current
    this.status = state.status
  }

  move(nodeId: number): boolean {
    if (this.status !== 'playing' || !NODES.some((node) => node.id === nodeId)) return false
    if (this.current === null) {
      if (this.startNode !== 0 && nodeId !== this.startNode) return false
      this.current = nodeId
      return true
    }
    if (this.current === nodeId) return false
    const key = edgeKey(this.current, nodeId)
    if (!EDGES.some(([a, b]) => edgeKey(a, b) === key) || this.usedEdges.has(key)) return false
    this.usedEdges.add(key)
    this.current = nodeId
    if (this.usedEdges.size === EDGES.length) {
      this.status = 'won'
    } else if (!EDGES.some(([a, b]) => (a === nodeId || b === nodeId) && !this.usedEdges.has(edgeKey(a, b)))) {
      this.status = 'stuck'
    }
    return true
  }

  isGameOver(): boolean {
    return this.status !== 'playing'
  }

  isWin(): boolean {
    return this.status === 'won'
  }

  reset(): void {
    this.usedEdges.clear()
    this.current = null
    this.status = 'playing'
  }

  setStartNode(startNode: number): void {
    this.startNode = [0, 5, 6].includes(startNode) ? startNode : 0
    this.reset()
  }

  getScore(): number {
    return this.usedEdges.size
  }
}

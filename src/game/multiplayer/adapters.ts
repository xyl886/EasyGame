import type { GameId, Seat } from '../../net/protocol'
import {
  applyConnect4Move,
  createInitialState as createConnect4State,
} from '../connect4/GameEngine'
import type { Connect4State } from '../connect4/types'
import { COLS, ROWS, cellCoord as connect4Coord } from '../connect4/types'
import { applyGomokuMove, createInitialState as createGomokuState } from '../gomoku/GameEngine'
import type { GomokuState } from '../gomoku/types'
import { cellCoord as gomokuCoord } from '../gomoku/types'

/** 联机对局适配器：把不同游戏统一成「房主权威 + 状态快照」模型 */
export interface RoomGameAdapter<S = unknown> {
  id: GameId
  name: string
  createState: () => S
  applyMove: (state: S, move: unknown) => S | null
  isOver: (state: S) => boolean
  /** 当前轮到哪个座位 */
  turnSeat: (state: S) => Seat
  /** 胜者座位（平局/未结束为 null） */
  winnerSeat: (state: S) => Seat | null
  validateState: (value: unknown) => value is S
  /** 座位在 UI 上的称呼（黑棋/红方） */
  seatLabel: (seat: Seat) => string
  /** 当前轮到谁的文字 */
  turnLabel: (state: S) => string
  /** 无障碍/提示用：一步棋的文字描述 */
  moveLabel: (move: unknown) => string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isCellList(value: unknown, length: number, allowed: Array<string | null>): boolean {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((cell) => allowed.includes(cell as string | null))
  )
}

const gomokuAdapter: RoomGameAdapter<GomokuState> = {
  id: 'gomoku',
  name: '五子棋',
  createState: () => createGomokuState(),
  applyMove: (state, move) => (typeof move === 'number' ? applyGomokuMove(state, move) : null),
  isOver: (state) => state.over,
  turnSeat: (state) => (state.current === 'black' ? 'black' : 'white'),
  winnerSeat: (state) =>
    state.winner === 'black' ? 'black' : state.winner === 'white' ? 'white' : null,
  seatLabel: (seat) => (seat === 'black' ? '黑棋' : '白棋'),
  turnLabel: (state) => (state.current === 'black' ? '黑棋' : '白棋'),
  validateState(value): value is GomokuState {
    if (!isRecord(value)) return false
    const config = value.config
    if (!isRecord(config)) return false
    const size = config.size
    const winLength = config.winLength
    if (typeof size !== 'number' || typeof winLength !== 'number') return false
    if (!Number.isInteger(size) || !Number.isInteger(winLength)) return false
    if (size < 3 || winLength < 3) return false
    if (!isCellList(value.board, size * size, [null, 'black', 'white'])) return false
    if (value.current !== 'black' && value.current !== 'white') return false
    if (!Array.isArray(value.winningLine)) return false
    if (typeof value.over !== 'boolean') return false
    if (typeof value.moves !== 'number') return false
    return true
  },
  moveLabel(move) {
    if (typeof move !== 'number') return '落子'
    const { row, col } = gomokuCoord(move, 15)
    return `第 ${row} 行第 ${col} 列`
  },
}

const connect4Adapter: RoomGameAdapter<Connect4State> = {
  id: 'connect4',
  name: '四子棋',
  createState: () => createConnect4State(),
  applyMove: (state, move) => (typeof move === 'number' ? applyConnect4Move(state, move) : null),
  isOver: (state) => state.over,
  turnSeat: (state) => (state.current === 'red' ? 'black' : 'white'),
  winnerSeat: (state) =>
    state.winner === 'red' ? 'black' : state.winner === 'yellow' ? 'white' : null,
  seatLabel: (seat) => (seat === 'black' ? '红方' : '黄方'),
  turnLabel: (state) => (state.current === 'red' ? '红方' : '黄方'),
  validateState(value): value is Connect4State {
    if (!isRecord(value)) return false
    if (!isCellList(value.board, COLS * ROWS, [null, 'red', 'yellow'])) return false
    if (value.current !== 'red' && value.current !== 'yellow') return false
    if (!Array.isArray(value.winningLine)) return false
    if (typeof value.over !== 'boolean') return false
    if (typeof value.moves !== 'number') return false
    return true
  },
  moveLabel(move) {
    if (typeof move !== 'number') return '落子'
    return `第 ${connect4Coord(0).col + move} 列`
  },
}

const ADAPTERS: Record<GameId, RoomGameAdapter<unknown>> = {
  gomoku: gomokuAdapter as RoomGameAdapter<unknown>,
  connect4: connect4Adapter as RoomGameAdapter<unknown>,
}

export function getGameAdapter(gameId: GameId): RoomGameAdapter<unknown> {
  return ADAPTERS[gameId]
}

export function isGameId(value: unknown): value is GameId {
  return value === 'gomoku' || value === 'connect4'
}

export const MULTIPLAYER_GAMES: Array<{
  id: GameId
  name: string
  glyph: string
  description: string
}> = [
  { id: 'gomoku', name: '五子棋', glyph: '五', description: '15×15，先连成五子者胜。' },
  { id: 'connect4', name: '四子棋', glyph: '四', description: '7×6，轮流落子，先连成四子者胜。' },
]

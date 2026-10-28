/** 联机对局协议（v2）：P2P 对端不可信，所有入站消息先做结构校验 */

export type GameId = 'gomoku' | 'connect4'
export type RoomRole = 'player' | 'spectator'
/** 座位：black = 先手/房主，white = 后手/访客 */
export type Seat = 'black' | 'white'
export type ChatSeat = Seat | 'spectator'

export type NetStatus = 'connecting' | 'waiting' | 'connected' | 'reconnecting' | 'closed' | 'error'

export type NetErrorCode =
  | 'room-not-found'
  | 'room-code-taken'
  | 'network-error'
  | 'timeout'
  | 'connection-lost'
  | 'peer-error'

/** 客户端（guest / spectator，以及房主本机产生）→ 房主 */
export type ClientMessage =
  | { t: 'hello'; v: 2; game: GameId; token: string; role: RoomRole }
  | { t: 'move'; v: 2; move: number }
  | { t: 'chat'; v: 2; id: string }
  | { t: 'rematch'; v: 2 }
  | { t: 'bye'; v: 2 }

/** 房主 → 客户端 */
export type HostMessage =
  | {
      t: 'welcome'
      v: 2
      role: RoomRole
      seat: Seat | null
      state: unknown
      serial: number
      resumed: boolean
      spectators: number
    }
  | { t: 'state'; v: 2; state: unknown; serial: number; spectators: number }
  | { t: 'chat'; v: 2; id: string; seat: ChatSeat }
  | { t: 'status'; v: 2; guest: boolean; spectators: number; reconnecting: boolean }
  | { t: 'bye'; v: 2; reason?: string }

export type NetMessage = ClientMessage | HostMessage

const GAMES: GameId[] = ['gomoku', 'connect4']
const ROLES: RoomRole[] = ['player', 'spectator']
const CHAT_SEATS: ChatSeat[] = ['black', 'white', 'spectator']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isShortString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

export function isNetMessage(value: unknown): value is NetMessage {
  if (!isRecord(value) || value.v !== 2 || typeof value.t !== 'string') return false

  switch (value.t) {
    case 'hello':
      return (
        GAMES.includes(value.game as GameId) &&
        ROLES.includes(value.role as RoomRole) &&
        isShortString(value.token, 64)
      )
    case 'move':
      return typeof value.move === 'number' && Number.isFinite(value.move)
    case 'chat':
      return isShortString(value.id, 32)
    case 'rematch':
    case 'bye':
      return true
    case 'welcome':
      return (
        ROLES.includes(value.role as RoomRole) &&
        (value.seat === null || value.seat === 'black' || value.seat === 'white') &&
        isRecord(value.state) &&
        Number.isInteger(value.serial) &&
        typeof value.resumed === 'boolean' &&
        typeof value.spectators === 'number'
      )
    case 'state':
      return (
        isRecord(value.state) &&
        Number.isInteger(value.serial) &&
        typeof value.spectators === 'number'
      )
    case 'status':
      return (
        typeof value.guest === 'boolean' &&
        typeof value.spectators === 'number' &&
        typeof value.reconnecting === 'boolean'
      )
    default:
      return false
  }
}

export function isClientMessage(value: unknown): value is ClientMessage {
  return isNetMessage(value) && ['hello', 'move', 'chat', 'rematch', 'bye'].includes(value.t)
}

export function isHostMessage(value: unknown): value is HostMessage {
  return isNetMessage(value) && ['welcome', 'state', 'chat', 'status', 'bye'].includes(value.t)
}

export function chatSeatIsValid(value: unknown): value is ChatSeat {
  return CHAT_SEATS.includes(value as ChatSeat)
}

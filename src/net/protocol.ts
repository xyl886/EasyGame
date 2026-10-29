/** 联机对局协议（v3）：P2P 对端不可信，所有入站消息先做结构校验 */
export type GameId = 'gomoku' | 'connect4'
export type RoomRole = 'player' | 'spectator'
/** 申请加入：公房列表里的访客先发申请，房主同意后才成为 player */
export type HelloRole = RoomRole | 'request'
/** 座位：black = 先手/房主，white = 后手/访客 */
export type Seat = 'black' | 'white'
export type ChatSeat = Seat | 'spectator'

export type NetStatus = 'connecting' | 'waiting' | 'connected' | 'reconnecting' | 'closed' | 'error'

export type NetErrorCode =
  | 'room-not-found'
  | 'room-code-taken'
  | 'request-rejected'
  | 'network-error'
  | 'timeout'
  | 'connection-lost'
  | 'peer-error'

/** 客户端（guest / spectator / 申请者，以及房主本机产生）→ 房主 */
export type ClientMessage =
  | { t: 'hello'; v: 3; game: GameId; token: string; role: HelloRole }
  | { t: 'move'; v: 3; move: number }
  | { t: 'chat'; v: 3; id: string }
  | { t: 'rematch'; v: 3 }
  | { t: 'bye'; v: 3 }

/** 房主 → 客户端 */
export type HostMessage =
  | {
      t: 'welcome'
      v: 3
      role: RoomRole
      seat: Seat | null
      state: unknown
      serial: number
      resumed: boolean
      spectators: number
      public: boolean
    }
  | { t: 'state'; v: 3; state: unknown; serial: number; spectators: number }
  | { t: 'chat'; v: 3; id: string; seat: ChatSeat }
  | {
      t: 'status'
      v: 3
      guest: boolean
      spectators: number
      reconnecting: boolean
      public: boolean
    }
  /** 申请已送达，等待房主处理 */
  | { t: 'waiting'; v: 3 }
  /** 房主拒绝加入 */
  | { t: 'rejected'; v: 3; reason: string }
  | { t: 'bye'; v: 3; reason?: string }

export type NetMessage = ClientMessage | HostMessage

const GAMES: GameId[] = ['gomoku', 'connect4']
const ROLES: RoomRole[] = ['player', 'spectator']
const HELLO_ROLES: HelloRole[] = ['player', 'spectator', 'request']
const CHAT_SEATS: ChatSeat[] = ['black', 'white', 'spectator']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isShortString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

export function isNetMessage(value: unknown): value is NetMessage {
  if (!isRecord(value) || value.v !== 3 || typeof value.t !== 'string') return false

  switch (value.t) {
    case 'hello':
      return (
        GAMES.includes(value.game as GameId) &&
        HELLO_ROLES.includes(value.role as HelloRole) &&
        isShortString(value.token, 64)
      )
    case 'move':
      return typeof value.move === 'number' && Number.isFinite(value.move)
    case 'chat':
      return isShortString(value.id, 32)
    case 'rematch':
    case 'bye':
    case 'waiting':
      return true
    case 'rejected':
      return isShortString(value.reason, 120)
    case 'welcome':
      return (
        ROLES.includes(value.role as RoomRole) &&
        (value.seat === null || value.seat === 'black' || value.seat === 'white') &&
        isRecord(value.state) &&
        Number.isInteger(value.serial) &&
        typeof value.resumed === 'boolean' &&
        typeof value.spectators === 'number' &&
        typeof value.public === 'boolean'
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
        typeof value.reconnecting === 'boolean' &&
        typeof value.public === 'boolean'
      )
    default:
      return false
  }
}

export function isClientMessage(value: unknown): value is ClientMessage {
  return isNetMessage(value) && ['hello', 'move', 'chat', 'rematch', 'bye'].includes(value.t)
}

export function isHostMessage(value: unknown): value is HostMessage {
  return (
    isNetMessage(value) &&
    ['welcome', 'state', 'chat', 'status', 'waiting', 'rejected', 'bye'].includes(value.t)
  )
}

export function chatSeatIsValid(value: unknown): value is ChatSeat {
  return CHAT_SEATS.includes(value as ChatSeat)
}

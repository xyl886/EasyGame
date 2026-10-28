import type { GomokuState } from '../game/gomoku/types'

export type NetRole = 'host' | 'guest'

/** 连接状态机：connecting → (host: waiting) → connected → closed/error */
export type NetStatus = 'connecting' | 'waiting' | 'connected' | 'closed' | 'error'

export type NetErrorCode =
  | 'room-not-found'
  | 'room-code-taken'
  | 'network-error'
  | 'timeout'
  | 'connection-lost'
  | 'peer-error'

/** P2P 消息协议（版本化便于后续扩展；host 权威，guest 只发意图） */
export type NetMessage =
  | { t: 'hello'; v: 1 }
  | { t: 'move'; v: 1; index: number }
  | { t: 'state'; v: 1; state: GomokuState }
  | { t: 'rematch'; v: 1 }
  | { t: 'bye'; v: 1 }

/** 校验来自网络的数据：P2P 对端不可信，至少要保证结构安全 */
export function isNetMessage(value: unknown): value is NetMessage {
  if (!value || typeof value !== 'object') return false
  const msg = value as Record<string, unknown>
  if (msg.v !== 1 || typeof msg.t !== 'string') return false

  switch (msg.t) {
    case 'hello':
    case 'rematch':
    case 'bye':
      return true
    case 'move':
      return Number.isInteger(msg.index) && (msg.index as number) >= 0
    case 'state':
      return isGomokuState(msg.state)
    default:
      return false
  }
}

function isGomokuState(value: unknown): value is GomokuState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  const config = state.config as Record<string, unknown> | undefined
  if (!config || !Number.isInteger(config.size) || !Number.isInteger(config.winLength)) return false
  if (!Array.isArray(state.board)) return false
  if (state.board.length !== (config.size as number) * (config.size as number)) return false
  return state.current === 'black' || state.current === 'white'
}

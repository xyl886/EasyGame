import type { DataConnection, Peer as PeerInstance } from 'peerjs'
import { isNetMessage, type NetErrorCode, type NetMessage, type NetStatus } from './protocol'
import { peerIdFor } from './roomCode'

export interface NetEvents {
  onStatus: (status: NetStatus, detail?: string) => void
  onMessage: (msg: NetMessage) => void
}

export interface NetConnection {
  send: (msg: NetMessage) => void
  close: () => void
}

const CONNECT_TIMEOUT_MS = 12_000

function mapPeerError(type: string | undefined): NetErrorCode {
  switch (type) {
    case 'peer-unavailable':
      return 'room-not-found'
    case 'unavailable-id':
      return 'room-code-taken'
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'network-error'
    default:
      return 'peer-error'
  }
}

function safeSend(conn: DataConnection | null, msg: NetMessage): void {
  if (conn?.open) conn.send(msg)
}

/**
 * 创建房主连接：peer id 直接由房号派生，先到先得；
 * 只接受一个 guest，重连时新连接替换旧连接。
 */
export async function createHostConnection(
  code: string,
  events: NetEvents,
): Promise<NetConnection> {
  events.onStatus('connecting')

  const { Peer } = await import('peerjs')
  const peer: PeerInstance = new Peer(peerIdFor(code), { debug: 0 })
  let conn: DataConnection | null = null
  let closed = false

  function wire(next: DataConnection): void {
    if (conn) {
      next.close()
      return
    }
    conn = next
    next.on('open', () => {
      if (!closed) events.onStatus('connected')
    })
    next.on('data', (data) => {
      if (!closed && isNetMessage(data)) events.onMessage(data)
    })
    next.on('close', () => {
      conn = null
      if (!closed) events.onStatus('closed', 'connection-lost')
    })
    next.on('error', () => {
      if (!closed) events.onStatus('error', 'connection-lost')
    })
  }

  peer.on('open', () => {
    if (!closed) events.onStatus('waiting')
  })
  peer.on('connection', (incoming) => wire(incoming))
  peer.on('error', (err) => {
    if (closed) return
    events.onStatus('error', mapPeerError(err.type))
  })
  peer.on('disconnected', () => {
    if (!closed) peer.reconnect()
  })

  return {
    send: (msg) => safeSend(conn, msg),
    close: () => {
      closed = true
      conn?.close()
      peer.destroy()
    },
  }
}

/** 加入房间：随机 guest id，连上房主后进入 connected */
export async function createGuestConnection(
  code: string,
  events: NetEvents,
): Promise<NetConnection> {
  events.onStatus('connecting')

  const { Peer } = await import('peerjs')
  const peer: PeerInstance = new Peer({ debug: 0 })
  let conn: DataConnection | null = null
  let closed = false

  const timer = setTimeout(() => {
    if (!closed && !conn?.open) {
      closed = true
      events.onStatus('error', 'timeout')
      peer.destroy()
    }
  }, CONNECT_TIMEOUT_MS)

  function fail(status: NetStatus, detail: string): void {
    clearTimeout(timer)
    if (!closed) events.onStatus(status, detail)
  }

  peer.on('open', () => {
    if (closed) return
    conn = peer.connect(peerIdFor(code), { reliable: true })
    conn.on('open', () => {
      clearTimeout(timer)
      if (!closed) events.onStatus('connected')
    })
    conn.on('data', (data) => {
      if (!closed && isNetMessage(data)) events.onMessage(data)
    })
    conn.on('close', () => fail('closed', 'connection-lost'))
    conn.on('error', () => fail('error', 'connection-lost'))
  })
  peer.on('error', (err) => fail('error', mapPeerError(err.type)))
  peer.on('disconnected', () => {
    if (!closed) peer.reconnect()
  })

  return {
    send: (msg) => safeSend(conn, msg),
    close: () => {
      closed = true
      clearTimeout(timer)
      conn?.close()
      peer.destroy()
    },
  }
}

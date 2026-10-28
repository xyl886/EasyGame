import type { DataConnection, Peer as PeerInstance } from 'peerjs'
import {
  isClientMessage,
  isNetMessage,
  type ClientMessage,
  type NetErrorCode,
  type NetMessage,
  type NetStatus,
} from './protocol'
import { peerIdFor } from './roomCode'

export interface HostClient {
  id: string
  send: (msg: NetMessage) => void
  close: () => void
}

export interface HostRoomEvents {
  onStatus: (status: NetStatus, detail?: string) => void
  /** 收到 hello：由上层决定 player / spectator 并回 welcome */
  onHello: (client: HostClient, msg: Extract<ClientMessage, { t: 'hello' }>) => void
  onMessage: (client: HostClient, msg: ClientMessage) => void
  onClose: (client: HostClient) => void
}

export interface HostRoom {
  /** 发给单个客户端；clientId 为 '*' 时广播（exceptId 可排除自己） */
  send: (clientId: string, msg: NetMessage) => void
  broadcast: (msg: NetMessage, exceptId?: string) => void
  close: () => void
}

export interface GuestRoomEvents {
  onStatus: (status: NetStatus, detail?: string) => void
  onMessage: (msg: NetMessage) => void
}

export interface GuestRoom {
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

/** 房主：同一房号可接入多个客户端（1 名玩家 + 多名观众） */
export async function createHostRoom(code: string, events: HostRoomEvents): Promise<HostRoom> {
  events.onStatus('connecting')

  const { Peer } = await import('peerjs')
  const peer: PeerInstance = new Peer(peerIdFor(code), { debug: 0 })
  const clients = new Map<string, { client: HostClient; conn: DataConnection }>()
  let closed = false
  let seq = 0

  function wire(conn: DataConnection): void {
    const id = conn.peer || `client-${++seq}`
    const client: HostClient = {
      id,
      send: (msg) => {
        if (conn.open) conn.send(msg)
      },
      close: () => {
        conn.close()
      },
    }

    conn.on('open', () => {
      if (!closed) events.onStatus('waiting')
    })
    conn.on('data', (data) => {
      if (closed || !isNetMessage(data)) return
      if (data.t === 'hello') {
        clients.set(id, { client, conn })
        events.onHello(client, data)
      } else if (isClientMessage(data) && clients.has(id)) {
        events.onMessage(client, data)
      }
    })
    conn.on('close', () => {
      if (!clients.has(id)) return
      clients.delete(id)
      if (!closed) events.onClose(client)
    })
    conn.on('error', () => {
      if (!clients.has(id)) return
      clients.delete(id)
      if (!closed) events.onClose(client)
    })
  }

  peer.on('open', () => {
    if (!closed) events.onStatus('waiting')
  })
  peer.on('connection', (conn) => wire(conn))
  peer.on('error', (err) => {
    if (!closed) events.onStatus('error', mapPeerError(err.type))
  })
  peer.on('disconnected', () => {
    if (!closed) peer.reconnect()
  })

  return {
    send(clientId, msg) {
      if (clientId === '*') {
        for (const { client } of clients.values()) client.send(msg)
        return
      }
      clients.get(clientId)?.client.send(msg)
    },
    broadcast(msg, exceptId) {
      for (const [id, { client }] of clients.entries()) {
        if (id !== exceptId) client.send(msg)
      }
    },
    close() {
      closed = true
      for (const { client } of clients.values()) client.close()
      clients.clear()
      peer.destroy()
    },
  }
}

/** 访客 / 观众：单条连接，断线由上层负责重连 */
export async function createGuestRoom(code: string, events: GuestRoomEvents): Promise<GuestRoom> {
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
    send(msg) {
      if (conn?.open) conn.send(msg)
    },
    close() {
      closed = true
      clearTimeout(timer)
      conn?.close()
      peer.destroy()
    },
  }
}

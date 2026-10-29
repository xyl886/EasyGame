/**
 * 公共房间目录（方案 A：公共 MQTT broker，仅传房间元数据）
 *
 * - 房主创建公开房时 announce：retained 消息 + 10s 心跳，关闭/超时自动清除
 * - 首页订阅房间主题，展示跨浏览器的公开房列表
 * - 对局数据仍走 P2P，目录不接触棋局/聊天
 * - 公共 broker 只负责“发现”，不可用时自动回退到房号/邀请链接
 * - 通过 localStorage 覆盖 broker 地址，便于 e2e 使用本地 broker
 */
import type { MqttClient } from 'mqtt'
import type { GameId } from './protocol'
import { isValidRoomCode } from './roomCode'

export type DirectoryStatus = 'connecting' | 'connected' | 'error' | 'closed'

export interface PublicRoomInfo {
  code: string
  gameId: GameId
  status: 'waiting' | 'playing'
  players: number
  createdAt: number
  updatedAt: number
}

const NAMESPACE = 'easygame/v1/xyl886'
const ROOM_TTL_MS = 45_000
const HEARTBEAT_MS = 10_000
const PRUNE_MS = 5_000
const CONNECT_TIMEOUT_MS = 8_000
const BROKER_OVERRIDE_KEY = 'easygame-room-broker'

const DEFAULT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
]

export const ROOM_TOPIC_FILTER = `${NAMESPACE}/rooms/+/+`

export function brokerUrls(): string[] {
  try {
    const override = localStorage.getItem(BROKER_OVERRIDE_KEY)
    if (override) return [override]
  } catch {
    // localStorage 不可用时忽略
  }
  const env = import.meta.env.VITE_ROOM_BROKER
  if (typeof env === 'string' && env) return [env]
  return DEFAULT_BROKERS
}

export function roomTopic(gameId: GameId, code: string): string {
  return `${NAMESPACE}/rooms/${gameId}/${code}`
}

export function parseRoomTopic(topic: string): { gameId: GameId; code: string } | null {
  const parts = topic.split('/')
  if (parts.length !== 6) return null
  if (parts[0] !== 'easygame' || parts[1] !== 'v1' || parts[2] !== 'xyl886') return null
  if (parts[3] !== 'rooms') return null
  const gameId = parts[4] === 'gomoku' ? 'gomoku' : parts[4] === 'connect4' ? 'connect4' : null
  if (!gameId) return null
  const code = parts[5]?.toUpperCase()
  if (!code || !isValidRoomCode(code)) return null
  return { gameId, code }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function buildRoomPayload(info: PublicRoomInfo): string {
  return JSON.stringify({
    v: 1,
    code: info.code,
    gameId: info.gameId,
    status: info.status,
    players: info.players,
    createdAt: info.createdAt,
    updatedAt: info.updatedAt,
  })
}

export function parseRoomPayload(
  gameId: GameId,
  code: string,
  raw: string,
  now = Date.now(),
): PublicRoomInfo | null {
  if (!raw || raw.length > 1024) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.v !== 1) return null
  if (parsed.code !== code || parsed.gameId !== gameId) return null
  const status = parsed.status
  const players = parsed.players
  const createdAt = parsed.createdAt
  const updatedAt = parsed.updatedAt
  if (status !== 'waiting' && status !== 'playing') return null
  if (players !== 1 && players !== 2) return null
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) return null
  if (updatedAt > now + 60_000) return null
  return {
    code,
    gameId,
    status,
    players,
    createdAt,
    updatedAt,
  }
}

export function isRoomFresh(room: PublicRoomInfo, now = Date.now()): boolean {
  return now - room.updatedAt <= ROOM_TTL_MS
}

export function sortRooms(rooms: PublicRoomInfo[]): PublicRoomInfo[] {
  return [...rooms].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function mergeRoom(
  rooms: Map<string, PublicRoomInfo>,
  room: PublicRoomInfo,
): Map<string, PublicRoomInfo> {
  rooms.set(`${room.gameId}:${room.code}`, room)
  return rooms
}

async function createClient(willTopic?: string): Promise<MqttClient> {
  const { default: mqtt } = await import('mqtt')
  const urls = brokerUrls()
  let lastError: unknown = new Error('no-broker')

  for (const url of urls) {
    const client = mqtt.connect(url, {
      clientId: `easygame-${Math.random().toString(36).slice(2, 10)}`,
      clean: true,
      connectTimeout: CONNECT_TIMEOUT_MS,
      reconnectPeriod: 0,
      keepalive: 30,
      ...(willTopic
        ? {
            will: {
              topic: willTopic,
              payload: '',
              qos: 0,
              retain: true,
            },
          }
        : {}),
    })

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), CONNECT_TIMEOUT_MS)
        const onConnect = () => {
          clearTimeout(timer)
          cleanup()
          resolve()
        }
        const onError = (error: Error) => {
          clearTimeout(timer)
          cleanup()
          reject(error)
        }
        const cleanup = () => {
          client.off('connect', onConnect)
          client.off('error', onError)
        }
        client.once('connect', onConnect)
        client.once('error', onError)
      })
      return client
    } catch (error) {
      lastError = error
      client.end(true)
    }
  }

  throw lastError
}

export interface RoomDirectoryHandle {
  close: () => void
}

export interface RoomDirectoryEvents {
  onRooms: (rooms: PublicRoomInfo[]) => void
  onStatus: (status: DirectoryStatus, detail?: string) => void
}

export async function openRoomDirectory(events: RoomDirectoryEvents): Promise<RoomDirectoryHandle> {
  events.onStatus('connecting')
  let client: MqttClient
  try {
    client = await createClient()
  } catch {
    events.onStatus('error', 'connect-failed')
    throw new Error('directory-connect-failed')
  }

  const rooms = new Map<string, PublicRoomInfo>()
  let closed = false

  const emit = () => {
    if (closed) return
    events.onRooms(sortRooms([...rooms.values()].filter((room) => isRoomFresh(room))))
  }

  const prune = () => {
    for (const [key, room] of rooms.entries()) {
      if (!isRoomFresh(room)) rooms.delete(key)
    }
    emit()
  }

  client.on('message', (topic, payload) => {
    const target = parseRoomTopic(topic)
    if (!target) return
    const text = new TextDecoder().decode(payload)
    const room = parseRoomPayload(target.gameId, target.code, text)
    if (!room) {
      if (!text) rooms.delete(`${target.gameId}:${target.code}`)
      emit()
      return
    }
    mergeRoom(rooms, room)
    emit()
  })
  client.on('close', () => {
    if (closed) return
    events.onStatus('closed', 'connection-lost')
  })
  client.on('error', () => {
    if (closed) return
    events.onStatus('error', 'connection-error')
  })

  client.subscribe(ROOM_TOPIC_FILTER, { qos: 0 }, (error) => {
    if (error) {
      events.onStatus('error', 'subscribe-failed')
      return
    }
    events.onStatus('connected')
    emit()
  })

  const timer = setInterval(prune, PRUNE_MS)

  return {
    close() {
      closed = true
      clearInterval(timer)
      client.end(true)
    },
  }
}

export interface RoomAnnouncerHandle {
  update: (patch: Partial<Pick<PublicRoomInfo, 'status' | 'players'>>) => void
  close: () => void
}

export interface RoomAnnouncerInput {
  code: string
  gameId: GameId
  status: 'waiting' | 'playing'
  players: number
}

export async function announcePublicRoom(input: RoomAnnouncerInput): Promise<RoomAnnouncerHandle> {
  const topic = roomTopic(input.gameId, input.code)
  const client = await createClient(topic)
  let info: PublicRoomInfo = {
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const publish = () => {
    info = { ...info, updatedAt: Date.now() }
    client.publish(topic, buildRoomPayload(info), { qos: 0, retain: true })
  }

  publish()
  const heartbeat = setInterval(publish, HEARTBEAT_MS)

  return {
    update(patch) {
      info = { ...info, ...patch, updatedAt: Date.now() }
      publish()
    },
    close() {
      clearInterval(heartbeat)
      try {
        client.publish(topic, '', { qos: 0, retain: true })
      } catch {
        // 忽略清理失败
      }
      client.end(true)
    },
  }
}

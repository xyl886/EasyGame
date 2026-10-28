import { computed, onBeforeUnmount, ref, shallowRef, type Ref } from 'vue'
import type { ChatSeat, ClientMessage, NetMessage, NetStatus, Seat } from '../net/protocol'
import {
  createGuestRoom,
  createHostRoom,
  type GuestRoom,
  type HostClient,
  type HostRoom,
} from '../net/peerTransport'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '../net/roomCode'
import { isValidQuickMessage } from '../net/quickMessages'
import type { RoomGameAdapter } from '../game/multiplayer/adapters'
import {
  applyMatchResult,
  loadProfile,
  saveProfile,
  type MatchResult,
  type MultiplayerProfile,
} from '../game/multiplayer/profile'
import { toast } from '../utils/toast'

export type RoomMode = 'menu' | 'local' | 'online'
export type RoomRoleKind = 'host' | 'guest' | 'spectator' | null

export interface ChatItem {
  id: string
  seat: ChatSeat
  at: number
}

const TOKEN_PREFIX = 'easygame-mp-token-'
const RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 2000

function makeToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function loadToken(gameId: string): string {
  try {
    const saved = sessionStorage.getItem(TOKEN_PREFIX + gameId)
    if (saved) return saved
    const token = makeToken()
    sessionStorage.setItem(TOKEN_PREFIX + gameId, token)
    return token
  } catch {
    return makeToken()
  }
}

/**
 * 联机房间状态机（房主权威 + 客户端状态同步）：
 * - 房主（黑/先手）负责校验落子、广播状态、转发行内快捷语
 * - 访客（白/后手）只发意图；断线后带 token 重连可恢复同一局
 * - 其余客户端自动进入观战；观战只读，可发预设快捷语
 */
export function useMultiplayerRoom<S>(adapter: RoomGameAdapter<S>) {
  // ---------- 会话状态 ----------
  const mode = ref<RoomMode>('menu')
  const role = ref<RoomRoleKind>(null)
  const status = ref<NetStatus>('closed')
  const statusDetail = ref('')
  const state = ref(adapter.createState()) as Ref<S>
  const roomCode = ref('')
  const errorText = ref('')
  const spectators = ref(0)
  const guestPresent = ref(false)
  const reconnecting = ref(false)
  const serial = ref(0)
  const chatLog = ref<ChatItem[]>([])
  const profile = ref<MultiplayerProfile>(loadProfile())
  const lastDelta = ref<number | null>(null)

  const hostRoom = shallowRef<HostRoom | null>(null)
  const guestRoom = shallowRef<GuestRoom | null>(null)

  const mySeat = computed<Seat | null>(() =>
    role.value === 'host' ? 'black' : role.value === 'guest' ? 'white' : null,
  )
  const isSpectator = computed(() => role.value === 'spectator')
  const myTurn = computed(
    () =>
      mode.value === 'online' &&
      status.value === 'connected' &&
      mySeat.value !== null &&
      !adapter.isOver(state.value) &&
      adapter.turnSeat(state.value) === mySeat.value,
  )

  // ---------- 房主内部状态 ----------
  let guestClient: HostClient | null = null
  let guestToken: string | null = null
  const spectatorClients = new Map<string, HostClient>()
  let recordedSerial = -1
  let leaving = false

  // ---------- 访客内部状态 ----------
  const guestTokenValue = loadToken(adapter.id)
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let everConnected = false

  // ---------- 通用 ----------
  function pushChat(seat: ChatSeat, id: string): void {
    if (!isValidQuickMessage(id)) return
    chatLog.value = [...chatLog.value.slice(-9), { id, seat, at: Date.now() }]
  }

  function resetState(notifyHost = true): void {
    state.value = adapter.createState()
    serial.value += 1
    recordedSerial = -1
    lastDelta.value = null
    if (notifyHost && hostRoom.value) broadcastState()
  }

  function checkRecord(): void {
    if (mode.value !== 'online' || !mySeat.value) return
    if (!adapter.isOver(state.value)) return
    if (recordedSerial === serial.value) return
    recordedSerial = serial.value
    const winner = adapter.winnerSeat(state.value)
    const result: MatchResult = winner === null ? 'draw' : winner === mySeat.value ? 'win' : 'loss'
    const applied = applyMatchResult(profile.value, result)
    profile.value = applied.profile
    lastDelta.value = applied.delta
    saveProfile(applied.profile)
  }

  // ---------- 房主 ----------
  function broadcastState(): void {
    if (!hostRoom.value) return
    guestPresent.value = guestClient !== null
    spectators.value = spectatorClients.size
    const msg: NetMessage = {
      t: 'state',
      v: 2,
      state: state.value,
      serial: serial.value,
      spectators: spectators.value,
    }
    hostRoom.value.broadcast(msg)
  }

  function broadcastStatus(): void {
    if (!hostRoom.value) return
    guestPresent.value = guestClient !== null
    spectators.value = spectatorClients.size
    const msg: NetMessage = {
      t: 'status',
      v: 2,
      guest: guestPresent.value,
      spectators: spectators.value,
      reconnecting: reconnecting.value,
    }
    hostRoom.value.broadcast(msg)
  }

  function hostApply(move: number, fromSeat: Seat): boolean {
    if (adapter.isOver(state.value)) return false
    if (adapter.turnSeat(state.value) !== fromSeat) return false
    const next = adapter.applyMove(state.value, move)
    if (!next) return false
    state.value = next
    checkRecord()
    broadcastState()
    return true
  }

  function handleHello(client: HostClient, msg: Extract<ClientMessage, { t: 'hello' }>): void {
    if (msg.game !== adapter.id) {
      client.close()
      return
    }

    const canBePlayer = msg.role === 'player' && (guestClient === null || msg.token === guestToken)
    if (canBePlayer) {
      const resumed = guestToken !== null && guestToken === msg.token
      spectatorClients.delete(client.id)
      if (guestClient && guestClient.id !== client.id) guestClient.close()
      guestClient = client
      guestToken = msg.token
      reconnecting.value = false
      if (!resumed) resetState(false)
      client.send({
        t: 'welcome',
        v: 2,
        role: 'player',
        seat: 'white',
        state: state.value,
        serial: serial.value,
        resumed,
        spectators: spectatorClients.size,
      })
      status.value = 'connected'
      broadcastState()
      broadcastStatus()
      return
    }

    spectatorClients.set(client.id, client)
    client.send({
      t: 'welcome',
      v: 2,
      role: 'spectator',
      seat: null,
      state: state.value,
      serial: serial.value,
      resumed: false,
      spectators: spectatorClients.size,
    })
    broadcastStatus()
  }

  function handleHostMessage(client: HostClient, msg: ClientMessage): void {
    switch (msg.t) {
      case 'move':
        if (client !== guestClient) return
        hostApply(msg.move, 'white')
        break
      case 'chat': {
        const seat: ChatSeat = client === guestClient ? 'white' : 'spectator'
        if (!isValidQuickMessage(msg.id)) return
        pushChat(seat, msg.id)
        hostRoom.value?.broadcast({ t: 'chat', v: 2, id: msg.id, seat })
        break
      }
      case 'rematch':
        if (client !== guestClient) return
        resetState()
        broadcastStatus()
        break
      case 'bye':
        client.close()
        break
      default:
        break
    }
  }

  function handleHostClose(client: HostClient): void {
    spectatorClients.delete(client.id)
    if (guestClient?.id === client.id) {
      guestClient = null
      reconnecting.value = !adapter.isOver(state.value)
      status.value = 'waiting'
      broadcastStatus()
    } else {
      broadcastStatus()
    }
  }

  async function hostGame(): Promise<void> {
    errorText.value = ''
    leaving = false
    mode.value = 'online'
    role.value = 'host'
    roomCode.value = generateRoomCode()
    state.value = adapter.createState()
    serial.value = 0
    recordedSerial = -1
    chatLog.value = []
    lastDelta.value = null
    status.value = 'connecting'
    statusDetail.value = ''

    try {
      hostRoom.value = await createHostRoom(roomCode.value, {
        onStatus: (next, detail) => {
          if (role.value !== 'host') return
          statusDetail.value = detail ?? ''
          if (next === 'waiting') {
            status.value = guestPresent.value ? 'connected' : 'waiting'
          } else if (next === 'error') {
            status.value = 'error'
          }
        },
        onHello: handleHello,
        onMessage: handleHostMessage,
        onClose: handleHostClose,
      })
    } catch {
      status.value = 'error'
      statusDetail.value = 'peer-error'
    }
  }

  // ---------- 访客 / 观战 ----------
  function handleGuestMessage(msg: NetMessage): void {
    switch (msg.t) {
      case 'welcome':
        role.value = msg.role === 'player' ? 'guest' : 'spectator'
        status.value = 'connected'
        statusDetail.value = ''
        reconnecting.value = false
        reconnectAttempts = 0
        everConnected = true
        serial.value = msg.serial
        spectators.value = msg.spectators
        if (adapter.validateState(msg.state)) state.value = msg.state
        if (msg.role === 'spectator') toast('房间已满，已进入观战')
        checkRecord()
        break
      case 'state':
        serial.value = msg.serial
        spectators.value = msg.spectators
        if (adapter.validateState(msg.state)) state.value = msg.state
        checkRecord()
        break
      case 'chat':
        if ('seat' in msg) pushChat(msg.seat, msg.id)
        break
      case 'status':
        guestPresent.value = msg.guest
        spectators.value = msg.spectators
        reconnecting.value = msg.reconnecting
        break
      case 'bye':
        status.value = 'closed'
        break
      default:
        break
    }
  }

  function scheduleReconnect(): void {
    if (leaving || reconnectAttempts >= RECONNECT_ATTEMPTS) {
      status.value = 'closed'
      statusDetail.value = 'connection-lost'
      return
    }
    reconnectAttempts += 1
    reconnecting.value = true
    status.value = 'reconnecting'
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      guestRoom.value?.close()
      guestRoom.value = null
      void openGuestRoom()
    }, RECONNECT_DELAY_MS)
  }

  function handleGuestStatus(next: NetStatus, detail?: string): void {
    if (role.value !== 'guest' && role.value !== 'spectator') return
    if (next === 'connecting') {
      if (reconnectAttempts > 0) status.value = 'reconnecting'
      return
    }
    if (next === 'connected') {
      status.value = reconnecting.value ? 'reconnecting' : 'connected'
      statusDetail.value = ''
      guestRoom.value?.send({
        t: 'hello',
        v: 2,
        game: adapter.id,
        token: guestTokenValue,
        role: 'player',
      })
      return
    }
    statusDetail.value = detail ?? ''
    if (next === 'error') {
      status.value = 'error'
      if (everConnected) scheduleReconnect()
      return
    }
    if (next === 'closed') {
      if (everConnected) scheduleReconnect()
      else status.value = 'closed'
    }
  }

  async function openGuestRoom(): Promise<void> {
    try {
      guestRoom.value = await createGuestRoom(roomCode.value, {
        onStatus: handleGuestStatus,
        onMessage: handleGuestMessage,
      })
    } catch {
      status.value = 'error'
      statusDetail.value = 'peer-error'
    }
  }

  async function joinGame(codeRaw: string): Promise<void> {
    errorText.value = ''
    const code = normalizeRoomCode(codeRaw)
    if (!isValidRoomCode(code)) {
      errorText.value = '请输入 6 位有效房号'
      return
    }
    leaving = false
    mode.value = 'online'
    role.value = 'guest'
    roomCode.value = code
    state.value = adapter.createState()
    serial.value = 0
    recordedSerial = -1
    chatLog.value = []
    lastDelta.value = null
    reconnectAttempts = 0
    status.value = 'connecting'
    statusDetail.value = ''
    await openGuestRoom()
  }

  // ---------- 对局操作 ----------
  function play(move: number): void {
    if (mode.value === 'local') {
      if (adapter.isOver(state.value)) return
      const next = adapter.applyMove(state.value, move)
      if (next) state.value = next
      return
    }
    if (!myTurn.value) return
    if (role.value === 'host') {
      hostApply(move, 'black')
      return
    }
    if (role.value === 'guest') {
      guestRoom.value?.send({ t: 'move', v: 2, move })
    }
  }

  function rematch(): void {
    if (mode.value === 'local') {
      resetState(false)
      serial.value += 1
      return
    }
    if (role.value === 'host') {
      resetState()
      broadcastStatus()
      return
    }
    if (role.value === 'guest') {
      guestRoom.value?.send({ t: 'rematch', v: 2 })
    }
  }

  function sendChat(id: string): void {
    if (!isValidQuickMessage(id)) return
    if (mode.value !== 'online') return
    if (role.value === 'host') {
      pushChat('black', id)
      hostRoom.value?.broadcast({ t: 'chat', v: 2, id, seat: 'black' })
      return
    }
    if (role.value === 'guest') {
      guestRoom.value?.send({ t: 'chat', v: 2, id })
      return
    }
    if (role.value === 'spectator') {
      guestRoom.value?.send({ t: 'chat', v: 2, id })
    }
  }

  function startLocal(): void {
    leaving = true
    closeRooms()
    mode.value = 'local'
    role.value = null
    state.value = adapter.createState()
    serial.value = 1
    recordedSerial = -1
    lastDelta.value = null
    status.value = 'closed'
  }

  function closeRooms(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    hostRoom.value?.close()
    guestRoom.value?.close()
    hostRoom.value = null
    guestRoom.value = null
    guestClient = null
    guestToken = null
    spectatorClients.clear()
  }

  function leave(): void {
    leaving = true
    closeRooms()
    mode.value = 'menu'
    role.value = null
    status.value = 'closed'
    statusDetail.value = ''
    state.value = adapter.createState()
    roomCode.value = ''
    spectators.value = 0
    guestPresent.value = false
    reconnecting.value = false
    serial.value = 0
    chatLog.value = []
    lastDelta.value = null
    errorText.value = ''
  }

  onBeforeUnmount(() => {
    leaving = true
    closeRooms()
  })

  return {
    // 状态
    mode,
    role,
    status,
    statusDetail,
    state,
    roomCode,
    errorText,
    spectators,
    guestPresent,
    reconnecting,
    serial,
    chatLog,
    profile,
    lastDelta,
    mySeat,
    myTurn,
    isSpectator,
    // 操作
    hostGame,
    joinGame,
    startLocal,
    play,
    rematch,
    sendChat,
    leave,
    /** 供 e2e/组件测试读取适配器信息 */
    adapter,
  }
}

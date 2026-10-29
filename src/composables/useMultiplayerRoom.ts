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
import { announcePublicRoom, type RoomAnnouncerHandle } from '../net/roomDirectory'
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
/** 申请加入的三种状态：idle = 直接进房 / waiting = 等房主同意 / rejected = 被拒绝 */
export type ApprovalState = 'idle' | 'waiting' | 'rejected'

export interface ChatItem {
  id: string
  seat: ChatSeat
  at: number
}

export interface PendingRequest {
  id: string
  requestedAt: number
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
 * - 公开房会登记到房间目录，陌生人先发申请，房主同意后才分配座位
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
  const isPublicRoom = ref(false)
  const approvalState = ref<ApprovalState>('idle')
  const rejectReason = ref('')
  const pendingRequests = ref<PendingRequest[]>([])

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
  const pendingClients = new Map<string, { client: HostClient; token: string }>()
  let announcer: RoomAnnouncerHandle | null = null
  let recordedSerial = -1
  let leaving = false

  // ---------- 访客内部状态 ----------
  const guestTokenValue = loadToken(adapter.id)
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let everConnected = false
  let joinAsRequest = false

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
  /** 只给已同意的玩家/观众发送，申请中的连接不能提前收到局面 */
  function sendToApproved(msg: NetMessage): void {
    if (!hostRoom.value) return
    if (guestClient) hostRoom.value.send(guestClient.id, msg)
    for (const client of spectatorClients.values()) hostRoom.value.send(client.id, msg)
  }

  function broadcastState(): void {
    guestPresent.value = guestClient !== null
    spectators.value = spectatorClients.size
    sendToApproved({
      t: 'state',
      v: 3,
      state: state.value,
      serial: serial.value,
      spectators: spectators.value,
    })
  }

  function broadcastStatus(): void {
    guestPresent.value = guestClient !== null
    spectators.value = spectatorClients.size
    sendToApproved({
      t: 'status',
      v: 3,
      guest: guestPresent.value,
      spectators: spectators.value,
      reconnecting: reconnecting.value,
      public: isPublicRoom.value,
    })
  }

  function updateAnnouncement(patch: { status?: 'waiting' | 'playing'; players?: number }): void {
    announcer?.update(patch)
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

  function rejectPending(clientId: string, reason: string): void {
    const pending = pendingClients.get(clientId)
    if (!pending) return
    pending.client.send({ t: 'rejected', v: 3, reason })
    pending.client.close()
    pendingClients.delete(clientId)
    pendingRequests.value = pendingRequests.value.filter((item) => item.id !== clientId)
  }

  function rejectAllPending(reason: string): void {
    for (const clientId of [...pendingClients.keys()]) rejectPending(clientId, reason)
  }

  function acceptRequest(id: string): void {
    if (role.value !== 'host' || guestClient) {
      rejectPending(id, '座位已满')
      return
    }
    const pending = pendingClients.get(id)
    if (!pending) return

    guestClient = pending.client
    guestToken = pending.token
    pendingClients.delete(id)
    pendingRequests.value = pendingRequests.value.filter((item) => item.id !== id)
    reconnecting.value = false
    resetState(false)

    pending.client.send({
      t: 'welcome',
      v: 3,
      role: 'player',
      seat: 'white',
      state: state.value,
      serial: serial.value,
      resumed: false,
      spectators: spectatorClients.size,
      public: isPublicRoom.value,
    })
    status.value = 'connected'
    broadcastState()
    broadcastStatus()
    rejectAllPending('座位已被其他玩家占用')
    updateAnnouncement({ status: 'playing', players: 2 })
    toast('已同意加入申请')
  }

  function rejectRequest(id: string): void {
    rejectPending(id, '房主拒绝了申请')
    toast('已拒绝加入申请')
  }

  function handleHello(client: HostClient, msg: Extract<ClientMessage, { t: 'hello' }>): void {
    if (msg.game !== adapter.id) {
      client.close()
      return
    }

    if (msg.role === 'request') {
      // 已经通过审批的访客刷新/重连时，URL 里仍可能带 request=1；
      // 用 token 识别并直接恢复，而不是再进一次申请队列。
      if (guestToken !== null && msg.token === guestToken) {
        spectatorClients.delete(client.id)
        if (guestClient && guestClient.id !== client.id) guestClient.close()
        guestClient = client
        reconnecting.value = false
        client.send({
          t: 'welcome',
          v: 3,
          role: 'player',
          seat: 'white',
          state: state.value,
          serial: serial.value,
          resumed: true,
          spectators: spectatorClients.size,
          public: isPublicRoom.value,
        })
        status.value = 'connected'
        broadcastState()
        broadcastStatus()
        updateAnnouncement({ status: 'playing', players: 2 })
        return
      }
      if (guestClient && guestClient.id !== client.id) {
        client.send({ t: 'rejected', v: 3, reason: '座位已满，可稍后再来' })
        client.close()
        return
      }
      if (pendingClients.has(client.id)) return
      pendingClients.set(client.id, { client, token: msg.token })
      pendingRequests.value = [...pendingRequests.value, { id: client.id, requestedAt: Date.now() }]
      client.send({ t: 'waiting', v: 3 })
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
        v: 3,
        role: 'player',
        seat: 'white',
        state: state.value,
        serial: serial.value,
        resumed,
        spectators: spectatorClients.size,
        public: isPublicRoom.value,
      })
      status.value = 'connected'
      broadcastState()
      broadcastStatus()
      rejectAllPending('座位已被其他玩家占用')
      updateAnnouncement({ status: 'playing', players: 2 })
      return
    }

    spectatorClients.set(client.id, client)
    client.send({
      t: 'welcome',
      v: 3,
      role: 'spectator',
      seat: null,
      state: state.value,
      serial: serial.value,
      resumed: false,
      spectators: spectatorClients.size,
      public: isPublicRoom.value,
    })
    broadcastStatus()
  }

  function handleHostMessage(client: HostClient, msg: ClientMessage): void {
    if (msg.t === 'bye') {
      client.close()
      return
    }
    // 申请中的连接只能等房主处理，不能落子/聊天/要求重开
    if (pendingClients.has(client.id)) return

    switch (msg.t) {
      case 'move':
        if (client !== guestClient) return
        hostApply(msg.move, 'white')
        break
      case 'chat': {
        const seat: ChatSeat = client === guestClient ? 'white' : 'spectator'
        if (!isValidQuickMessage(msg.id)) return
        pushChat(seat, msg.id)
        sendToApproved({ t: 'chat', v: 3, id: msg.id, seat })
        break
      }
      case 'rematch':
        if (client !== guestClient) return
        resetState()
        broadcastStatus()
        break
      default:
        break
    }
  }

  function handleHostClose(client: HostClient): void {
    if (pendingClients.has(client.id)) {
      pendingClients.delete(client.id)
      pendingRequests.value = pendingRequests.value.filter((item) => item.id !== client.id)
      return
    }
    spectatorClients.delete(client.id)
    if (guestClient?.id === client.id) {
      guestClient = null
      reconnecting.value = !adapter.isOver(state.value)
      status.value = 'waiting'
      broadcastStatus()
      updateAnnouncement({ status: 'waiting', players: 1 })
    } else {
      broadcastStatus()
    }
  }

  async function hostGame(openToPublic = false): Promise<void> {
    errorText.value = ''
    leaving = false
    mode.value = 'online'
    role.value = 'host'
    isPublicRoom.value = openToPublic
    approvalState.value = 'idle'
    rejectReason.value = ''
    roomCode.value = generateRoomCode()
    state.value = adapter.createState()
    serial.value = 0
    recordedSerial = -1
    chatLog.value = []
    lastDelta.value = null
    status.value = 'connecting'
    statusDetail.value = ''
    pendingRequests.value = []

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
      return
    }

    if (openToPublic) {
      try {
        announcer = await announcePublicRoom({
          code: roomCode.value,
          gameId: adapter.id,
          status: 'waiting',
          players: 1,
        })
      } catch {
        isPublicRoom.value = false
        toast('房间目录暂不可用，房号仍可用于邀请朋友')
      }
    }
  }

  // ---------- 访客 / 观战 / 申请 ----------
  function handleGuestMessage(msg: NetMessage): void {
    switch (msg.t) {
      case 'waiting':
        approvalState.value = 'waiting'
        status.value = 'waiting'
        everConnected = true
        break
      case 'rejected':
        approvalState.value = 'rejected'
        rejectReason.value = msg.reason
        errorText.value = msg.reason
        status.value = 'closed'
        statusDetail.value = 'request-rejected'
        break
      case 'welcome':
        role.value = msg.role === 'player' ? 'guest' : 'spectator'
        approvalState.value = 'idle'
        status.value = 'connected'
        statusDetail.value = ''
        reconnecting.value = false
        reconnectAttempts = 0
        everConnected = true
        joinAsRequest = false
        serial.value = msg.serial
        spectators.value = msg.spectators
        isPublicRoom.value = msg.public
        if (adapter.validateState(msg.state)) state.value = msg.state
        if (msg.role === 'spectator') toast('已进入观战')
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
        isPublicRoom.value = msg.public
        break
      case 'bye':
        status.value = 'closed'
        break
      default:
        break
    }
  }

  function scheduleReconnect(): void {
    if (leaving || approvalState.value === 'rejected' || reconnectAttempts >= RECONNECT_ATTEMPTS) {
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
      status.value = joinAsRequest ? 'waiting' : reconnecting.value ? 'reconnecting' : 'connected'
      statusDetail.value = ''
      guestRoom.value?.send({
        t: 'hello',
        v: 3,
        game: adapter.id,
        token: guestTokenValue,
        role: joinAsRequest ? 'request' : 'player',
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

  async function joinGame(codeRaw: string, options?: { request?: boolean }): Promise<void> {
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
    joinAsRequest = options?.request ?? false
    // 通过公开房列表进入的必然是公开房，先按公开显示，welcome 会再次校准
    isPublicRoom.value = joinAsRequest
    approvalState.value = joinAsRequest ? 'waiting' : 'idle'
    rejectReason.value = ''
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
      guestRoom.value?.send({ t: 'move', v: 3, move })
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
      guestRoom.value?.send({ t: 'rematch', v: 3 })
    }
  }

  function sendChat(id: string): void {
    if (!isValidQuickMessage(id)) return
    if (mode.value !== 'online') return
    if (role.value === 'host') {
      pushChat('black', id)
      sendToApproved({ t: 'chat', v: 3, id, seat: 'black' })
      return
    }
    if (role.value === 'guest' || role.value === 'spectator') {
      guestRoom.value?.send({ t: 'chat', v: 3, id })
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
    rejectAllPending('房间已关闭')
    announcer?.close()
    announcer = null
    hostRoom.value?.close()
    guestRoom.value?.close()
    hostRoom.value = null
    guestRoom.value = null
    guestClient = null
    guestToken = null
    spectatorClients.clear()
    pendingClients.clear()
    pendingRequests.value = []
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
    isPublicRoom.value = false
    approvalState.value = 'idle'
    rejectReason.value = ''
    pendingRequests.value = []
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
    isPublicRoom,
    approvalState,
    rejectReason,
    pendingRequests,
    // 操作
    hostGame,
    joinGame,
    acceptRequest,
    rejectRequest,
    startLocal,
    play,
    rematch,
    sendChat,
    leave,
    /** 供 e2e/组件测试读取适配器信息 */
    adapter,
  }
}

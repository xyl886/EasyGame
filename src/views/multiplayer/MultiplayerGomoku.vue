<template>
  <div class="eg-shell">
    <header class="mx-auto mb-5 flex w-full max-w-2xl items-center justify-between">
      <RouterLink to="/" class="eg-back-btn group" aria-label="返回游戏大厅"> ← </RouterLink>
      <div class="eg-game-title">五子棋 · 联机</div>
      <div class="flex gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <!-- 菜单 -->
      <template v-if="mode === 'menu'">
        <section class="eg-card p-5 sm:p-6">
          <h1 class="font-display text-3xl font-medium text-text-light dark:text-text-dark">
            五子棋 · 联机
          </h1>
          <p class="eg-lead mt-3">
            创建房号，把链接发给朋友，浏览器之间 P2P 直连。也可以本机双人轮流下。
          </p>
          <div class="mt-6 grid gap-3 sm:grid-cols-3">
            <button type="button" class="eg-primary-btn" @click="hostGame">
              <AppIcon name="play" :size="18" /> 创建房间
            </button>
            <button type="button" class="eg-secondary-btn" @click="showJoin = !showJoin">
              <AppIcon name="share" :size="17" /> 加入房间
            </button>
            <button type="button" class="eg-ghost-btn" @click="startLocal">
              <AppIcon name="hand" :size="18" /> 本机双人
            </button>
          </div>

          <form
            v-if="showJoin"
            class="mt-4 flex flex-wrap items-end gap-2"
            @submit.prevent="joinGame"
          >
            <label class="flex-1">
              <span class="eg-field-label mb-1">房号</span>
              <input
                v-model="joinCode"
                class="claude-input font-mono tracking-[0.2em] uppercase"
                maxlength="6"
                autocomplete="off"
                spellcheck="false"
                placeholder="6 位房号"
              />
            </label>
            <button
              type="submit"
              class="eg-primary-btn"
              :disabled="!isValidRoomCode(normalizeRoomCode(joinCode))"
            >
              加入
            </button>
          </form>

          <p
            v-if="errorText"
            class="mt-4 text-sm text-danger-light dark:text-danger-dark"
            role="alert"
          >
            {{ errorText }}
          </p>
        </section>

        <p class="mt-4 text-caption text-text-faint-light dark:text-text-faint-dark">
          P2P
          说明：棋子只在你和对手之间传输，不经过服务器保存；公共信令仅用于握手。双方需同时在线，部分公司
          / 校园网可能连不上。
        </p>
      </template>

      <!-- 对局 -->
      <template v-else>
        <section class="eg-card mb-4 p-3 sm:p-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="eg-chip">
              {{ mode === 'local' ? '本机双人' : role === 'host' ? '房主' : '访客' }}
            </span>
            <span
              v-if="mode === 'online'"
              class="flex items-center gap-2 text-text-light dark:text-text-dark"
            >
              <span class="text-caption text-text-faint-light dark:text-text-faint-dark">房号</span>
              <button
                type="button"
                class="font-mono text-lg tracking-[0.2em] text-accent-light transition-colors hover:text-accent-hover-light dark:text-accent-dark"
                :title="copyHint"
                @click="copyCode"
              >
                {{ roomCode }}
              </button>
            </span>
            <span
              class="ml-auto text-caption"
              :class="statusClass"
              role="status"
              aria-live="polite"
            >
              {{ statusText }}
            </span>
          </div>

          <div v-if="mode === 'online' && status === 'waiting'" class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="eg-secondary-btn" @click="copyInvite">
              <AppIcon name="share" :size="17" /> 复制邀请链接
            </button>
          </div>
          <p
            v-if="mode === 'online'"
            class="mt-2 text-caption text-text-faint-light dark:text-text-faint-dark"
          >
            房号邀请 · P2P 直连 · 对手加入后自动开始（黑棋 = 房主）
          </p>
        </section>

        <div class="relative mx-auto w-full max-w-[min(92vw,34rem)]">
          <div data-testid="gomoku-board" class="gomoku-board" :style="boardStyle">
            <button
              v-for="(cell, i) in state.board"
              :key="i"
              type="button"
              class="gomoku-cell"
              :class="{ 'gomoku-cell--win': isWinning(i) }"
              :disabled="!canPlay(i)"
              :aria-label="cellAria(i)"
              @click="play(i)"
            >
              <span
                v-if="cell"
                class="gomoku-stone"
                :class="cell === 'black' ? 'gomoku-stone--black' : 'gomoku-stone--white'"
                aria-hidden="true"
              ></span>
              <span v-if="state.lastMove === i" class="gomoku-last" aria-hidden="true"></span>
            </button>
          </div>

          <!-- 结果遮罩 -->
          <div
            v-if="state.over"
            data-testid="gomoku-result"
            class="absolute inset-0 flex items-center justify-center rounded-2xl bg-bg-light/95 dark:bg-bg-dark/95"
          >
            <div class="space-y-4 px-4 text-center">
              <div class="font-display text-3xl text-text-light dark:text-text-dark">
                {{ resultTitle }}
              </div>
              <p class="text-sm text-text-muted-light dark:text-text-muted-dark">
                {{ resultHint }}
              </p>
              <div class="flex justify-center gap-3">
                <button type="button" class="eg-primary-btn" @click="rematch">再来一局</button>
                <button type="button" class="eg-secondary-btn" @click="backToMenu">返回</button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col items-center gap-2 text-center">
          <p class="font-display text-lg text-text-light dark:text-text-dark">
            {{ turnText }}
          </p>
          <p
            v-if="mode === 'online' && status === 'connected' && !state.over"
            class="text-caption text-text-faint-light dark:text-text-faint-dark"
          >
            {{ myTurn ? '轮到你落子' : '等待对手…' }}
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <span v-if="mode === 'local'" class="eg-chip">黑棋先手</span>
            <button
              v-if="mode === 'local'"
              type="button"
              class="eg-ghost-btn !min-h-9 !px-3 !text-xs"
              @click="resetGame"
            >
              重开
            </button>
            <button
              v-if="mode !== 'local'"
              type="button"
              class="eg-ghost-btn !min-h-9 !px-3 !text-xs"
              @click="backToMenu"
            >
              离开房间
            </button>
          </div>
        </div>
      </template>
    </main>

    <footer class="mx-auto mt-6 w-full max-w-2xl py-3 text-center text-xs">
      <RouterLink
        to="/"
        class="text-text-faint-light hover:text-text-light dark:text-text-faint-dark dark:hover:text-text-dark"
        >← 返回游戏大厅</RouterLink
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import ThemeToggle from '../../components/ThemeToggle.vue'
import { applyGomokuMove, createInitialState } from '../../game/gomoku/GameEngine'
import { cellCoord, stoneLabel, type GomokuState, type Stone } from '../../game/gomoku/types'
import {
  createGuestConnection,
  createHostConnection,
  type NetConnection,
} from '../../net/peerTransport'
import type { NetMessage, NetStatus } from '../../net/protocol'
import { generateRoomCode, inviteUrl, isValidRoomCode, normalizeRoomCode } from '../../net/roomCode'
import { PlatformAdapter } from '../../adapters/PlatformAdapter'
import { toast } from '../../utils/toast'

const route = useRoute()
const router = useRouter()

type Mode = 'menu' | 'local' | 'online'
type Role = 'host' | 'guest' | null

const mode = ref<Mode>('menu')
const role = ref<Role>(null)
const status = ref<NetStatus>('closed')
const statusDetail = ref('')
const state = ref<GomokuState>(createInitialState())
const roomCode = ref('')
const joinCode = ref('')
const showJoin = ref(false)
const errorText = ref('')
const copyHint = ref('点击复制房号')
const net = shallowRef<NetConnection | null>(null)

const myStone = computed<Stone | null>(() =>
  role.value === 'host' ? 'black' : role.value === 'guest' ? 'white' : null,
)
const myTurn = computed(
  () => mode.value === 'online' && state.value.current === myStone.value && !state.value.over,
)

const boardStyle = computed(() => ({
  gridTemplateColumns: `repeat(${state.value.config.size}, 1fr)`,
}))

const turnText = computed(() => {
  if (state.value.over) return resultTitle.value
  const stone = stoneLabel(state.value.current)
  if (mode.value === 'local') return `轮到${stone}`
  return state.value.current === myStone.value ? `轮到${stone}（你）` : `轮到${stone}（对手）`
})

const resultTitle = computed(() => {
  if (!state.value.over) return ''
  if (!state.value.winner) return '平局'
  if (mode.value === 'local') return `${stoneLabel(state.value.winner)}获胜`
  return state.value.winner === myStone.value ? '你赢了' : '对手获胜'
})

const resultHint = computed(() =>
  state.value.winner ? `共 ${state.value.moves} 手` : `棋盘已满，共 ${state.value.moves} 手`,
)

const statusText = computed(() => {
  if (mode.value === 'local') return '本机轮流落子'
  switch (status.value) {
    case 'connecting':
      return '正在连接…'
    case 'waiting':
      return '等待对手加入…'
    case 'connected':
      return '已连接'
    case 'closed':
      return '连接已断开'
    case 'error':
      return errorLabel(statusDetail.value)
    default:
      return ''
  }
})

const statusClass = computed(() => {
  if (status.value === 'connected') return 'text-success-light dark:text-success-dark'
  if (status.value === 'error' || status.value === 'closed') {
    return 'text-danger-light dark:text-danger-dark'
  }
  return 'text-text-faint-light dark:text-text-faint-dark'
})

function errorLabel(code: string): string {
  switch (code) {
    case 'room-not-found':
      return '房间不存在或房主已离开'
    case 'room-code-taken':
      return '房号被占用，请重新创建'
    case 'network-error':
      return '网络受限，无法连接信令服务器'
    case 'timeout':
      return '连接超时，请确认房号与网络'
    case 'connection-lost':
      return '连接已断开'
    default:
      return '连接失败，请重试'
  }
}

function resetGame(): void {
  state.value = createInitialState()
}

function canPlay(index: number): boolean {
  if (state.value.over || state.value.board[index] !== null) return false
  if (mode.value === 'local') return true
  return status.value === 'connected' && state.value.current === myStone.value
}

function isWinning(index: number): boolean {
  return state.value.winningLine.includes(index)
}

function cellAria(index: number): string {
  const { row, col } = cellCoord(index, state.value.config.size)
  const cell = state.value.board[index]
  return `第 ${row} 行第 ${col} 列${cell ? `，${stoneLabel(cell)}` : ''}`
}

function applyLocal(index: number): void {
  const next = applyGomokuMove(state.value, index)
  if (next) state.value = next
}

function play(index: number): void {
  if (!canPlay(index)) return
  if (mode.value === 'local') {
    applyLocal(index)
    return
  }
  if (role.value === 'host') {
    applyLocal(index)
    sendState()
    return
  }
  net.value?.send({ t: 'move', v: 1, index })
}

function sendState(): void {
  net.value?.send({ t: 'state', v: 1, state: state.value })
}

function handleMessage(msg: NetMessage): void {
  if (role.value === 'host') {
    switch (msg.t) {
      case 'hello':
        sendState()
        break
      case 'move': {
        const next = applyGomokuMove(state.value, msg.index)
        if (next) {
          state.value = next
          sendState()
        }
        break
      }
      case 'rematch':
        resetGame()
        sendState()
        break
      case 'bye':
        status.value = 'waiting'
        resetGame()
        break
    }
    return
  }

  switch (msg.t) {
    case 'state':
      state.value = msg.state
      break
    case 'rematch':
      resetGame()
      break
  }
}

function handleStatus(next: NetStatus, detail?: string): void {
  status.value = next
  statusDetail.value = detail ?? ''
  if (next === 'connected' && role.value === 'guest') {
    net.value?.send({ t: 'hello', v: 1 })
  }
  if (next === 'waiting' && detail === 'opponent-left') {
    resetGame()
    toast('对手已离开，房号仍然有效')
  }
}

async function hostGame(): Promise<void> {
  errorText.value = ''
  mode.value = 'online'
  role.value = 'host'
  roomCode.value = generateRoomCode()
  resetGame()
  void router.replace({ query: { room: roomCode.value } })
  try {
    net.value = await createHostConnection(roomCode.value, {
      onStatus: handleStatus,
      onMessage: handleMessage,
    })
  } catch {
    status.value = 'error'
    statusDetail.value = 'peer-error'
  }
}

async function joinGame(): Promise<void> {
  errorText.value = ''
  const code = normalizeRoomCode(joinCode.value)
  if (!isValidRoomCode(code)) {
    errorText.value = '请输入 6 位有效房号'
    return
  }
  roomCode.value = code
  mode.value = 'online'
  role.value = 'guest'
  resetGame()
  void router.replace({ query: { room: code } })
  try {
    net.value = await createGuestConnection(code, {
      onStatus: handleStatus,
      onMessage: handleMessage,
    })
  } catch {
    status.value = 'error'
    statusDetail.value = 'peer-error'
  }
}

function startLocal(): void {
  mode.value = 'local'
  role.value = null
  resetGame()
}

function rematch(): void {
  if (mode.value === 'local') {
    resetGame()
    return
  }
  if (role.value === 'host') {
    resetGame()
    sendState()
    return
  }
  net.value?.send({ t: 'rematch', v: 1 })
}

function closeNet(): void {
  net.value?.close()
  net.value = null
  status.value = 'closed'
  statusDetail.value = ''
}

function backToMenu(): void {
  closeNet()
  mode.value = 'menu'
  role.value = null
  resetGame()
  roomCode.value = ''
  joinCode.value = ''
  showJoin.value = false
  errorText.value = ''
  void router.replace({ query: {} })
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  void PlatformAdapter.copyToClipboard(text)
  return Promise.resolve()
}

async function copyCode(): Promise<void> {
  try {
    await copyText(roomCode.value)
    copyHint.value = '已复制'
    toast('房号已复制')
  } catch {
    copyHint.value = '复制失败'
  }
}

async function copyInvite(): Promise<void> {
  const url = inviteUrl(roomCode.value, {
    origin: window.location.origin,
    pathname: window.location.pathname,
  })
  try {
    await copyText(url)
    toast('邀请链接已复制')
  } catch {
    toast('复制失败，请手动分享房号')
  }
}

onMounted(() => {
  const room = normalizeRoomCode(String(route.query.room ?? ''))
  if (isValidRoomCode(room)) {
    joinCode.value = room
    void joinGame()
  }
})

onBeforeUnmount(() => {
  closeNet()
})
</script>

<style scoped>
.gomoku-board {
  display: grid;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 1rem;
  background-color: #e8dcc8;
  box-shadow:
    inset 0 1px 2px rgb(0 0 0 / 8%),
    var(--shadow-ring);
  padding: 0.375rem;
  touch-action: manipulation;
}

:global(.dark) .gomoku-board {
  background-color: #3a342c;
}

.gomoku-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid rgb(90 70 40 / 14%);
  border-bottom: 1px solid rgb(90 70 40 / 14%);
  aspect-ratio: 1 / 1;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

:global(.dark) .gomoku-cell {
  border-color: rgb(250 249 245 / 8%);
}

.gomoku-cell:disabled {
  cursor: default;
}

.gomoku-cell:not(:disabled):hover {
  background-color: rgb(181 84 58 / 10%);
}

.gomoku-stone {
  width: 78%;
  height: 78%;
  border-radius: 9999px;
  transition: transform 0.12s ease;
}

.gomoku-stone--black {
  background: radial-gradient(circle at 35% 30%, #4a4a47, #141413 70%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 35%);
}

.gomoku-stone--white {
  background: radial-gradient(circle at 35% 30%, #ffffff, #e6ddcd 70%);
  box-shadow:
    inset 0 0 0 1px rgb(90 70 40 / 22%),
    0 1px 2px rgb(0 0 0 / 22%);
}

.gomoku-last {
  position: absolute;
  width: 20%;
  height: 20%;
  border-radius: 9999px;
  background-color: var(--color-accent, #b5543a);
  box-shadow: 0 0 0 2px rgb(181 84 58 / 25%);
}

.gomoku-cell--win .gomoku-stone {
  box-shadow: 0 0 0 2px #b5543a;
}
</style>

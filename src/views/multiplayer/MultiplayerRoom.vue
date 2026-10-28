<template>
  <div class="eg-shell">
    <header class="mx-auto mb-5 flex w-full max-w-2xl items-center justify-between">
      <RouterLink to="/" class="eg-back-btn group" aria-label="返回游戏大厅"> ← </RouterLink>
      <div class="eg-game-title">{{ adapter.name }} · 联机</div>
      <div class="flex gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <!-- 菜单：创建 / 加入 / 本机双人 -->
      <template v-if="room.mode.value === 'menu'">
        <section class="eg-card p-5 sm:p-6">
          <h1 class="font-display text-3xl font-medium text-text-light dark:text-text-dark">
            {{ adapter.name }} · 联机
          </h1>
          <p class="eg-lead mt-3">
            创建房号，把链接发给朋友，浏览器之间 P2P
            直连。可以两人对局，其他人进入观战；也支持本机双人。
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
            v-if="room.errorText.value"
            class="mt-4 text-sm text-danger-light dark:text-danger-dark"
            role="alert"
          >
            {{ room.errorText.value }}
          </p>
        </section>

        <!-- 本机段位 -->
        <section class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="eg-card p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="eg-overline">我的段位（本机记录）</p>
                <p class="mt-2 font-display text-2xl text-text-light dark:text-text-dark">
                  {{ tier.name }}
                  <span class="ml-1 text-base text-text-muted-light dark:text-text-muted-dark">
                    {{ room.profile.value.rating }}
                  </span>
                </p>
              </div>
              <span
                class="flex h-12 w-12 items-center justify-center rounded-xl font-display text-lg text-white shadow-ring"
                :style="{ backgroundColor: tier.color }"
                aria-hidden="true"
              >
                {{ tier.name.charAt(0) }}
              </span>
            </div>
            <p class="mt-3 text-caption text-text-faint-light dark:text-text-faint-dark">
              {{ room.profile.value.games }} 局 · {{ room.profile.value.wins }} 胜
              {{ room.profile.value.losses }} 负 {{ room.profile.value.draws }} 平 · 连胜
              {{ room.profile.value.streak }}
              <template v-if="nextTier">
                · 距 {{ nextTier.next.name }} 还差 {{ nextTier.gap }} 分</template
              >
            </p>
          </div>
          <div class="eg-card p-4 text-caption text-text-muted-light dark:text-text-muted-dark">
            <p class="font-medium text-text-light dark:text-text-dark">联机说明</p>
            <ul class="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
              <li>房号邀请 · P2P 直连，双方需同时在线</li>
              <li>第三人及以后自动进入观战，只读</li>
              <li>断线后会自动重连，恢复同一局</li>
              <li>段位只保存在本机，供娱乐参考</li>
            </ul>
          </div>
        </section>
      </template>

      <!-- 对局 -->
      <template v-else>
        <section class="eg-card mb-4 p-3 sm:p-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="eg-chip">{{ roleLabel }}</span>
            <span
              v-if="room.mode.value === 'online'"
              class="flex items-center gap-2 text-text-light dark:text-text-dark"
            >
              <span class="text-caption text-text-faint-light dark:text-text-faint-dark">房号</span>
              <button
                type="button"
                class="font-mono text-lg tracking-[0.2em] text-accent-light transition-colors hover:text-accent-hover-light dark:text-accent-dark"
                :title="copyHint"
                @click="copyCode"
              >
                {{ room.roomCode.value }}
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

          <div v-if="room.mode.value === 'online'" class="mt-3 flex flex-wrap items-center gap-2">
            <button
              v-if="room.status.value === 'waiting'"
              type="button"
              class="eg-secondary-btn"
              @click="copyInvite"
            >
              <AppIcon name="share" :size="17" /> 复制邀请链接
            </button>
          </div>

          <!-- 快捷语 -->
          <div
            v-if="room.mode.value === 'online' && room.status.value === 'connected'"
            class="mt-3 flex flex-wrap gap-1.5"
          >
            <button
              v-for="message in quickMessages"
              :key="message.id"
              type="button"
              class="quick-chip"
              @click="room.sendChat(message.id)"
            >
              {{ message.text }}
            </button>
          </div>
        </section>

        <div class="relative mx-auto w-full max-w-[min(92vw,34rem)]">
          <GomokuBoard
            v-if="gameId === 'gomoku'"
            :state="gomokuState"
            :can-select="canSelectGomoku"
            @select="room.play"
          />
          <Connect4Board
            v-else
            :state="connect4State"
            :can-select="canSelectConnect4"
            @select="room.play"
          />

          <!-- 快捷语气泡 -->
          <Transition name="bubble">
            <div
              v-if="chatBubble"
              class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-card-light/95 px-3.5 py-2 text-sm shadow-lift dark:bg-card-dark/95"
              role="status"
              aria-live="polite"
            >
              <span class="text-caption text-text-faint-light dark:text-text-faint-dark">
                {{ chatBubble.from }}：
              </span>
              <span class="font-medium text-text-light dark:text-text-dark">{{
                chatBubble.text
              }}</span>
            </div>
          </Transition>

          <!-- 结果遮罩 -->
          <div
            v-if="stateOver"
            data-testid="room-result"
            class="absolute inset-0 flex items-center justify-center rounded-2xl bg-bg-light/95 dark:bg-bg-dark/95"
          >
            <div class="space-y-3 px-4 text-center">
              <div class="font-display text-3xl text-text-light dark:text-text-dark">
                {{ resultTitle }}
              </div>
              <p class="text-sm text-text-muted-light dark:text-text-muted-dark">
                {{ resultHint }}
              </p>
              <p
                v-if="room.lastDelta.value !== null"
                class="text-sm font-medium"
                :class="
                  room.lastDelta.value > 0
                    ? 'text-success-light dark:text-success-dark'
                    : room.lastDelta.value < 0
                      ? 'text-danger-light dark:text-danger-dark'
                      : 'text-text-muted-light dark:text-text-muted-dark'
                "
              >
                本机段位 {{ room.lastDelta.value > 0 ? '+' : '' }}{{ room.lastDelta.value }}
              </p>
              <div class="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  class="eg-primary-btn"
                  :disabled="room.isSpectator.value"
                  @click="rematch"
                >
                  再来一局
                </button>
                <button
                  v-if="!room.isSpectator.value"
                  type="button"
                  class="eg-secondary-btn"
                  @click="shareResult"
                >
                  分享战绩
                </button>
                <button type="button" class="eg-ghost-btn" @click="backToMenu">返回</button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col items-center gap-2 text-center">
          <p class="font-display text-lg text-text-light dark:text-text-dark">{{ turnText }}</p>
          <p
            v-if="room.mode.value === 'online' && room.status.value === 'connected' && !stateOver"
            class="text-caption text-text-faint-light dark:text-text-faint-dark"
          >
            {{ turnHint }}
          </p>
          <p
            v-if="
              room.mode.value === 'online' &&
              room.reconnecting.value &&
              room.status.value !== 'connected'
            "
            class="text-caption text-danger-light dark:text-danger-dark"
          >
            连接中断，正在自动重连…
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <span v-if="room.mode.value === 'local'" class="eg-chip">红/黑先手</span>
            <button
              v-if="room.mode.value === 'local'"
              type="button"
              class="eg-ghost-btn !min-h-9 !px-3 !text-xs"
              @click="rematch"
            >
              重开
            </button>
            <button
              v-if="room.mode.value !== 'local' && room.status.value !== 'connected'"
              type="button"
              class="eg-ghost-btn !min-h-9 !px-3 !text-xs"
              @click="backToMenu"
            >
              返回房间
            </button>
            <button
              v-if="room.mode.value !== 'local'"
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
    <ShareSheet v-model="shareOpen" :card="shareCard" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import ThemeToggle from '../../components/ThemeToggle.vue'
import ShareSheet from '../../components/ShareSheet.vue'
import GomokuBoard from '../../components/multiplayer/GomokuBoard.vue'
import Connect4Board from '../../components/multiplayer/Connect4Board.vue'
import { useMultiplayerRoom } from '../../composables/useMultiplayerRoom'
import type { ShareCardData } from '../../utils/shareCard'
import { getGameAdapter, isGameId } from '../../game/multiplayer/adapters'
import { nextTierGap, tierOf } from '../../game/multiplayer/profile'
import { dropIndex } from '../../game/connect4/GameEngine'
import type { Connect4State } from '../../game/connect4/types'
import type { GomokuState } from '../../game/gomoku/types'
import { QUICK_MESSAGES, quickMessageText } from '../../net/quickMessages'
import type { ChatSeat, GameId } from '../../net/protocol'
import { inviteUrl, isValidRoomCode, normalizeRoomCode } from '../../net/roomCode'
import { PlatformAdapter } from '../../adapters/PlatformAdapter'
import { toast } from '../../utils/toast'

const route = useRoute()
const router = useRouter()

const gameId: GameId = isGameId(route.params.gameId) ? route.params.gameId : 'gomoku'
const adapter = getGameAdapter(gameId)
const room = useMultiplayerRoom(adapter)

const gomokuState = computed(() => room.state.value as GomokuState)
const connect4State = computed(() => room.state.value as Connect4State)
const stateOver = computed(() => adapter.isOver(room.state.value))

const quickMessages = QUICK_MESSAGES.slice(0, 7)
const showJoin = ref(false)
const joinCode = ref('')
const copyHint = ref('点击复制房号')
const shareOpen = ref(false)
const shareCard = ref<ShareCardData | null>(null)

const tier = computed(() => tierOf(room.profile.value.rating))
const nextTier = computed(() => nextTierGap(room.profile.value.rating))

const roleLabel = computed(() => {
  if (room.mode.value === 'local') return '本机双人'
  if (room.role.value === 'host') return '房主（先手）'
  if (room.role.value === 'guest') return '访客（后手）'
  if (room.role.value === 'spectator') return '观战中'
  return ''
})

const statusText = computed(() => {
  if (room.mode.value === 'local') return '本机轮流落子'
  switch (room.status.value) {
    case 'connecting':
      return '正在连接…'
    case 'waiting':
      return room.reconnecting.value ? '等待对手重连…' : '等待对手加入…'
    case 'connected':
      return room.spectators.value > 0 ? `已连接 · ${room.spectators.value} 人观战` : '已连接'
    case 'reconnecting':
      return '正在重连…'
    case 'closed':
      return '连接已断开'
    case 'error':
      return errorLabel(room.statusDetail.value)
    default:
      return ''
  }
})

const statusClass = computed(() => {
  const status = room.status.value
  if (status === 'connected') return 'text-success-light dark:text-success-dark'
  if (status === 'error' || status === 'closed') return 'text-danger-light dark:text-danger-dark'
  return 'text-text-faint-light dark:text-text-faint-dark'
})

const turnText = computed(() => {
  if (adapter.isOver(room.state.value)) return resultTitle.value
  const seat = adapter.turnSeat(room.state.value)
  if (room.mode.value === 'local') return `轮到${adapter.turnLabel(room.state.value)}`
  if (room.role.value === 'spectator') return `轮到${adapter.seatLabel(seat)}`
  return seat === room.mySeat.value
    ? `轮到${adapter.turnLabel(room.state.value)}（你）`
    : `轮到${adapter.turnLabel(room.state.value)}（对手）`
})

const turnHint = computed(() => {
  if (room.role.value === 'spectator') return '观战中，只读'
  return room.myTurn.value ? '轮到你落子' : '等待对手…'
})

const resultTitle = computed(() => {
  if (!adapter.isOver(room.state.value)) return ''
  const winner = adapter.winnerSeat(room.state.value)
  if (room.mode.value === 'local' || room.role.value === 'spectator' || !room.mySeat.value) {
    return winner ? `${adapter.seatLabel(winner)}获胜` : '平局'
  }
  if (!winner) return '平局'
  return winner === room.mySeat.value ? '你赢了' : '你输了'
})

const resultHint = computed(() => {
  const over = adapter.isOver(room.state.value)
  if (!over) return ''
  const anyState = room.state.value as { moves?: number; board?: unknown[] }
  const moves = typeof anyState.moves === 'number' ? anyState.moves : 0
  const winner = adapter.winnerSeat(room.state.value)
  return winner ? `共 ${moves} 手` : `棋盘已满，共 ${moves} 手`
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

const chatBubble = ref<{ from: string; text: string } | null>(null)
let chatTimer: ReturnType<typeof setTimeout> | null = null

function seatName(seat: ChatSeat): string {
  if (seat === 'spectator') return '观众'
  if (room.mode.value === 'local') return adapter.seatLabel(seat)
  return seat === room.mySeat.value ? '你' : adapter.seatLabel(seat)
}

watch(
  () => room.chatLog.value.length,
  (length) => {
    if (!length) return
    const last = room.chatLog.value[length - 1]
    const text = quickMessageText(last.id)
    if (!text) return
    chatBubble.value = { from: seatName(last.seat), text }
    if (chatTimer) clearTimeout(chatTimer)
    chatTimer = setTimeout(() => {
      chatBubble.value = null
    }, 2800)
  },
)

function canSelectGomoku(index: number): boolean {
  const state = gomokuState.value
  if (state.over || state.board[index] !== null) return false
  return room.mode.value === 'local' || room.myTurn.value
}

function canSelectConnect4(col: number): boolean {
  const state = connect4State.value
  if (state.over) return false
  if (dropIndex(state.board, col) < 0) return false
  return room.mode.value === 'local' || room.myTurn.value
}

function hostGame(): void {
  void router.replace({ query: { room: '' } })
  void room.hostGame().then(() => {
    void router.replace({ query: { room: room.roomCode.value } })
  })
}

function joinGame(): void {
  if (!isValidRoomCode(normalizeRoomCode(joinCode.value))) return
  void room.joinGame(joinCode.value)
}

function startLocal(): void {
  room.startLocal()
  void router.replace({ query: {} })
}

function shareResult(): void {
  if (!stateOver.value) return
  const moves = (room.state.value as { moves?: number }).moves ?? 0
  const mySeat = room.mySeat.value
  const winner = adapter.winnerSeat(room.state.value)
  const resultText = resultTitle.value
  const isLocal = room.mode.value === 'local'
  const stats: Array<{ label: string; value: string }> = []

  if (isLocal) {
    stats.push({ label: '模式', value: '本机双人' })
  } else {
    stats.push({ label: '我的执子', value: mySeat ? adapter.seatLabel(mySeat) : '观战' })
  }
  stats.push({ label: '结果', value: resultText || '—' })
  if (!isLocal && room.lastDelta.value !== null) {
    stats.push({
      label: '本机段位',
      value: `${room.lastDelta.value > 0 ? '+' : ''}${room.lastDelta.value}`,
    })
  }

  shareCard.value = {
    gameId,
    gameName: `${adapter.name}联机`,
    glyph: adapter.name.charAt(0),
    title: resultText || '对局结束',
    subtitle: `${adapter.name} · ${isLocal ? '本机双人' : '联机对战'} · 共 ${moves} 手`,
    stats,
    footer: isLocal
      ? `${adapter.name} · 本机双人`
      : winner
        ? `${adapter.seatLabel(winner)}获胜`
        : '平局',
    route: `/multiplayer/${gameId}`,
  }
  shareOpen.value = true
}

function rematch(): void {
  room.rematch()
}

function backToMenu(): void {
  room.leave()
  showJoin.value = false
  joinCode.value = ''
  void router.replace({ query: {} })
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  await PlatformAdapter.copyToClipboard(text)
}

async function copyCode(): Promise<void> {
  try {
    await copyText(room.roomCode.value)
    copyHint.value = '已复制'
    toast('房号已复制')
  } catch {
    copyHint.value = '复制失败'
  }
}

async function copyInvite(): Promise<void> {
  const url = inviteUrl(room.roomCode.value, gameId, {
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
  document.title = `${adapter.name}联机 · EasyGame`
  const roomParam = normalizeRoomCode(String(route.query.room ?? ''))
  if (isValidRoomCode(roomParam)) {
    joinCode.value = roomParam
    void room.joinGame(roomParam)
  }
})

onBeforeUnmount(() => {
  if (chatTimer) clearTimeout(chatTimer)
  // room 内部 onBeforeUnmount 会关闭连接
})
</script>

<style scoped>
.quick-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background-color: var(--tw-bg, #faf9f5);
  color: rgb(94 93 89);
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: inset 0 0 0 1px rgb(20 20 19 / 8%);
  transition: background-color 0.15s ease;
}

.quick-chip:hover {
  background-color: rgb(232 230 220);
  color: rgb(20 20 19);
}

:global(.dark) .quick-chip {
  background-color: rgb(31 31 29);
  color: rgb(176 174 165);
  box-shadow: inset 0 0 0 1px rgb(250 249 245 / 10%);
}

:global(.dark) .quick-chip:hover {
  background-color: rgb(42 42 39);
  color: rgb(245 244 237);
}

.bubble-enter-active,
.bubble-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
</style>

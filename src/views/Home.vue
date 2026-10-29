<template>
  <div class="eg-shell">
    <!-- 顶栏 -->
    <header class="mx-auto flex w-full max-w-shell items-center justify-between py-2">
      <RouterLink
        to="/"
        class="group flex items-center gap-3 rounded-xl focus-visible:outline-none"
      >
        <span
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-light text-accent-light shadow-ring transition-colors group-hover:bg-accent-soft-light dark:bg-sand-dark dark:text-accent-dark dark:group-hover:bg-accent-soft-dark"
          aria-hidden="true"
        >
          <AppIcon name="logo" :size="18" />
        </span>
        <span class="flex flex-col">
          <span
            class="font-display text-lg font-medium leading-tight tracking-tight text-text-light dark:text-text-dark"
          >
            EasyGame
          </span>
          <span class="eg-overline mt-0.5">益智小游戏集合</span>
        </span>
      </RouterLink>
      <div class="flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-shell flex-1 flex-col">
      <!-- Hero：标题 + 一句说明，把首屏留给游戏 -->
      <section class="pb-6 pt-6 md:pb-8 md:pt-8">
        <div
          class="flex animate-rise-in flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10"
        >
          <h1
            class="max-w-2xl font-display text-[clamp(2rem,4.2vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.02em] text-balance text-text-light dark:text-text-dark"
          >
            经典益智，<span class="text-accent-light dark:text-accent-dark">随手一局</span>。
          </h1>
          <p class="eg-lead max-w-md text-pretty md:max-w-lg md:pb-1 md:text-right">
            无需下载、没有广告，<span class="hidden sm:inline">电脑手机都顺手，</span>断网也能继续。
          </p>
        </div>
      </section>

      <!-- 游戏大厅 -->
      <section
        id="lobby"
        class="scroll-mt-6 border-t border-border-subtle-light pt-8 dark:border-border-subtle-dark"
      >
        <div class="mb-5 flex items-end justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <h2 class="eg-heading">游戏大厅</h2>
          </div>
          <span class="text-caption text-text-faint-light dark:text-text-faint-dark"
            >共 {{ games.length }} 款</span
          >
        </div>
        <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          <GameCard
            v-for="(g, i) in games"
            :key="g.id"
            :game="g"
            :index="i"
            :style="{ animationDelay: `${Math.min(i, 8) * 45}ms` }"
            class="animate-rise-in"
          />
        </div>
      </section>

      <!-- 联机对战 -->
      <section
        id="multiplayer"
        ref="multiplayerSection"
        class="mt-12 scroll-mt-6 border-t border-border-subtle-light pt-8 dark:border-border-subtle-dark"
      >
        <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <h2 class="eg-heading">联机对战</h2>
            <span class="eg-chip">P2P · 房号邀请</span>
          </div>
          <span
            class="flex items-center gap-1.5 text-caption text-text-faint-light dark:text-text-faint-dark"
          >
            我的段位
            <span
              class="inline-flex items-center gap-1 font-medium text-text-soft-light dark:text-text-soft-dark"
            >
              <span
                class="h-2 w-2 rounded-full"
                :style="{ backgroundColor: myTier.color }"
                aria-hidden="true"
              ></span>
              {{ myTier.name }}
            </span>
            <span>{{ profile.rating }}</span>
          </span>
        </div>
        <!-- 公开房间：跨浏览器房间目录；对局数据仍走 P2P -->
        <div class="mb-4 eg-card p-4 sm:p-5" data-testid="public-rooms">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-display text-xl font-medium text-text-light dark:text-text-dark">
                公开房间
              </h3>
              <span class="eg-chip">跨浏览器</span>
              <span
                class="inline-flex items-center gap-1.5 text-caption text-text-faint-light dark:text-text-faint-dark"
                role="status"
                aria-live="polite"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="directoryStatusDotClass"
                  aria-hidden="true"
                ></span>
                {{ directoryStatusText }}
              </span>
            </div>
            <RouterLink
              to="/multiplayer/gomoku"
              class="text-caption text-text-soft-light underline-offset-2 hover:underline dark:text-text-soft-dark"
            >
              创建房间
            </RouterLink>
          </div>

          <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="按游戏筛选">
            <button
              v-for="filter in gameFilters"
              :key="filter.id"
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="
                activeGame === filter.id
                  ? 'bg-accent-light text-white dark:bg-accent-dark dark:text-bg-dark'
                  : 'text-text-faint-light hover:text-text-light dark:text-text-faint-dark dark:hover:text-text-dark'
              "
              :aria-pressed="activeGame === filter.id"
              @click="activeGame = filter.id"
            >
              {{ filter.label }}
            </button>
          </div>

          <div
            v-if="directoryStatus === 'error'"
            class="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-sand-light/60 px-3 py-2.5 text-caption text-text-muted-light dark:bg-sand-dark/40 dark:text-text-muted-dark"
          >
            <span>房间服务暂时不可用，可直接用邀请链接或房号加入。</span>
            <button
              type="button"
              class="eg-ghost-btn !min-h-8 !px-2.5 !text-xs"
              @click="retryDirectory"
            >
              重试
            </button>
          </div>

          <p
            v-else-if="directoryStatus === 'connecting'"
            class="mt-3 text-caption text-text-muted-light dark:text-text-muted-dark"
          >
            正在连接房间服务…
          </p>

          <p
            v-else-if="!filteredRooms.length"
            class="mt-3 text-caption text-text-muted-light dark:text-text-muted-dark"
          >
            暂无公开房间。创建房间时勾选「公开房间」，就会出现在这里。
          </p>

          <div v-else class="mt-3 grid gap-2 sm:grid-cols-2">
            <div
              v-for="room in filteredRooms"
              :key="`${room.gameId}-${room.code}`"
              data-testid="public-room"
              class="flex items-center gap-3 rounded-xl border border-border-subtle-light px-3 py-2.5 dark:border-border-subtle-dark"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sand-light font-display text-sm text-accent-light shadow-ring dark:bg-sand-dark dark:text-accent-dark"
                aria-hidden="true"
                >{{ roomGame(room.gameId)?.glyph ?? '?' }}</span
              >
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="truncate text-sm font-medium text-text-light dark:text-text-dark">
                    {{ roomGame(room.gameId)?.name ?? '联机对战' }}
                  </span>
                  <span
                    class="font-mono text-xs tracking-[0.12em] text-text-faint-light dark:text-text-faint-dark"
                  >
                    {{ room.code }}
                  </span>
                </span>
                <span
                  class="mt-0.5 flex items-center gap-1.5 text-caption text-text-faint-light dark:text-text-faint-dark"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="
                      room.status === 'waiting'
                        ? 'bg-success-light'
                        : 'bg-text-faint-light dark:bg-text-faint-dark'
                    "
                    aria-hidden="true"
                  ></span>
                  {{ room.status === 'waiting' ? '等待对手' : '对局中' }} · {{ room.players }}/2
                </span>
              </span>
              <RouterLink
                v-if="room.status === 'waiting'"
                :to="applyRoomUrl(room)"
                class="eg-primary-btn !min-h-9 !px-3 !text-xs"
              >
                申请加入
              </RouterLink>
              <RouterLink
                v-else
                :to="watchRoomUrl(room)"
                class="eg-secondary-btn !min-h-9 !px-3 !text-xs"
              >
                观战
              </RouterLink>
            </div>
          </div>

          <p
            class="mt-3 text-[0.7rem] leading-relaxed text-text-faint-light dark:text-text-faint-dark"
          >
            公开房只共享房号与状态，棋局仍为 P2P 直连；加入需要房主同意。朋友可直接用邀请链接进入。
          </p>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <RouterLink
            v-for="game in multiplayerGames"
            :key="game.id"
            :to="`/multiplayer/${game.id}`"
            class="group flex items-center gap-4 rounded-2xl bg-card-light p-4 shadow-ring transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift-strong dark:bg-card-dark"
          >
            <span
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sand-light font-display text-2xl text-accent-light shadow-ring dark:bg-sand-dark dark:text-accent-dark"
              aria-hidden="true"
              >{{ game.glyph }}</span
            >
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span
                  class="font-display text-lg font-medium text-text-light dark:text-text-dark"
                  >{{ game.name }}</span
                >
                <span class="eg-chip">联机</span>
              </span>
              <span
                class="mt-1 block text-[0.75rem] leading-relaxed text-text-muted-light dark:text-text-muted-dark"
              >
                {{ game.description }}支持观战与断线重连。
              </span>
            </span>
            <span
              class="text-text-faint-light transition-transform group-hover:translate-x-0.5 dark:text-text-faint-dark"
              aria-hidden="true"
            >
              <AppIcon name="arrow-right" :size="18" />
            </span>
          </RouterLink>
        </div>
      </section>

      <!-- 扫码即玩 + 操作方式 -->
      <section id="online" class="mt-12 scroll-mt-6">
        <div class="mb-5 flex items-end justify-between gap-3">
          <h2 class="eg-heading">分享与上手</h2>
        </div>
        <OnlinePanel />
      </section>
    </main>

    <!-- 页脚 -->
    <footer
      class="mx-auto mt-14 flex w-full max-w-shell flex-col items-center gap-2 border-t border-border-subtle-light py-6 text-center dark:border-border-subtle-dark"
    >
      <p class="text-caption text-text-faint-light dark:text-text-faint-dark">
        EasyGame · 用 Vue 3 构建 · MIT 开源
      </p>
      <p class="text-caption text-text-faint-light dark:text-text-faint-dark">即开即玩，无需安装</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '../stores/game'
import AppIcon from '../components/AppIcon.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import SoundToggle from '../components/SoundToggle.vue'
import GameCard from '../components/GameCard.vue'
import OnlinePanel from '../components/OnlinePanel.vue'
import { MULTIPLAYER_GAMES } from '../game/multiplayer/adapters'
import { loadProfile, tierOf } from '../game/multiplayer/profile'
import {
  openRoomDirectory,
  type DirectoryStatus,
  type PublicRoomInfo,
  type RoomDirectoryHandle,
} from '../net/roomDirectory'
import type { GameId } from '../net/protocol'

const gameStore = useGameStore()
const games = gameStore.games

const multiplayerGames = MULTIPLAYER_GAMES
const profile = loadProfile()
const myTier = tierOf(profile.rating)

const gameFilters: Array<{ id: 'all' | GameId; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'gomoku', label: '五子棋' },
  { id: 'connect4', label: '四子棋' },
]

const publicRooms = ref<PublicRoomInfo[]>([])
const directoryStatus = ref<DirectoryStatus>('connecting')
const activeGame = ref<'all' | GameId>('all')
let directory: RoomDirectoryHandle | null = null
let observer: IntersectionObserver | null = null
let disposed = false
const multiplayerSection = ref<HTMLElement | null>(null)

const filteredRooms = computed(() =>
  activeGame.value === 'all'
    ? publicRooms.value
    : publicRooms.value.filter((room) => room.gameId === activeGame.value),
)

const directoryStatusText = computed(() => {
  switch (directoryStatus.value) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中'
    case 'closed':
      return '已断开'
    default:
      return '不可用'
  }
})

const directoryStatusDotClass = computed(() => {
  if (directoryStatus.value === 'connected') return 'bg-success-light'
  if (directoryStatus.value === 'connecting') return 'bg-accent-light animate-pulse'
  return 'bg-danger-light'
})

function roomGame(gameId: GameId) {
  return MULTIPLAYER_GAMES.find((game) => game.id === gameId)
}

function applyRoomUrl(room: PublicRoomInfo): string {
  return `/multiplayer/${room.gameId}?room=${room.code}&request=1`
}

function watchRoomUrl(room: PublicRoomInfo): string {
  return `/multiplayer/${room.gameId}?room=${room.code}`
}

async function connectDirectory(): Promise<void> {
  directory?.close()
  directory = null
  if (disposed) return
  directoryStatus.value = 'connecting'
  try {
    directory = await openRoomDirectory({
      onRooms: (rooms) => {
        publicRooms.value = rooms
      },
      onStatus: (status) => {
        directoryStatus.value = status
      },
    })
  } catch {
    directoryStatus.value = 'error'
  }
}

function retryDirectory(): void {
  void connectDirectory()
}

onMounted(() => {
  // 目录连接懒加载：滚动到「联机对战」附近再连，避免首页首屏下载 mqtt 分块
  if (typeof IntersectionObserver === 'undefined' || !multiplayerSection.value) {
    void connectDirectory()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer?.disconnect()
      observer = null
      void connectDirectory()
    },
    { rootMargin: '200px 0px' },
  )
  observer.observe(multiplayerSection.value)
})

onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  observer = null
  directory?.close()
  directory = null
})
</script>

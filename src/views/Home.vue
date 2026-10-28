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
      <!-- Hero -->
      <section class="py-10 md:py-16">
        <div class="max-w-2xl animate-rise-in">
          <p class="eg-overline">Classic puzzle collection</p>
          <h1 class="eg-display mt-3 text-balance">
            经典益智，<span class="text-accent-light dark:text-accent-dark">随手一局</span>。
          </h1>
          <p class="eg-lead mt-5 max-w-xl">
            无需下载、没有广告，打开浏览器就能玩。八款经得起反复玩的经典益智游戏，
            电脑和手机都顺手，断网也能继续。
          </p>
          <p class="mt-4 text-caption text-text-faint-light dark:text-text-faint-dark">
            已上线：
            <span class="text-text-soft-light dark:text-text-soft-dark">{{ gameNames }}</span>
          </p>
          <div class="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" class="eg-primary-btn" @click="scrollToLobby">
              <span>浏览游戏大厅</span>
              <AppIcon name="arrow-right" :size="18" />
            </button>
            <a class="eg-ghost-btn" href="#online" @click.prevent="scrollToOnline">
              <AppIcon name="share" :size="17" />
              <span>分享到手机</span>
            </a>
          </div>
          <p
            class="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-faint-light dark:text-text-faint-dark"
          >
            <span>{{ games.length }} 款游戏</span>
            <span aria-hidden="true">·</span>
            <span>离线可玩</span>
            <span aria-hidden="true">·</span>
            <span>无需账号</span>
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
import { useGameStore } from '../stores/game'
import AppIcon from '../components/AppIcon.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import SoundToggle from '../components/SoundToggle.vue'
import GameCard from '../components/GameCard.vue'
import OnlinePanel from '../components/OnlinePanel.vue'
import { MULTIPLAYER_GAMES } from '../game/multiplayer/adapters'
import { loadProfile, tierOf } from '../game/multiplayer/profile'

const gameStore = useGameStore()
const games = gameStore.games
const gameNames = games.map((g) => g.name).join('、')

const multiplayerGames = MULTIPLAYER_GAMES
const profile = loadProfile()
const myTier = tierOf(profile.rating)

function scrollToLobby() {
  document.getElementById('lobby')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToOnline() {
  document.getElementById('online')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

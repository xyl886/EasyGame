<template>
  <div class="eg-shell">
    <!-- 顶部栏 -->
    <header class="max-w-5xl w-full mx-auto flex items-center justify-between mb-6 md:mb-8">
      <RouterLink to="/" class="flex items-center gap-3 group focus-visible:outline-none rounded-lg">
        <div
          class="w-11 h-11 rounded-2xl bg-accent-light dark:bg-accent-dark flex items-center justify-center shadow-claude-md group-hover:shadow-card-lift group-hover:-translate-y-0.5 transition-all duration-200"
        >
          <span class="text-white dark:text-bg-dark font-bold text-sm tracking-tight">EG</span>
        </div>
        <div>
          <div class="text-lg font-semibold tracking-tight text-text-light dark:text-text-dark">EasyGame</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark -mt-0.5">轻松玩，随时乐</div>
        </div>
      </RouterLink>
      <div class="flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- 主内容 -->
    <main class="max-w-5xl w-full mx-auto flex-1 space-y-8 md:space-y-10">
      <!-- Hero 横幅 -->
      <section
        class="relative rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude-md p-7 md:p-12 overflow-hidden animate-rise-in"
      >
        <div
          class="absolute -top-24 -right-16 w-72 h-72 bg-accent-light/10 dark:bg-accent-dark/10 rounded-full blur-3xl pointer-events-none"
        ></div>
        <div
          class="absolute -bottom-28 left-10 w-56 h-56 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none"
        ></div>
        <div class="relative max-w-2xl">
          <div
            class="inline-flex items-center gap-2 text-xs font-medium text-accent-light dark:text-accent-dark mb-5 px-3 py-1.5 rounded-full bg-accent-light/10 dark:bg-accent-dark/10 border border-accent-light/15 dark:border-accent-dark/20"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-accent-light dark:bg-accent-dark animate-pulse"></span>
            即开即玩 · 无需下载 · 离线可用
          </div>
          <h1 class="eg-hero-title mb-4">
            经典益智小游戏
            <span class="text-accent-light dark:text-accent-dark">合集</span>
          </h1>
          <p class="text-base md:text-lg text-text-muted-light dark:text-text-muted-dark leading-relaxed mb-6">
            已上线
            <template v-for="(g, i) in availableGames" :key="g.id">
              <strong class="text-text-light dark:text-text-dark font-semibold">{{ g.name }}</strong
              ><span v-if="i < availableGames.length - 1">、</span>
            </template>
            。扫码即可在手机畅玩。
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <div
              class="inline-flex items-baseline gap-1.5 rounded-2xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark px-4 py-2.5"
            >
              <span class="text-2xl font-extrabold tabular-nums text-text-light dark:text-text-dark">{{
                availableGames.length
              }}</span>
              <span class="text-xs text-text-muted-light dark:text-text-muted-dark">款游戏已上线</span>
            </div>
            <button type="button" class="eg-primary-btn" @click="scrollToLobby">浏览游戏大厅</button>
          </div>
        </div>
      </section>

      <!-- 游戏大厅 -->
      <section id="lobby" class="scroll-mt-6">
        <div class="eg-section-label">
          <h2 class="text-base font-semibold text-text-light dark:text-text-dark">游戏大厅</h2>
          <span class="text-xs text-text-muted-light dark:text-text-muted-dark ml-auto"
            >共 {{ availableGames.length }} 款</span
          >
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <GameCard
            v-for="(g, i) in gameStore.games"
            :key="g.id"
            :game="g"
            :style="{ animationDelay: `${Math.min(i, 8) * 40}ms` }"
          />
        </div>
      </section>

      <!-- 扫码即玩 + 操作方式 -->
      <section>
        <div class="eg-section-label">
          <h2 class="text-base font-semibold text-text-light dark:text-text-dark">上手与分享</h2>
        </div>
        <OnlinePanel />
      </section>
    </main>

    <!-- 页脚 -->
    <footer
      class="max-w-5xl w-full mx-auto mt-10 py-5 border-t border-border-light dark:border-border-dark text-center text-xs text-text-muted-light dark:text-text-muted-dark"
    >
      <p>EasyGame · 用 ❤️ 和 Vue 3 构建 · MIT 开源</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game'
import ThemeToggle from '../components/ThemeToggle.vue'
import SoundToggle from '../components/SoundToggle.vue'
import GameCard from '../components/GameCard.vue'
import OnlinePanel from '../components/OnlinePanel.vue'

const gameStore = useGameStore()
const availableGames = gameStore.games.filter((g) => g.status === 'available')

function scrollToLobby() {
  document.getElementById('lobby')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

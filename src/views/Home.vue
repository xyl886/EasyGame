<template>
  <div class="min-h-screen w-full py-6 px-4 md:px-8 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-5xl w-full mx-auto flex items-center justify-between mb-8">
      <RouterLink to="/" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-accent-light dark:bg-accent-dark flex items-center justify-center shadow-claude group-hover:shadow-claude-md transition-all duration-200">
          <span class="text-white font-bold text-sm tracking-tight">EG</span>
        </div>
        <div>
          <div class="text-lg font-semibold tracking-tight">EasyGame</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark -mt-0.5">轻松玩，随时乐</div>
        </div>
      </RouterLink>
      <div class="flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- 主内容 -->
    <main class="max-w-5xl w-full mx-auto flex-1 space-y-10">
      <!-- Hero 横幅 -->
      <section class="relative rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude-md p-8 md:p-12 overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-accent-light/5 dark:bg-accent-dark/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
        <div class="relative">
          <div class="inline-flex items-center gap-2 text-xs font-medium text-accent-light dark:text-accent-dark mb-4 px-3 py-1 rounded-full bg-accent-light/10 dark:bg-accent-dark/10">
            <span class="w-1.5 h-1.5 rounded-full bg-accent-light dark:bg-accent-dark"></span>
            即开即玩 · 无需下载
          </div>
          <h1 class="text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-text-light dark:text-text-dark">
            经典益智小游戏
            <span class="text-accent-light dark:text-accent-dark"> 合集</span>
          </h1>
          <p class="text-base md:text-lg text-text-muted-light dark:text-text-muted-dark max-w-2xl leading-relaxed">
            精心复刻的益智游戏集合。已上线经典 <strong class="text-text-light dark:text-text-dark font-medium">2048</strong>、
            <strong class="text-text-light dark:text-text-dark font-medium">贪吃蛇</strong>、
            <strong class="text-text-light dark:text-text-dark font-medium">俄罗斯方块</strong>、
            <strong class="text-text-light dark:text-text-dark font-medium">华容道</strong>、
            <strong class="text-text-light dark:text-text-dark font-medium">数独</strong>、
            <strong class="text-text-light dark:text-text-dark font-medium">扫雷</strong>，
            支持手机扫码畅玩、离线使用。
          </p>
        </div>
      </section>

      <!-- 游戏大厅 -->
      <section>
        <h2 class="text-base font-semibold mb-3 text-text-light dark:text-text-dark">游戏大厅</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <GameCard v-for="g in gameStore.games" :key="g.id" :game="g" />
        </div>
      </section>

      <!-- 扫码即玩 + 操作方式 -->
      <section>
        <OnlinePanel />
      </section>
    </main>

    <!-- 页脚 -->
    <footer class="max-w-5xl w-full mx-auto mt-10 py-5 text-center text-xs text-text-muted-light dark:text-text-muted-dark">
      <p>EasyGame · 用 ❤️ 和 Vue 3 构建</p>
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
</script>

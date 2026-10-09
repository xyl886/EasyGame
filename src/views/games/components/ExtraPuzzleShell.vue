<template>
  <div class="eg-shell">
    <header class="max-w-5xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="eg-back-btn" aria-label="返回游戏大厅">←</RouterLink>
      <div class="eg-game-title">{{ icon }} {{ title }}</div>
      <div class="flex items-center gap-2">
        <button class="eg-icon-btn" type="button" aria-label="玩法说明" @click="showRules = true">❓</button>
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <main class="max-w-5xl w-full mx-auto flex-1">
      <slot />
    </main>

    <footer class="max-w-5xl w-full mx-auto mt-6 py-3 text-center text-xs text-text-muted-light dark:text-text-muted-dark">
      <RouterLink to="/" class="hover:text-accent-light dark:hover:text-accent-dark">← 返回游戏大厅</RouterLink>
    </footer>

    <HowToPlay v-model="showRules" :title="title">
      <slot name="rules" />
    </HowToPlay>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HowToPlay from '../../../components/HowToPlay.vue'
import SoundToggle from '../../../components/SoundToggle.vue'
import ThemeToggle from '../../../components/ThemeToggle.vue'

defineProps<{
  title: string
  icon: string
}>()

const showRules = ref(false)
</script>

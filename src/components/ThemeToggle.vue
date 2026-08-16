<template>
  <button
    @click="themeStore.toggleTheme()"
    class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-accent-light/40 dark:hover:border-accent-dark/40 transition-all duration-200 active:scale-95 flex items-center justify-center"
    :aria-label="themeStore.isDark ? '切换到浅色主题' : '切换到深色主题'"
  >
    <span class="text-lg leading-none">{{ themeStore.isDark ? '☀️' : '🌙' }}</span>
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()
</script>

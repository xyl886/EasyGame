<template>
  <button
    @click="themeStore.toggleTheme()"
    class="eg-icon-btn"
    :aria-label="themeStore.isDark ? '切换到浅色主题' : '切换到深色主题'"
  >
    <span class="text-lg leading-none">{{ themeStore.isDark ? '☀️' : '🌙' }}</span>
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()
</script>

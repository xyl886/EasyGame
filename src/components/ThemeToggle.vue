<template>
  <button
    type="button"
    class="eg-icon-btn"
    :aria-label="themeStore.isDark ? '切换到浅色主题' : '切换到深色主题'"
    :title="themeStore.isDark ? '切换到浅色主题' : '切换到深色主题'"
    @click="themeStore.toggleTheme()"
  >
    <AppIcon :name="themeStore.isDark ? 'sun' : 'moon'" :size="18" />
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '../stores/theme'
import AppIcon from './AppIcon.vue'

const themeStore = useThemeStore()
</script>

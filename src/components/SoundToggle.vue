<template>
  <button
    @click="sound.toggle()"
    class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-accent-light/40 dark:hover:border-accent-dark/40 transition-all duration-200 active:scale-95 flex items-center justify-center"
    :aria-label="sound.enabled ? '关闭音效' : '开启音效'"
  >
    <span class="text-lg leading-none">{{ sound.enabled ? '🔊' : '🔇' }}</span>
  </button>
</template>

<script setup lang="ts">
import { sound } from '../utils/sound'
</script>

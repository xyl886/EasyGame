<template>
  <div
    class="rounded-xl px-4 py-2 shadow-claude text-center min-w-[88px] border border-border-light dark:border-border-dark transition-all duration-200"
    :class="accent
      ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude-md'
      : 'bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark'"
  >
    <div class="text-[10px] uppercase tracking-wider opacity-70 font-semibold">{{ label }}</div>
    <div class="text-xl font-extrabold tabular-nums leading-tight">{{ formatted }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number
  accent?: boolean
}>()

const formatted = computed(() => props.value.toLocaleString('zh-CN'))
</script>

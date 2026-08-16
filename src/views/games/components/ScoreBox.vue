<template>
  <div
    class="rounded-xl px-4 py-2 shadow-claude text-center min-w-[88px] border border-border-light dark:border-border-dark transition-all duration-200"
    :class="accent
      ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude-md'
      : 'bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark'"
  >
    <div class="text-[10px] uppercase tracking-wider opacity-70 font-semibold">{{ label }}</div>
    <div
      class="text-xl font-extrabold tabular-nums leading-tight"
      :class="pop ? 'score-pop' : ''"
      @animationend="pop = false"
    >{{ formatted }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  label: string
  value: number
  accent?: boolean
}>()

const formatted = computed(() => props.value.toLocaleString('zh-CN'))

/** 数值变化时短暂弹跳（加分/刷新反馈） */
const pop = ref(false)
watch(
  () => props.value,
  () => {
    if (props.value > 0) pop.value = true
  },
)
</script>

<style scoped>
@keyframes scorePop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.28);
  }
  100% {
    transform: scale(1);
  }
}
.score-pop {
  animation: scorePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: inline-block;
}
</style>

<template>
  <RouterLink
    :to="game.route"
    class="group relative flex flex-col overflow-hidden rounded-2xl bg-card-light shadow-ring transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift-strong focus-visible:outline-none dark:bg-card-dark"
    :aria-label="`开始玩 ${game.name}`"
  >
    <!-- 封面带：暖色底 + 字形主视觉 + 大字水印，给每款游戏一个可识别的锚点 -->
    <div
      class="relative flex h-16 items-center justify-between overflow-hidden px-4 transition-colors duration-200 md:h-[4.5rem]"
      :class="coverClass"
    >
      <span
        class="relative z-10 font-display text-[1.6rem] font-medium leading-none"
        aria-hidden="true"
        >{{ game.glyph }}</span
      >
      <span
        class="pointer-events-none absolute -right-1 bottom-[-0.75rem] select-none font-display text-[4.5rem] leading-none opacity-[0.08]"
        aria-hidden="true"
        >{{ game.glyph }}</span
      >
      <span
        class="relative z-10 translate-x-1 text-current opacity-0 transition-all duration-200 ease-calm group-hover:translate-x-0 group-hover:opacity-100"
        aria-hidden="true"
      >
        <AppIcon name="arrow-right" :size="16" />
      </span>
    </div>
    <div class="flex flex-1 flex-col p-3.5 md:p-4">
      <h3
        class="font-display text-[1rem] font-medium leading-snug tracking-tight text-text-light dark:text-text-dark"
      >
        {{ game.name }}
      </h3>
      <p
        class="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-text-muted-light dark:text-text-muted-dark"
      >
        {{ game.description }}
      </p>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LobbyGame } from '../stores/game'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  game: LobbyGame
  /** 大厅里的序号，用于循环三档暖色封面（保持低饱和、只用既有 token） */
  index?: number
}>()

const coverClass = computed(() => {
  const variants = [
    'bg-sand-light text-accent-hover-light dark:bg-sand-dark dark:text-accent-dark',
    'bg-accent-soft-light text-accent-hover-light dark:bg-accent-soft-dark dark:text-accent-dark',
    'bg-bg-light text-text-soft-light dark:bg-bg-dark dark:text-text-soft-dark',
  ]
  return variants[(props.index ?? 0) % variants.length]
})
</script>

<template>
  <RouterLink
    v-if="game.status === 'available'"
    :to="game.route"
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude hover:shadow-card-lift hover:border-accent-light/35 dark:hover:border-accent-dark/35 transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50 animate-rise-in"
  >
    <div
      class="relative h-24 flex items-center justify-center bg-gradient-to-br overflow-hidden"
      :class="game.accent"
    >
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)] opacity-60"></div>
      <span
        class="relative text-4xl drop-shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300"
        >{{ game.icon }}</span
      >
      <span
        class="absolute bottom-2 right-2 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-black/15 text-white/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        开始玩
      </span>
    </div>
    <div class="p-3.5 flex flex-col gap-1 flex-1 border-t border-border-light/60 dark:border-border-dark/60">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-text-light dark:text-text-dark truncate">{{ game.name }}</h3>
        <span
          class="text-xs text-accent-light dark:text-accent-dark opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0"
          aria-hidden="true"
          >→</span
        >
      </div>
      <p class="text-[11px] leading-snug text-text-muted-light dark:text-text-muted-dark line-clamp-2">
        {{ game.description }}
      </p>
    </div>
  </RouterLink>

  <div
    v-else
    class="relative flex flex-col overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude opacity-50 cursor-not-allowed animate-rise-in"
  >
    <div class="h-24 flex items-center justify-center bg-gradient-to-br" :class="game.accent">
      <span class="text-4xl drop-shadow-sm">{{ game.icon }}</span>
    </div>
    <div class="p-3.5 relative border-t border-border-light/60 dark:border-border-dark/60">
      <h3 class="text-sm font-semibold mb-0.5 text-text-light dark:text-text-dark">{{ game.name }}</h3>
      <p class="text-[11px] leading-snug text-text-muted-light dark:text-text-muted-dark line-clamp-2">
        {{ game.description }}
      </p>
      <span
        class="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-accent-light/15 dark:bg-accent-dark/15 text-accent-light dark:text-accent-dark font-medium"
      >
        即将上线
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameMeta } from '../stores/game'

defineProps<{
  game: GameMeta
}>()
</script>

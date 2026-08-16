<template>
  <RouterLink
    v-if="game.status === 'available'"
    :to="game.route"
    class="group relative block overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude hover:shadow-claude-md hover:border-accent-light/30 dark:hover:border-accent-dark/30 transition-all duration-200 hover:-translate-y-0.5"
  >
    <div class="h-28 flex items-center justify-center bg-gradient-to-br" :class="game.accent">
      <span class="text-4xl drop-shadow-sm group-hover:scale-105 transition-transform duration-200">{{ game.icon }}</span>
    </div>
    <div class="p-4">
      <h3 class="text-base font-semibold mb-1 text-text-light dark:text-text-dark">{{ game.name }}</h3>
      <p class="text-xs text-text-muted-light dark:text-text-muted-dark line-clamp-2">{{ game.description }}</p>
    </div>
  </RouterLink>

  <div
    v-else
    class="relative block overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude opacity-50 cursor-not-allowed"
  >
    <div class="h-28 flex items-center justify-center bg-gradient-to-br" :class="game.accent">
      <span class="text-4xl drop-shadow-sm">{{ game.icon }}</span>
    </div>
    <div class="p-4 relative">
      <h3 class="text-base font-semibold mb-1 text-text-light dark:text-text-dark">{{ game.name }}</h3>
      <p class="text-xs text-text-muted-light dark:text-text-muted-dark line-clamp-2">{{ game.description }}</p>
      <span class="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-accent-light/15 dark:bg-accent-dark/15 text-accent-light dark:text-accent-dark font-medium">
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

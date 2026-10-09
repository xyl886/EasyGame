<template>
  <ExtraPuzzleShell title="记忆翻牌" icon="🧠">
    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-3 gap-2">
        <div v-for="item in stats" :key="item.label" class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark tabular-nums">{{ item.value }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">{{ item.label }}</div>
        </div>
      </div>

      <div class="claude-card p-3 sm:p-5">
        <div class="grid grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="记忆翻牌棋盘">
          <button
            v-for="card in state.cards"
            :key="card.id"
            type="button"
            class="aspect-square rounded-xl text-2xl sm:text-4xl font-bold transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-light dark:focus-visible:ring-accent-dark"
            :class="card.open || card.matched
              ? 'bg-amber-100 dark:bg-amber-900/40 text-text-light dark:text-text-dark'
              : 'bg-accent-light dark:bg-accent-dark text-white shadow-claude-md hover:-translate-y-0.5'"
            :aria-label="card.open || card.matched ? `卡片 ${card.symbol}` : '隐藏卡片'"
            :disabled="state.status === 'won' || state.mismatchPending || card.matched || card.open"
            @click="flip(card.id)"
          >
            {{ card.open || card.matched ? card.symbol : '?' }}
          </button>
        </div>
        <div class="mt-4 flex items-center justify-between gap-3">
          <p class="text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">
            {{ state.status === 'won' ? '🎉 全部配对成功！' : state.mismatchPending ? '记住这两张牌…' : '翻开两张相同的牌进行配对' }}
          </p>
          <button type="button" class="eg-primary-btn" @click="newGame">🔄 重新开始</button>
        </div>
      </div>
    </section>

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>每次翻开两张牌，找出相同图案。</li>
        <li>配对成功的牌会保留，配对失败时记住位置后继续。</li>
        <li>用更少的翻牌次数和时间配完全部图案。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MemoryMatchEngine } from '../../game/memory-match/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'

const engine = new MemoryMatchEngine()
const state = ref(engine.getState())
const elapsed = ref(0)
let clock: ReturnType<typeof setInterval> | null = null
let mismatchTimer: ReturnType<typeof setTimeout> | null = null

const stats = computed(() => [
  { label: '翻牌次数', value: state.value.moves },
  { label: '配对进度', value: `${state.value.pairs}/8` },
  { label: '用时', value: `${elapsed.value} 秒` },
])

function syncState() {
  state.value = engine.getState()
}

function flip(index: number) {
  if (!engine.move(index)) return
  syncState()
  if (state.value.mismatchPending) {
    if (mismatchTimer) clearTimeout(mismatchTimer)
    mismatchTimer = setTimeout(() => {
      engine.resolveMismatch()
      syncState()
      mismatchTimer = null
    }, 700)
  }
}

function newGame() {
  if (mismatchTimer) clearTimeout(mismatchTimer)
  mismatchTimer = null
  engine.reset()
  elapsed.value = 0
  syncState()
}

onMounted(() => {
  clock = setInterval(() => {
    if (state.value.status === 'playing' && state.value.startedAt) elapsed.value = Math.floor((Date.now() - state.value.startedAt) / 1000)
  }, 1000)
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
  if (mismatchTimer) clearTimeout(mismatchTimer)
})
</script>

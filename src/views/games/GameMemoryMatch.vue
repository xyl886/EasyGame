<template>
  <ExtraPuzzleShell title="记忆翻牌" icon="🧠">
    <template #header-actions>
      <button class="eg-icon-btn" type="button" aria-label="排行榜" @click="showLeaderboard = true">🏆</button>
      <button class="eg-icon-btn" type="button" aria-label="设置" @click="settings.openSettings()">⚙️</button>
    </template>

    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

    <ExtraPuzzleSettingsPanel
      v-model="settings.state.showSettings"
      title="记忆翻牌设置"
      :config="settings.state.config"
      :defaults="DEFAULT_CONFIG"
      :fields="settingsFields"
      @apply="applySettings"
    />
    <LeaderboardPanel
      v-model="showLeaderboard"
      game-id="memory-match"
      game-name="记忆翻牌"
      :dimensions="leaderboardDimensions"
      size-suffix="对"
    />

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
import { useExtraPuzzleLeaderboard } from '../../composables/useExtraPuzzleLeaderboard'
import { useExtraPuzzleSettings, type ExtraPuzzleConfig } from '../../composables/useExtraPuzzleSettings'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import { MemoryMatchEngine } from '../../game/memory-match/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'
import ExtraPuzzleSettingsPanel from './components/ExtraPuzzleSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const DEFAULT_CONFIG = { pairs: 8 }
const settings = useExtraPuzzleSettings('memory-match', DEFAULT_CONFIG, (config) => ({
  pairs: [4, 6, 8].includes(config.pairs) ? config.pairs : DEFAULT_CONFIG.pairs,
}))
const settingsFields = [{
  key: 'pairs',
  label: '配对数量',
  options: [
    { value: 4, label: '简单 · 4 对' },
    { value: 6, label: '普通 · 6 对' },
    { value: 8, label: '挑战 · 8 对' },
  ],
}]
const leaderboardDimensions: LeaderboardDimension[] = [{
  key: 'difficulty',
  label: '难度',
  values: [{ value: '4', label: '简单' }, { value: '6', label: '普通' }, { value: '8', label: '挑战' }],
}]
const leaderboard = useExtraPuzzleLeaderboard('memory-match')
const showLeaderboard = ref(false)
let engine = new MemoryMatchEngine(settings.state.config)
const state = ref(engine.getState())
const elapsed = ref(0)
let clock: ReturnType<typeof setInterval> | null = null
let mismatchTimer: ReturnType<typeof setTimeout> | null = null

const stats = computed(() => [
  { label: '翻牌次数', value: state.value.moves },
  { label: '配对进度', value: `${state.value.pairs}/${state.value.pairCount}` },
  { label: '用时', value: `${elapsed.value} 秒` },
  { label: '历史最高', value: leaderboard.leaderboard.getBestScore({ difficulty: String(state.value.pairCount) }) ?? '—' },
])

function syncState() {
  state.value = engine.getState()
}

function flip(index: number) {
  if (!engine.move(index)) return
  syncState()
  recordWin()
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
  engine = new MemoryMatchEngine(settings.state.config)
  leaderboard.beginRound()
  elapsed.value = 0
  syncState()
}

function applySettings(config: ExtraPuzzleConfig) {
  settings.setConfig({ pairs: Number(config.pairs) })
  newGame()
}

function recordWin() {
  if (state.value.status !== 'won') return
  const duration = Math.floor((Date.now() - state.value.startedAt) / 1000)
  leaderboard.record({
    score: Math.max(1, 1000 - state.value.moves * 20 - duration * 2),
    moves: state.value.moves,
    duration,
    difficulty: String(state.value.pairCount),
    size: state.value.pairCount,
    won: true,
  })
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

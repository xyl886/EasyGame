<template>
  <ExtraPuzzleShell title="点灯谜题" icon="💡">
    <template #header-actions>
      <button class="eg-icon-btn" type="button" aria-label="排行榜" @click="showLeaderboard = true">🏆</button>
      <button class="eg-icon-btn" type="button" aria-label="设置" @click="settings.openSettings()">⚙️</button>
    </template>

    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ state.moves }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">点击步数</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ litCount }}/{{ state.size * state.size }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">点亮格数</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ bestScore ?? '—' }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">历史最高</div>
        </div>
      </div>

      <div class="claude-card p-3 sm:p-5">
        <div class="grid gap-2 aspect-square max-w-md mx-auto" :style="{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }" role="group" aria-label="点灯棋盘">
          <button
            v-for="(lit, index) in state.cells"
            :key="index"
            type="button"
            class="rounded-lg transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-light dark:focus-visible:ring-accent-dark"
            :class="lit ? 'bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.55)]' : 'bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark'"
            :aria-label="`第 ${Math.floor(index / state.size) + 1} 行第 ${index % state.size + 1} 列，${lit ? '亮' : '灭'}`"
            :disabled="state.status === 'won'"
            @click="play(index)"
          />
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">
            {{ state.status === 'won' ? '🎉 全部点亮，过关！' : '点一格，它与上下左右的灯会一起翻转。' }}
          </p>
          <button type="button" class="eg-primary-btn" @click="newGame">🔄 换一局</button>
        </div>
      </div>
    </section>

    <ExtraPuzzleSettingsPanel
      v-model="settings.state.showSettings"
      title="点灯谜题设置"
      :config="settings.state.config"
      :defaults="DEFAULT_CONFIG"
      :fields="settingsFields"
      @apply="applySettings"
    />
    <LeaderboardPanel
      v-model="showLeaderboard"
      game-id="lights-out"
      game-name="点灯谜题"
      :dimensions="leaderboardDimensions"
    />

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>点击任意格子，会同时翻转该格和上下左右相邻的灯。</li>
        <li>把棋盘上的灯全部点亮即可通关。</li>
        <li>每局从已解状态打乱，因此总有解。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useExtraPuzzleLeaderboard } from '../../composables/useExtraPuzzleLeaderboard'
import { useExtraPuzzleSettings, type ExtraPuzzleConfig } from '../../composables/useExtraPuzzleSettings'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import { LightsOutEngine } from '../../game/lights-out/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'
import ExtraPuzzleSettingsPanel from './components/ExtraPuzzleSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const DEFAULT_CONFIG = { size: 5 }
const settings = useExtraPuzzleSettings('lights-out', DEFAULT_CONFIG, (config) => ({
  size: [3, 5, 7].includes(config.size) ? config.size : DEFAULT_CONFIG.size,
}))
const settingsFields = [{
  key: 'size',
  label: '棋盘尺寸',
  options: [{ value: 3, label: '入门 · 3×3' }, { value: 5, label: '标准 · 5×5' }, { value: 7, label: '挑战 · 7×7' }],
}]
const leaderboardDimensions: LeaderboardDimension[] = [{
  key: 'difficulty', label: '尺寸', values: [{ value: '3', label: '3×3' }, { value: '5', label: '5×5' }, { value: '7', label: '7×7' }],
}]
const leaderboard = useExtraPuzzleLeaderboard('lights-out')
const showLeaderboard = ref(false)
let engine = new LightsOutEngine(settings.state.config.size)
const state = ref(engine.getState())
const litCount = computed(() => state.value.cells.filter(Boolean).length)
const bestScore = computed(() => leaderboard.leaderboard.getBestScore({ difficulty: String(state.value.size) }))

function play(index: number) {
  if (!engine.move(index)) return
  leaderboard.startTiming()
  state.value = engine.getState()
  if (engine.isWin()) {
    const duration = leaderboard.durationSeconds()
    leaderboard.record({
      score: Math.max(1, engine.getScore() - duration),
      moves: state.value.moves,
      duration,
      difficulty: String(state.value.size),
      won: true,
    })
  }
}

function newGame() {
  engine = new LightsOutEngine(settings.state.config.size)
  leaderboard.beginRound()
  state.value = engine.getState()
}

function applySettings(config: ExtraPuzzleConfig) {
  settings.setConfig({ size: Number(config.size) })
  newGame()
}
</script>

<template>
  <ExtraPuzzleShell title="一笔画" icon="✍️">
    <template #header-actions>
      <button class="eg-icon-btn" type="button" aria-label="排行榜" @click="showLeaderboard = true">🏆</button>
      <button class="eg-icon-btn" type="button" aria-label="设置" @click="settings.openSettings()">⚙️</button>
    </template>

    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-2 gap-2">
        <div class="claude-card p-3 text-center">
          <span class="text-sm text-text-muted-light dark:text-text-muted-dark">已连接</span>
          <strong class="ml-2 text-accent-light dark:text-accent-dark">{{ state.usedEdges.length }}/{{ state.edges.length }}</strong>
        </div>
        <div class="claude-card p-3 text-center">
          <span class="text-sm text-text-muted-light dark:text-text-muted-dark">历史最高</span>
          <strong class="ml-2 text-accent-light dark:text-accent-dark">{{ bestScore ?? '—' }}</strong>
        </div>
      </div>

      <div class="claude-card p-4 sm:p-6">
        <div class="relative mx-auto aspect-square w-full max-w-md rounded-2xl bg-amber-50 dark:bg-amber-950/30 touch-manipulation">
          <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
            <line
              v-for="(edge, index) in state.edges"
              :key="index"
              :x1="node(edge[0]).x"
              :y1="node(edge[0]).y"
              :x2="node(edge[1]).x"
              :y2="node(edge[1]).y"
              :stroke="used(edge) ? '#E86A5B' : '#D7C9B7'"
              :stroke-width="used(edge) ? 2.3 : 1.2"
              stroke-linecap="round"
            />
          </svg>
          <button
            v-for="point in state.nodes"
            :key="point.id"
            type="button"
            class="absolute z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-md transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-light/40"
            :class="point.id === state.current ? 'bg-pink-500' : 'bg-accent-light dark:bg-accent-dark'"
            :style="{ left: `${point.x}%`, top: `${point.y}%` }"
            :aria-label="`连接点 ${point.id + 1}`"
            :disabled="state.status !== 'playing'"
            @click="selectPoint(point.id)"
          />
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">{{ message }}</p>
          <button type="button" class="eg-primary-btn" @click="reset">↻ 重新开始</button>
        </div>
      </div>
    </section>

    <ExtraPuzzleSettingsPanel
      v-model="settings.state.showSettings"
      title="一笔画设置"
      :config="settings.state.config"
      :defaults="DEFAULT_CONFIG"
      :fields="settingsFields"
      @apply="applySettings"
    />
    <LeaderboardPanel
      v-model="showLeaderboard"
      game-id="one-stroke"
      game-name="一笔画"
      :dimensions="leaderboardDimensions"
    />

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>点击任意圆点开始，再依次点击相邻圆点。</li>
        <li>每条线只能经过一次；连接全部线段即可胜利。</li>
        <li>如果走到没有未画线段的死路，重新开始再试。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useExtraPuzzleLeaderboard } from '../../composables/useExtraPuzzleLeaderboard'
import { useExtraPuzzleSettings, type ExtraPuzzleConfig } from '../../composables/useExtraPuzzleSettings'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import { OneStrokeEngine } from '../../game/one-stroke/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'
import ExtraPuzzleSettingsPanel from './components/ExtraPuzzleSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const DEFAULT_CONFIG = { startNode: 0 }
const settings = useExtraPuzzleSettings('one-stroke', DEFAULT_CONFIG, (config) => ({
  startNode: [0, 5, 6].includes(config.startNode) ? config.startNode : DEFAULT_CONFIG.startNode,
}))
const settingsFields = [{
  key: 'startNode',
  label: '起点限制',
  options: [
    { value: 0, label: '自由选择' },
    { value: 5, label: '左侧端点' },
    { value: 6, label: '右侧端点' },
  ],
}]
const leaderboardDimensions: LeaderboardDimension[] = [{
  key: 'difficulty',
  label: '起点',
  values: [{ value: '0', label: '自由选择' }, { value: '5', label: '左侧端点' }, { value: '6', label: '右侧端点' }],
}]
const leaderboard = useExtraPuzzleLeaderboard('one-stroke')
const showLeaderboard = ref(false)
const engine = new OneStrokeEngine(settings.state.config.startNode)
const state = ref(engine.getState())
const bestScore = computed(() => leaderboard.leaderboard.getBestScore({ difficulty: String(state.value.startNode) }))
const message = computed(() => {
  if (state.value.status === 'won') return '🎉 一笔连成，全部线段已完成！'
  if (state.value.status === 'stuck') return '走到死路了，重新开始再试一次。'
  if (state.value.current === null && state.value.startNode !== 0) return `请从${state.value.startNode === 5 ? '左' : '右'}侧端点开始。`
  return state.value.current === null ? '从任意圆点开始。' : '继续点击与当前圆点相连的线段。'
})

function node(id: number) {
  return state.value.nodes.find((item) => item.id === id)!
}

function used(edge: [number, number]) {
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  return state.value.usedEdges.includes(key(edge[0], edge[1]))
}

function selectPoint(id: number) {
  if (!engine.move(id)) return
  leaderboard.startTiming()
  state.value = engine.getState()
  if (engine.isWin()) {
    const duration = leaderboard.durationSeconds()
    leaderboard.record({
      score: Math.max(1, 1000 - state.value.usedEdges.length * 5 - duration),
      moves: state.value.usedEdges.length,
      duration,
      difficulty: String(state.value.startNode),
      won: true,
    })
  }
}

function reset() {
  engine.reset()
  leaderboard.beginRound()
  state.value = engine.getState()
}

function applySettings(config: ExtraPuzzleConfig) {
  settings.setConfig({ startNode: Number(config.startNode) })
  engine.setStartNode(settings.state.config.startNode)
  leaderboard.beginRound()
  state.value = engine.getState()
}
</script>

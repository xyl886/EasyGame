<template>
  <ExtraPuzzleShell title="数织" icon="🧩">
    <template #header-actions>
      <button class="eg-icon-btn" type="button" aria-label="排行榜" @click="showLeaderboard = true">🏆</button>
      <button class="eg-icon-btn" type="button" aria-label="设置" @click="settings.openSettings()">⚙️</button>
    </template>

    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div class="claude-card p-3 text-center">
          <div class="text-lg font-extrabold text-accent-light dark:text-accent-dark">{{ state.puzzleName }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">当前图案</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ filledCount }}/25</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">已涂格数</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ state.moves }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">操作次数</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ bestScore ?? '—' }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">本题最高分</div>
        </div>
      </div>

      <div class="claude-card p-3 sm:p-5">
        <div
          class="grid gap-1 mx-auto w-full max-w-md"
          :style="{ gridTemplateColumns: `repeat(${size + 1}, minmax(0, 1fr))` }"
          role="group"
          aria-label="数织棋盘"
        >
          <div class="aspect-square" aria-hidden="true" />
          <div v-for="col in size" :key="`col-${col}`" class="flex aspect-square flex-col items-center justify-end pb-1 text-[10px] sm:text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">
            <span v-for="(hint, index) in engine.columnHints(col - 1)" :key="index">{{ hint }}</span>
          </div>

          <template v-for="row in size" :key="`row-${row}`">
            <div class="flex aspect-square items-center justify-end pr-2 text-xs sm:text-sm font-semibold text-text-muted-light dark:text-text-muted-dark">
              {{ engine.rowHints(row - 1).join(' ') }}
            </div>
            <button
              v-for="col in size"
              :key="`${row}-${col}`"
              type="button"
              class="aspect-square rounded-sm border border-border-light dark:border-border-dark text-sm sm:text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-light dark:focus-visible:ring-accent-dark"
              :class="cellClass(row - 1, col - 1)"
              :aria-label="cellLabel(row - 1, col - 1)"
              :disabled="state.status === 'won'"
              @click="play(row - 1, col - 1)"
            >
              {{ cellMark(row - 1, col - 1) }}
            </button>
          </template>
        </div>

        <p class="mt-3 min-h-6 text-center text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">
          {{ state.status === 'won' ? '🎉 图案还原完成！' : state.markMode ? '标记模式：点击格子标记为空。' : '根据行列数字涂出隐藏图案。' }}
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <button class="eg-ghost-btn" type="button" :aria-pressed="state.markMode" @click="toggleMarkMode">{{ state.markMode ? '✕ 标记：开' : '✕ 标记：关' }}</button>
          <button class="eg-ghost-btn" type="button" @click="restart">重置本题</button>
          <button class="eg-primary-btn" type="button" @click="nextPuzzle">换一图 →</button>
        </div>
      </div>
    </section>

    <ExtraPuzzleSettingsPanel
      v-model="settings.state.showSettings"
      title="数织设置"
      :config="settings.state.config"
      :defaults="DEFAULT_CONFIG"
      :fields="settingsFields"
      @apply="applySettings"
    />
    <LeaderboardPanel
      v-model="showLeaderboard"
      game-id="nonogram"
      game-name="数织"
      :dimensions="leaderboardDimensions"
    />

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>每行和每列的数字表示连续涂色格子的长度，数字顺序与格子顺序一致。</li>
        <li>不同数字之间至少隔一个空格；点击格子涂色，再次点击可取消。</li>
        <li>标记模式可以用叉号标出空格，完整还原图案即可通关。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useExtraPuzzleLeaderboard } from '../../composables/useExtraPuzzleLeaderboard'
import { useExtraPuzzleSettings, type ExtraPuzzleConfig } from '../../composables/useExtraPuzzleSettings'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import { NonogramEngine } from '../../game/nonogram/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'
import ExtraPuzzleSettingsPanel from './components/ExtraPuzzleSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const DEFAULT_CONFIG = { puzzleIndex: 0 }
const puzzleOptions = [
  { value: 0, label: '爱心' }, { value: 1, label: '笑脸' }, { value: 2, label: '小树' }, { value: 3, label: '杯子' },
]
const puzzleIds = ['heart', 'smiley', 'tree', 'cup']
const settings = useExtraPuzzleSettings('nonogram', DEFAULT_CONFIG, (config) => ({
  puzzleIndex: Number.isInteger(config.puzzleIndex) ? Math.max(0, Math.min(3, config.puzzleIndex)) : DEFAULT_CONFIG.puzzleIndex,
}))
const settingsFields = [{ key: 'puzzleIndex', label: '默认题目', options: puzzleOptions }]
const leaderboardDimensions: LeaderboardDimension[] = [{
  key: 'difficulty', label: '题目', values: puzzleOptions.map((option) => ({ value: String(option.value), label: option.label })),
}]
const leaderboard = useExtraPuzzleLeaderboard('nonogram')
const showLeaderboard = ref(false)
let engine = new NonogramEngine(settings.state.config.puzzleIndex)
const state = ref(engine.getState())
const size = 5
const startedAt = ref(Date.now())
const filledCount = computed(() => state.value.filled.filter(Boolean).length)
const currentPuzzleIndex = computed(() => Math.max(0, puzzleIds.indexOf(state.value.puzzleId)))
const bestScore = computed(() => leaderboard.leaderboard.getBestScore({ difficulty: String(currentPuzzleIndex.value) }))

function play(row: number, col: number) {
  if (!engine.move([row, col])) return
  state.value = engine.getState()
  recordWin()
}

function toggleMarkMode() {
  engine.toggleMarkMode()
  state.value = engine.getState()
}

function restart() {
  engine.reset()
  leaderboard.beginRound()
  startedAt.value = Date.now()
  state.value = engine.getState()
}

function nextPuzzle() {
  engine.nextPuzzle()
  leaderboard.beginRound()
  startedAt.value = Date.now()
  state.value = engine.getState()
}

function applySettings(config: ExtraPuzzleConfig) {
  const puzzleIndex = Number(config.puzzleIndex)
  settings.setConfig({ puzzleIndex })
  engine = new NonogramEngine(settings.state.config.puzzleIndex)
  leaderboard.beginRound()
  startedAt.value = Date.now()
  state.value = engine.getState()
}

function recordWin() {
  if (!engine.isWin()) return
  const duration = Math.floor((Date.now() - startedAt.value) / 1000)
  leaderboard.record({
    score: Math.max(1, engine.getScore() - duration),
    moves: state.value.moves,
    duration,
    difficulty: String(currentPuzzleIndex.value),
    won: true,
  })
}

function cellClass(row: number, col: number) {
  const index = row * size + col
  if (state.value.filled[index]) return 'bg-accent-light dark:bg-accent-dark text-white'
  return 'bg-card-light dark:bg-card-dark text-text-muted-light dark:text-text-muted-dark'
}

function cellMark(row: number, col: number) {
  return state.value.marked[row * size + col] ? '×' : ''
}

function cellLabel(row: number, col: number) {
  const index = row * size + col
  return `第 ${row + 1} 行第 ${col + 1} 列，${state.value.filled[index] ? '已涂色' : state.value.marked[index] ? '已标记为空' : '未选择'}`
}
</script>

<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-md w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🔢 数独</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="设置"
        >
          ⚙️
        </button>
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- 游戏主体 -->
    <main class="max-w-md w-full mx-auto flex-1 flex flex-col">
      <!-- 分数面板 -->
      <div class="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-text-light dark:text-text-dark">
            数独
          </h1>
          <p class="text-xs opacity-70 mt-1 text-text-muted-light dark:text-text-muted-dark">
            {{ difficultyLabel }} · 9×9
            <span v-if="state.bestTime > 0"> · 历史最快 {{ bestTimeText }}</span>
            <span v-else> · 还没完成过</span>
          </p>
        </div>
        <div class="flex gap-2">
          <div class="flex flex-col items-end justify-center px-3 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[80px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">用时</span>
            <span class="text-lg font-bold tabular-nums text-text-light dark:text-text-dark">{{ elapsedText }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between mb-4 gap-2">
        <div class="text-xs opacity-70 hidden sm:block text-text-muted-light dark:text-text-muted-dark">
          点击格子选中 · 数字键 / 点数字面板填数
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            @click="undo"
            :disabled="!canUndo"
            class="px-4 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            ↩️ 撤销
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>

      <!-- 棋盘 -->
      <div
        class="relative mx-auto select-none touch-none w-full max-w-[440px] rounded-xl overflow-hidden border-2 border-emerald-700/40 dark:border-emerald-400/30 bg-card-light dark:bg-card-dark shadow-inner"
      >
        <div class="grid grid-cols-9 w-full aspect-square">
          <button
            v-for="i in 81"
            :key="i - 1"
            type="button"
            class="flex items-center justify-center text-sm sm:text-base font-semibold transition-colors duration-75 border border-border-light/60 dark:border-border-dark/60"
            :class="cellClass(i - 1)"
            @click="onCellClick(i - 1)"
          >{{ cellValue(i - 1) }}</button>
        </div>

        <!-- 继续上次遮罩 -->
        <div
          v-if="showResume && !state.won"
          class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-300">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">已填 {{ pendingAutosave?.moves ?? 0 }} 次，继续挑战？</p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                ▶️ 继续上次
              </button>
              <button
                @click="discardAutosave"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                🔄 重新开始
              </button>
            </div>
          </div>
        </div>

        <!-- 胜利遮罩 -->
        <div
          v-if="state.won"
          class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-emerald-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">🎉 完成！</div>
            <p class="opacity-90 text-white">
              用时 {{ elapsedText }}
              <span v-if="state.bestTime > 0 && finishedElapsed === state.bestTime" class="ml-2">🏅 刷新最快纪录！</span>
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="showLeaderboard = true"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                🏆 查看排行榜
              </button>
              <button
                @click="shareResult"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                📤 分享成绩
              </button>
              <button
                @click="newGame"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 数字面板 -->
      <div class="mt-4 grid grid-cols-10 gap-1.5 w-full max-w-[440px] mx-auto">
        <button
          v-for="n in 9"
          :key="n"
          type="button"
          @click="inputNum(n)"
          class="aspect-square rounded-lg bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/50 transition-all active:scale-95 text-base font-bold text-text-light dark:text-text-dark"
        >
          {{ n }}
        </button>
        <button
          type="button"
          @click="erase"
          class="aspect-square rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 shadow-claude hover:shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          aria-label="擦除"
        >
          ✕
        </button>
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-3 sm:hidden">
        👆 点格子选中，点数字面板填数 · 目标：每行/列/宫 1-9 不重复
      </div>
    </main>

    <footer class="max-w-md w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <SudokuSettingsPanel @apply="applySettings" />

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="数独"
      :dimensions="leaderboardDimensions"
      size-suffix="×9"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { SudokuEngine, findConflicts } from '../../game/sudoku/GameEngine'
import type { SudokuState, SudokuConfig, SudokuDifficulty } from '../../game/sudoku/types'
import { DIFFICULTY_LABELS, SIZE, sudokuScoreForTime } from '../../game/sudoku/types'
import { useSudokuSettingsStore } from '../../stores/sudoku-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl } from '../../utils/share'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import SudokuSettingsPanel from './components/SudokuSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useSudokuSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'sudoku'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard'] as SudokuDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
]
/** 胜利入榜去重 */
let lastSubmittedElapsed = -1

function submitScoreIfWon() {
  if (!state.won) return
  if (finishedElapsed.value === lastSubmittedElapsed) return
  lastSubmittedElapsed = finishedElapsed.value
  leaderboard.addEntry({
    score: sudokuScoreForTime(finishedElapsed.value),
    difficulty: settings.config.difficulty,
    size: SIZE,
    moves: state.moves,
    duration: finishedElapsed.value,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'sudoku'
const pendingAutosave = loadAutosave<SudokuState>(AUTOSAVE_GAME_ID)
const showResume = ref(false)
if (pendingAutosave && !pendingAutosave.won) {
  showResume.value = true
}

function persistAutosave() {
  saveAutosave(AUTOSAVE_GAME_ID, engine.value.getState())
}

function resumeGame() {
  if (!pendingAutosave) return
  engine.value.loadState(pendingAutosave)
  syncState()
  showResume.value = false
  sound.play('start')
}

function discardAutosave() {
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  engine.value.reset()
  syncState()
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden' && !state.won) persistAutosave()
}
function onPageHide() {
  if (!state.won) persistAutosave()
}

// ===== 引擎与状态 =====
const engine = shallowRef(new SudokuEngine(settings.config))
const state = reactive<SudokuState>(engine.value.getState())
const canUndo = ref(false)
const finishedElapsed = ref(0)
const now = ref(Date.now())

const difficultyLabel = computed(() => DIFFICULTY_LABELS[settings.config.difficulty])

const elapsedText = computed(() => {
  const sec = state.won ? finishedElapsed.value : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

const bestTimeText = computed(() => {
  const m = Math.floor(state.bestTime / 60)
  const s = state.bestTime % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

/** 当前所有冲突格 */
const conflictSet = computed(() => {
  const set = new Set<string>()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.grid[r][c] === 0) continue
      for (const k of findConflicts(state.grid, r, c)) set.add(k)
    }
  }
  return set
})

/** 选中数字（同数字弱高亮用） */
const selectedNum = computed(() => {
  const s = state.selected
  if (!s) return 0
  return state.grid[s.row][s.col]
})

function cellValue(idx: number): string {
  const r = Math.floor(idx / SIZE)
  const c = idx % SIZE
  const v = state.grid[r][c]
  return v === 0 ? '' : String(v)
}

function inSameBox(r1: number, c1: number, r2: number, c2: number): boolean {
  return Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3)
}

function cellClass(idx: number): string {
  const r = Math.floor(idx / SIZE)
  const c = idx % SIZE
  const v = state.grid[r][c]
  const key = `${r},${c}`
  const sel = state.selected
  const classes: string[] = []
  // 宫粗分隔线
  if (c % 3 === 2 && c !== SIZE - 1) classes.push('border-r-2 border-r-emerald-700/40 dark:border-r-emerald-400/30')
  if (r % 3 === 2 && r !== SIZE - 1) classes.push('border-b-2 border-b-emerald-700/40 dark:border-b-emerald-400/30')
  // 数字颜色
  if (v !== 0) {
    if (conflictSet.value.has(key)) classes.push('text-red-500 dark:text-red-400')
    else classes.push(state.given[r][c] ? 'text-text-light dark:text-text-dark' : 'text-emerald-600 dark:text-emerald-400')
  }
  // 高亮
  if (sel && sel.row === r && sel.col === c) {
    classes.push('bg-emerald-400/30 dark:bg-emerald-400/25')
  } else if (sel && (sel.row === r || sel.col === c || inSameBox(sel.row, sel.col, r, c))) {
    classes.push('bg-emerald-400/10 dark:bg-emerald-400/8')
  } else if (sel && selectedNum.value !== 0 && v === selectedNum.value) {
    classes.push('bg-emerald-400/15 dark:bg-emerald-400/12')
  } else {
    classes.push('bg-card-light dark:bg-card-dark')
  }
  if (state.given[r][c]) classes.push('font-bold')
  return classes.join(' ')
}

function onCellClick(idx: number) {
  if (state.won || showResume.value) return
  const r = Math.floor(idx / SIZE)
  const c = idx % SIZE
  engine.value.select(r, c)
  syncState()
}

function inputNum(n: number) {
  if (state.won || showResume.value) return
  if (!state.selected) {
    toast('先点击一个格子再填数')
    return
  }
  if (engine.value.input(n)) {
    syncState()
    sound.play('click')
    // 冲突时播放警示音（复用 move 低音）
    if (conflictSet.value.has(`${state.selected.row},${state.selected.col}`)) {
      sound.play('over')
    }
    if (state.won) {
      finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
      sound.play('win')
      clearAutosave(AUTOSAVE_GAME_ID)
      submitScoreIfWon()
    } else {
      persistAutosave()
    }
  }
}

function erase() {
  if (state.won || showResume.value) return
  if (!state.selected) return
  if (engine.value.erase()) {
    syncState()
    sound.play('click')
    persistAutosave()
  }
}

function undo() {
  if (engine.value.undo()) {
    syncState()
    sound.play('move')
    if (!state.won) persistAutosave()
  }
}

function newGame() {
  engine.value.reset()
  syncState()
  finishedElapsed.value = 0
  lastSubmittedElapsed = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  sound.play('start')
}

function applySettings(config: SudokuConfig) {
  engine.value = new SudokuEngine(config)
  syncState()
  finishedElapsed.value = 0
  lastSubmittedElapsed = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

/** 分享成绩 */
async function shareResult() {
  const sec = finishedElapsed.value
  const m = Math.floor(sec / 60)
  const s = sec % 60
  const time = m > 0 ? `${m}分${s}秒` : `${s}秒`
  const result = await shareOrCopy({
    text: `我在 EasyGame 数独用 ${time} 完成了「${DIFFICULTY_LABELS[settings.config.difficulty]}」难度，来挑战我！🔢`,
    url: shareUrl('/game/sudoku'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

function syncState() {
  const s = engine.value.getState()
  state.grid = s.grid.map((row) => [...row])
  state.given = s.given.map((row) => [...row])
  state.selected = s.selected ? { ...s.selected } : null
  state.moves = s.moves
  state.startTime = s.startTime
  state.bestTime = s.bestTime
  state.won = s.won
  state.over = s.over
  state.difficulty = s.difficulty
  state.history = s.history.map((h) => ({ ...h }))
  canUndo.value = engine.value.canUndo()
}

// ===== 键盘操作 =====
function onKeydown(e: KeyboardEvent) {
  // 设置/排行榜弹窗打开时忽略（ref 需 .value）
  if (settings.showSettings || showLeaderboard.value) return
  const k = e.key
  // 方向键 / WASD 移动光标
  const dirMap: Record<string, [number, number]> = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    w: [-1, 0], W: [-1, 0], s: [1, 0], S: [1, 0], a: [0, -1], A: [0, -1], d: [0, 1], D: [0, 1],
  }
  if (dirMap[k]) {
    e.preventDefault()
    if (showResume.value) {
      resumeGame()
      return
    }
    if (state.won) return
    let r = 4
    let c = 4
    if (state.selected) {
      r = state.selected.row + dirMap[k][0]
      c = state.selected.col + dirMap[k][1]
    }
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      engine.value.select(r, c)
      syncState()
    }
    return
  }
  // 数字 1-9
  if (k >= '1' && k <= '9') {
    e.preventDefault()
    if (showResume.value) {
      resumeGame()
      return
    }
    inputNum(Number(k))
    return
  }
  // 擦除
  if (k === 'Backspace' || k === 'Delete' || k === '0') {
    e.preventDefault()
    erase()
    return
  }
  // 取消选中
  if (k === 'Escape') {
    engine.value.select(-1, -1)
    syncState()
  }
}

// ===== 计时器 =====
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  syncState()
  if (state.won) {
    finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
    submitScoreIfWon()
  }
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  timer = setInterval(() => {
    now.value = Date.now()
  }, 500)
})

onBeforeUnmount(() => {
  if (!state.won) persistAutosave()
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
/* 数独不需要额外样式 */
</style>

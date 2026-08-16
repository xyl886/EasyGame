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
            {{ sizeLabel }} · {{ difficultyLabel }}
            <span v-if="state.bestTime > 0"> · 历史最快 {{ bestTimeText }}</span>
            <span v-else> · 还没完成过</span>
          </p>
        </div>
        <div class="flex gap-2">
          <div class="flex flex-col items-end justify-center px-3 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[72px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">用时</span>
            <span class="text-lg font-bold tabular-nums text-text-light dark:text-text-dark">{{ elapsedText }}</span>
          </div>
          <div class="flex flex-col items-end justify-center px-3 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[52px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">错误</span>
            <span class="text-lg font-bold tabular-nums" :class="state.mistakes > 0 ? 'text-red-500 dark:text-red-400' : 'text-text-light dark:text-text-dark'">{{ state.mistakes }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div class="flex gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ❓ 玩法
          </button>
          <button
            @click="toggleNotesMode"
            class="px-3 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 shadow-claude"
            :class="notesMode
              ? 'bg-emerald-400 text-white border-transparent'
              : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-emerald-400/50'"
          >
            ✏️ 笔记{{ notesMode ? '·开' : '' }}
          </button>
          <button
            @click="doCheck"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ✅ 检查
          </button>
          <button
            @click="doHint"
            :disabled="state.hintsUsed >= MAX_HINTS || state.won"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-emerald-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            💡 提示{{ state.hintsUsed >= MAX_HINTS ? '' : ` ${MAX_HINTS - state.hintsUsed}` }}
          </button>
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
        <div
          class="grid w-full aspect-square"
          :style="{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }"
        >
          <button
            v-for="i in state.size * state.size"
            :key="i - 1"
            type="button"
            class="relative flex items-center justify-center transition-colors duration-75 border border-border-light/60 dark:border-border-dark/60"
            :class="cellClass(i - 1)"
            :style="winDelay(i - 1)"
            @click="onCellClick(i - 1)"
          >
            <template v-if="cellValue(i - 1) !== ''">
              <span :class="cellFontClass">{{ cellValue(i - 1) }}</span>
            </template>
            <!-- 候选笔记（选中格内小网格） -->
            <span
              v-else-if="isNoteShown(i - 1)"
              class="absolute inset-0 grid"
              :style="{ gridTemplateColumns: `repeat(3, 1fr)` }"
            >
              <span
                v-for="nn in state.size"
                :key="nn"
                class="flex items-center justify-center text-[9px] leading-none"
                :class="engine.hasNote(Math.floor((i - 1) / state.size), (i - 1) % state.size, nn) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-transparent'"
              >{{ nn }}</span>
            </span>
          </button>
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
              用时 {{ elapsedText }}<span v-if="state.mistakes > 0"> · 错 {{ state.mistakes }} 次</span>
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
      <div
        class="mt-4 grid gap-1.5 w-full max-w-[440px] mx-auto"
        :style="{ gridTemplateColumns: `repeat(${state.size + 1}, 1fr)` }"
      >
        <button
          v-for="n in state.size"
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
        👆 点格子选中，点数字面板填数 · ✏️ 笔记模式可标候选
      </div>
    </main>

    <footer class="max-w-md w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <SudokuSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="数独">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li>每行、每列、每个粗线宫（4×4 为 2×2 宫，6×6 为 2×3 宫，9×9 为 3×3 宫）都填入 <strong>1-N 且不重复</strong></li>
        <li><strong>点击格子选中</strong>，用数字键或下方数字面板填数；填错会变红并计入错误数</li>
        <li>✏️ <strong>笔记</strong>：标记候选数字辅助推理；✅ <strong>检查</strong>：校验冲突与完成度；💡 <strong>提示</strong>：自动填入正确数字（每局限 3 次）</li>
        <li>所有格子填对即<strong>获胜</strong>，用时越短成绩越高</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="数独"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { SudokuEngine, findConflicts } from '../../game/sudoku/GameEngine'
import type { SudokuState, SudokuConfig, SudokuDifficulty } from '../../game/sudoku/types'
import { DIFFICULTY_LABELS, specOf, SIZES, sudokuScoreForTime, MAX_HINTS } from '../../game/sudoku/types'
import { useSudokuSettingsStore } from '../../stores/sudoku-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl } from '../../utils/share'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import HowToPlay from '../../components/HowToPlay.vue'
import SudokuSettingsPanel from './components/SudokuSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useSudokuSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'sudoku'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
/** 玩法说明弹层 */
const showHowTo = ref(false)
// 维度：difficulty = 难度，size = 尺寸
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard'] as SudokuDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
  {
    key: 'size',
    label: '尺寸',
    values: SIZES.map((s) => ({ value: s.size, label: s.label })),
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
    size: settings.config.size,
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
/** 笔记模式：开启时输入=切换候选 */
const notesMode = ref(false)
/** 最近提示的格子（短暂高亮） */
const hintCell = ref<{ row: number; col: number } | null>(null)

const difficultyLabel = computed(() => DIFFICULTY_LABELS[settings.config.difficulty])
const sizeLabel = computed(() => specOf(state.size).label)

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
  const spec = specOf(state.size)
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (state.grid[r][c] === 0) continue
      for (const k of findConflicts(state.grid, spec, r, c)) set.add(k)
    }
  }
  return set
})

const selectedNum = computed(() => {
  const s = state.selected
  if (!s) return 0
  return state.grid[s.row][s.col]
})

function cellValue(idx: number): string {
  const r = Math.floor(idx / state.size)
  const c = idx % state.size
  const v = state.grid[r][c]
  return v === 0 ? '' : String(v)
}

function cellFontClass(): string {
  // 字号随尺寸缩小
  if (state.size >= 9) return 'text-sm sm:text-base font-semibold'
  if (state.size >= 6) return 'text-lg sm:text-xl font-semibold'
  return 'text-2xl sm:text-3xl font-bold'
}

/** 选中空格且有笔记时显示候选小网格 */
function isNoteShown(idx: number): boolean {
  const r = Math.floor(idx / state.size)
  const c = idx % state.size
  const s = state.selected
  if (!s || s.row !== r || s.col !== c) return false
  if (state.grid[r][c] !== 0 || state.given[r][c]) return false
  return true
}

function inSameBox(r1: number, c1: number, r2: number, c2: number): boolean {
  const spec = specOf(state.size)
  return (
    Math.floor(r1 / spec.boxRows) === Math.floor(r2 / spec.boxRows) &&
    Math.floor(c1 / spec.boxCols) === Math.floor(c2 / spec.boxCols)
  )
}

function cellClass(idx: number): string {
  const spec = specOf(state.size)
  const r = Math.floor(idx / state.size)
  const c = idx % state.size
  const v = state.grid[r][c]
  const key = `${r},${c}`
  const sel = state.selected
  const classes: string[] = []
  // 宫粗分隔线
  if (c % spec.boxCols === spec.boxCols - 1 && c !== state.size - 1)
    classes.push('border-r-2 border-r-emerald-700/40 dark:border-r-emerald-400/30')
  if (r % spec.boxRows === spec.boxRows - 1 && r !== state.size - 1)
    classes.push('border-b-2 border-b-emerald-700/40 dark:border-b-emerald-400/30')
  // 数字颜色
  if (v !== 0) {
    if (conflictSet.value.has(key)) classes.push('text-red-500 dark:text-red-400')
    else classes.push(state.given[r][c] ? 'text-text-light dark:text-text-dark' : 'text-emerald-600 dark:text-emerald-400')
  }
  // 提示格高亮
  if (hintCell.value && hintCell.value.row === r && hintCell.value.col === c) {
    classes.push('bg-amber-300/50 dark:bg-amber-300/40')
  } else if (sel && sel.row === r && sel.col === c) {
    classes.push('bg-emerald-400/30 dark:bg-emerald-400/25')
  } else if (sel && (sel.row === r || sel.col === c || inSameBox(sel.row, sel.col, r, c))) {
    classes.push('bg-emerald-400/10 dark:bg-emerald-400/8')
  } else if (sel && selectedNum.value !== 0 && v === selectedNum.value) {
    classes.push('bg-emerald-400/15 dark:bg-emerald-400/12')
  } else {
    classes.push('bg-card-light dark:bg-card-dark')
  }
  if (state.given[r][c]) classes.push('font-bold')
  // 完成动画
  if (state.won) classes.push('win-cell')
  return classes.join(' ')
}

/** 完成动画：逐格延迟 */
function winDelay(idx: number) {
  if (!state.won) return {}
  return { animationDelay: `${Math.min(idx, 40) * 25}ms` }
}

function onCellClick(idx: number) {
  if (state.won || showResume.value) return
  const r = Math.floor(idx / state.size)
  const c = idx % state.size
  engine.value.select(r, c)
  syncState()
}

function inputNum(n: number) {
  if (state.won || showResume.value) return
  if (!state.selected) {
    toast('先点击一个格子再填数')
    return
  }
  // 笔记模式：切换候选
  if (notesMode.value) {
    if (engine.value.toggleNote(n)) {
      syncState()
      sound.play('click')
      persistAutosave()
    }
    return
  }
  if (engine.value.input(n)) {
    syncState()
    sound.play('click')
    if (state.won) {
      finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
      sound.play('win')
      clearAutosave(AUTOSAVE_GAME_ID)
      submitScoreIfWon()
    } else {
      // 填错提示音
      if (conflictSet.value.has(`${state.selected!.row},${state.selected!.col}`)) {
        sound.play('over')
      }
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

function toggleNotesMode() {
  notesMode.value = !notesMode.value
  sound.play('click')
}

function doCheck() {
  if (state.won) return
  const res = engine.value.check()
  if (res.complete) toast('🎉 全部正确，完成！')
  else if (res.conflicts > 0) toast(`有 ${res.conflicts} 处冲突，请检查红色格子`)
  else if (res.empty > 0) toast(`还没有冲突，还剩 ${res.empty} 个空格`)
}

function doHint() {
  if (state.won || state.hintsUsed >= MAX_HINTS) return
  const cell = engine.value.hint()
  if (!cell) return
  syncState()
  hintCell.value = { row: cell.row, col: cell.col }
  sound.play('start')
  setTimeout(() => {
    hintCell.value = null
  }, 1200)
  if (state.won) {
    finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
    sound.play('win')
    clearAutosave(AUTOSAVE_GAME_ID)
    submitScoreIfWon()
  } else {
    persistAutosave()
  }
}

function newGame() {
  engine.value.reset()
  syncState()
  finishedElapsed.value = 0
  lastSubmittedElapsed = -1
  notesMode.value = false
  hintCell.value = null
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  sound.play('start')
}

function applySettings(config: SudokuConfig) {
  engine.value = new SudokuEngine(config)
  syncState()
  finishedElapsed.value = 0
  lastSubmittedElapsed = -1
  notesMode.value = false
  hintCell.value = null
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
    text: `我在 EasyGame 数独用 ${time} 完成了「${specOf(state.size).label} · ${DIFFICULTY_LABELS[state.difficulty]}」难度，来挑战我！🔢`,
    url: shareUrl('/game/sudoku'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

function syncState() {
  const s = engine.value.getState()
  state.grid = s.grid.map((row) => [...row])
  state.given = s.given.map((row) => [...row])
  state.notes = s.notes.map((row) => row.map((list) => [...list]))
  state.selected = s.selected ? { ...s.selected } : null
  state.moves = s.moves
  state.mistakes = s.mistakes
  state.hintsUsed = s.hintsUsed
  state.startTime = s.startTime
  state.bestTime = s.bestTime
  state.won = s.won
  state.over = s.over
  state.size = s.size
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
    let r = Math.floor(state.size / 2)
    let c = Math.floor(state.size / 2)
    if (state.selected) {
      r = state.selected.row + dirMap[k][0]
      c = state.selected.col + dirMap[k][1]
    }
    if (r >= 0 && r < state.size && c >= 0 && c < state.size) {
      engine.value.select(r, c)
      syncState()
    }
    return
  }
  // 数字 1-9（超出当前尺寸忽略）
  if (k >= '1' && k <= '9') {
    e.preventDefault()
    if (showResume.value) {
      resumeGame()
      return
    }
    const n = Number(k)
    if (n <= state.size) inputNum(n)
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
@keyframes winFlash {
  0% {
    background-color: rgba(52, 211, 153, 0.9);
    transform: scale(1.05);
  }
  100% {
    background-color: transparent;
    transform: scale(1);
  }
}
.win-cell {
  animation: winFlash 0.5s ease both;
}
</style>

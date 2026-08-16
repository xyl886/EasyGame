<template>
  <div class="min-h-screen w-full py-4 px-2 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-gray-500/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">💣 扫雷</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-gray-500/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-gray-500/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="设置"
        >
          ⚙️
        </button>
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- 游戏主体 -->
    <main class="max-w-xl w-full mx-auto flex-1 flex flex-col">
      <!-- 状态栏 -->
      <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <div class="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[64px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">💣 剩余</span>
            <span class="text-lg font-bold tabular-nums text-red-500 dark:text-red-400">{{ minesLeft }}</span>
          </div>
          <div class="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[72px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">⏱ 用时</span>
            <span class="text-lg font-bold tabular-nums text-text-light dark:text-text-dark">{{ elapsedText }}</span>
          </div>
          <!-- 经典笑脸重开按钮 -->
          <button
            @click="newGame"
            class="w-11 h-11 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md transition-all active:scale-90 text-xl flex items-center justify-center"
            aria-label="重新开始"
            title="重新开始"
          >
            {{ smiley }}
          </button>
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 shadow-claude bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-gray-500/50"
          >
            ❓ 玩法
          </button>
          <button
            @click="flagMode = !flagMode"
            class="px-3 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 shadow-claude"
            :class="flagMode
              ? 'bg-blue-500 text-white border-transparent'
              : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-blue-400/50'"
          >
            🚩 旗子{{ flagMode ? '·开' : '' }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs opacity-70 text-text-muted-light dark:text-text-muted-dark">
            {{ difficultyLabel }} · {{ state.rows }}×{{ state.cols }}
            <span v-if="state.bestTime > 0"> · 最快 {{ bestTimeText }}</span>
          </span>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>

      <!-- 棋盘 -->
      <div
        ref="boardRef"
        class="relative mx-auto select-none touch-none w-full rounded-lg overflow-hidden border-2 border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-inner"
        :class="{ 'board-shake': state.status === 'lost' }"
        @pointerleave="cancelPress"
      >
        <div
          class="grid w-full"
          :style="{ gridTemplateColumns: `repeat(${state.cols}, 1fr)` }"
        >
          <button
            v-for="(cell, i) in state.cells"
            :key="i"
            type="button"
            class="relative flex items-center justify-center text-[13px] sm:text-base leading-none transition-all duration-75"
            :class="cellClass(cell, i)"
            :style="[winDelay(i), { aspectRatio: '1 / 1' }]"
            @pointerdown="onPointerDown(i, $event)"
            @pointerup="onPointerUp(i)"
            @pointercancel="cancelPress"
            @contextmenu.prevent="toggleFlagAt(i)"
          >{{ cellText(cell) }}</button>
        </div>

        <!-- 继续上次遮罩 -->
        <div
          v-if="showResume && state.status !== 'won' && state.status !== 'lost'"
          class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-gray-700 dark:text-gray-200">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">已翻开 {{ revealedCount }} 格，继续？</p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-bold shadow-claude-md transition-all active:scale-95"
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

        <!-- 失败遮罩 -->
        <div
          v-if="state.status === 'lost'"
          class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-red-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">💥 踩到雷了！</div>
            <p class="opacity-90 text-white">翻开 {{ state.moves }} 格 · 用时 {{ elapsedText }}</p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="newGame"
                class="px-6 py-2.5 rounded-xl bg-white text-red-600 font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>

        <!-- 胜利遮罩 -->
        <div
          v-if="state.status === 'won'"
          class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-gray-600/80 dark:bg-gray-800/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-yellow-300">🎉 扫雷成功！</div>
            <p class="opacity-90 text-white">
              用时 {{ elapsedText }}<span v-if="state.bestTime > 0 && finishedElapsed === state.bestTime" class="ml-2">🏅 刷新最快纪录！</span>
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
                class="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作说明 -->
      <div class="text-center text-xs opacity-60 mt-3">
        PC：左键翻开 · 右键标记 · 按住数字格快速展开
        <span class="sm:hidden block mt-1">📱 手机：点击翻开 · 长按或「🚩 旗子」模式标记</span>
      </div>
    </main>

    <footer class="max-w-xl w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <MinesweeperSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="扫雷">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li><strong>点击翻开</strong>格子；数字表示它周围 8 格里的<strong>地雷数量</strong></li>
        <li>根据数字推理出雷的位置，用 🚩 <strong>标记</strong>（PC 右键 / 手机长按或旗子模式）</li>
        <li><strong>首次点击必定安全</strong>；翻开所有非雷格即获胜</li>
        <li>踩到雷游戏结束——标错的旗子会显示<strong>红叉 ✗</strong></li>
        <li>💡 按住已翻开的数字格可<strong>快速展开</strong>周围区域（旗子数匹配时）</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="扫雷"
      :dimensions="leaderboardDimensions"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { MinesweeperEngine } from '../../game/minesweeper/GameEngine'
import type { MineState, MineConfig, MineCell, MineDifficulty, MineStatus } from '../../game/minesweeper/types'
import { DIFFICULTY_LABELS, mineScoreForTime } from '../../game/minesweeper/types'
import { useMinesweeperSettingsStore } from '../../stores/minesweeper-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl } from '../../utils/share'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import HowToPlay from '../../components/HowToPlay.vue'
import MinesweeperSettingsPanel from './components/MinesweeperSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useMinesweeperSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'minesweeper'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
/** 玩法说明弹层 */
const showHowTo = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['beginner', 'intermediate', 'expert'] as MineDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
]
let lastSubmittedElapsed = -1

function submitScoreIfWon() {
  if (state.status !== 'won') return
  if (finishedElapsed.value === lastSubmittedElapsed) return
  lastSubmittedElapsed = finishedElapsed.value
  leaderboard.addEntry({
    score: mineScoreForTime(finishedElapsed.value),
    difficulty: settings.config.difficulty,
    size: state.rows,
    moves: state.moves,
    duration: finishedElapsed.value,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'minesweeper'
const pendingAutosave = loadAutosave<MineState>(AUTOSAVE_GAME_ID)
const showResume = ref(false)
if (pendingAutosave && pendingAutosave.status !== 'won' && pendingAutosave.status !== 'lost') {
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
  if (document.visibilityState === 'hidden' && state.status !== 'won' && state.status !== 'lost') persistAutosave()
}
function onPageHide() {
  if (state.status !== 'won' && state.status !== 'lost') persistAutosave()
}

// ===== 引擎与状态 =====
const engine = shallowRef(new MinesweeperEngine(settings.config))
const state = reactive<MineState>(engine.value.getState())
const finishedElapsed = ref(0)
const now = ref(Date.now())
/** 键盘光标位置 */
const cursor = ref<number | null>(null)
/** 旗子模式：点击格子=标记（移动端标记雷的可靠方式） */
const flagMode = ref(false)

/** 经典笑脸：随游戏状态变化（玩/赢/输） */
const smiley = computed(() => (state.status === 'won' ? '😎' : state.status === 'lost' ? '😵' : '🙂'))

const difficultyLabel = computed(() => DIFFICULTY_LABELS[settings.config.difficulty])

const minesLeft = computed(() => Math.max(0, state.mines - state.flags))

const revealedCount = computed(() => state.cells.filter((c) => c.revealed).length)

const elapsedText = computed(() => {
  if (state.status === 'won') {
    return formatTime(finishedElapsed.value)
  }
  if (state.status === 'ready' || state.startTime === 0) return '0秒'
  const sec = Math.floor((now.value - state.startTime) / 1000)
  return formatTime(sec)
})

const bestTimeText = computed(() => formatTime(state.bestTime))

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

const NUM_COLORS = [
  '',
  'text-blue-600 dark:text-blue-400',
  'text-green-600 dark:text-green-400',
  'text-red-500',
  'text-indigo-700 dark:text-indigo-400',
  'text-rose-700 dark:text-rose-400',
  'text-cyan-600 dark:text-cyan-400',
  'text-gray-800 dark:text-gray-200',
  'text-gray-500',
]

function cellClass(cell: MineCell, i: number): string {
  const classes: string[] = []
  if (cell.revealed) {
    if (cell.isMine) {
      // 踩中的雷红底，其余雷灰底
      classes.push(cell.exploded ? 'bg-red-500/50 dark:bg-red-500/60' : 'bg-card-light dark:bg-card-dark')
    } else {
      classes.push('bg-card-light dark:bg-card-dark')
    }
  } else {
    // 未翻开：凸起
    classes.push('bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 shadow-inner')
    if (cell.flag === 'flag') classes.push('!from-blue-200 !to-blue-300 dark:!from-blue-900 dark:!to-blue-800')
    if (cell.flag === 'question') classes.push('!from-amber-200 !to-amber-300 dark:!from-amber-900 dark:!to-amber-800')
    // 误标的旗子：红色调
    if (state.status === 'lost' && cell.flag === 'flag' && !cell.isMine) {
      classes.push('!from-red-200 !to-red-300 dark:!from-red-900 dark:!to-red-800')
    }
  }
  // 按压凹下 / Chord 预览
  if (!cell.revealed && isPressed(cell, i)) {
    classes.push('cell-pressed')
  }
  // 键盘光标
  if (cursor.value === i) {
    classes.push('ring-2 ring-inset ring-emerald-400 z-10')
  }
  if (cell.revealed && !cell.isMine && cell.adjacent > 0) {
    classes.push(NUM_COLORS[cell.adjacent] ?? '')
  }
  // 翻开弹出动画（非雷格首次翻开时 scale 弹一下）
  if (cell.revealed && !cell.isMine) classes.push('reveal-pop')
  // 胜利动画
  if (state.status === 'won') classes.push('win-cell')
  return classes.join(' ')
}

function cellText(cell: MineCell): string {
  // 失败：误标旗子显示红叉
  if (state.status === 'lost' && cell.flag === 'flag' && !cell.isMine) return '✗'
  if (cell.revealed) {
    if (cell.isMine) return '💣'
    return cell.adjacent > 0 ? String(cell.adjacent) : ''
  }
  // 胜利：未翻的雷自动标旗展示
  if (state.status === 'won' && cell.isMine) return '🚩'
  if (cell.flag === 'flag') return '🚩'
  if (cell.flag === 'question') return '❓'
  return ''
}

/** 胜利动画：逐格延迟 */
function winDelay(idx: number) {
  if (state.status !== 'won') return {}
  return { animationDelay: `${Math.min(idx, 40) * 20}ms` }
}

function onLeftClick(i: number) {
  if (showResume.value) return
  // 旗子模式：点击 = 标记，不翻开
  if (flagMode.value) {
    toggleFlagAt(i)
    return
  }
  const before = state.status
  const st = engine.value.reveal(Math.floor(i / state.cols), i % state.cols)
  handleStatusChange(before, st)
}

function toggleFlagAt(i: number) {
  if (showResume.value) return
  const before = state.status
  engine.value.toggleFlag(Math.floor(i / state.cols), i % state.cols)
  syncState()
  sound.play('click')
  if (state.status === 'won' && before !== 'won') {
    finishWin()
  }
  persistAutosave()
}

function onChord(i: number) {
  if (showResume.value) return
  const cell = state.cells[i]
  if (!cell.revealed || cell.isMine) return
  const before = state.status
  const st = engine.value.chord(Math.floor(i / state.cols), i % state.cols)
  handleStatusChange(before, st)
}

/** 状态变化统一处理（翻开/踩雷/胜利） */
function handleStatusChange(before: MineStatus, st: MineStatus) {
  syncState()
  if (st === 'lost' && before !== 'lost') {
    sound.play('over')
    clearAutosave(AUTOSAVE_GAME_ID)
  } else if (st === 'won' && before !== 'won') {
    finishWin()
  } else if (st === 'playing') {
    sound.play('move')
    persistAutosave()
  }
}

function finishWin() {
  finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
  sound.play('win')
  clearAutosave(AUTOSAVE_GAME_ID)
  submitScoreIfWon()
}

function newGame() {
  engine.value.reset()
  syncState()
  finishedElapsed.value = 0
  lastSubmittedElapsed = -1
  cursor.value = null
  flagMode.value = false
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  sound.play('start')
}

function applySettings(config: MineConfig) {
  engine.value = new MinesweeperEngine(config)
  syncState()
  finishedElapsed.value = 0
  lastSubmittedElapsed = -1
  cursor.value = null
  flagMode.value = false
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

/** 分享成绩 */
async function shareResult() {
  const result = await shareOrCopy({
    text: `我在 EasyGame 扫雷用 ${elapsedText.value} 扫清了「${DIFFICULTY_LABELS[settings.config.difficulty]}」难度，来挑战我！💣`,
    url: shareUrl('/game/minesweeper'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

function syncState() {
  const s = engine.value.getState()
  state.rows = s.rows
  state.cols = s.cols
  state.mines = s.mines
  state.cells = s.cells.map((c) => ({ ...c }))
  state.flags = s.flags
  state.status = s.status
  state.moves = s.moves
  state.startTime = s.startTime
  state.bestTime = s.bestTime
  state.difficulty = s.difficulty
}

// ===== 键盘操作 =====
function onKeydown(e: KeyboardEvent) {
  // 设置/排行榜弹窗打开时忽略（ref 需 .value）
  if (settings.showSettings || showLeaderboard.value) return
  const k = e.key
  const total = state.rows * state.cols
  const dirMap: Record<string, number> = {
    ArrowUp: -state.cols, ArrowDown: state.cols, ArrowLeft: -1, ArrowRight: 1,
    w: -state.cols, W: -state.cols, s: state.cols, S: state.cols, a: -1, A: -1, d: 1, D: 1,
  }
  if (dirMap[k]) {
    e.preventDefault()
    if (showResume.value) {
      resumeGame()
      return
    }
    if (state.status === 'won' || state.status === 'lost') return
    if (cursor.value === null) {
      cursor.value = Math.floor(total / 2)
    } else {
      const cur = cursor.value
      const r = Math.floor(cur / state.cols)
      const c = cur % state.cols
      const delta = dirMap[k]
      let nr = r
      let nc = c
      if (delta === 1 || delta === -1) nc = c + delta
      else nr = r + (delta > 0 ? 1 : -1)
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
        cursor.value = nr * state.cols + nc
      }
    }
    return
  }
  // 空格：翻开；F：标记；Enter：chord
  if (k === ' ' || k === 'Enter' || k === 'f' || k === 'F') {
    e.preventDefault()
    if (cursor.value === null) return
    const i = cursor.value
    if (k === ' ' && state.status !== 'won' && state.status !== 'lost') onLeftClick(i)
    else if ((k === 'f' || k === 'F') && state.status !== 'won' && state.status !== 'lost') toggleFlagAt(i)
    else if (k === 'Enter') onChord(i)
    return
  }
  if (k === 'Escape') {
    cursor.value = null
  }
}

// ===== 按压交互（指针统一处理鼠标/触摸） =====
/** 当前按住的格子 */
const pressCell = ref<number | null>(null)
/** 是否按在已翻数字格上（Chord 预览模式） */
const pressChord = ref(false)
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressLongFired = false

function onPointerDown(i: number, e: PointerEvent) {
  if (showResume.value || state.status === 'won' || state.status === 'lost') return
  // 右键不触发按压
  if (e.button === 2) return
  // 旗子模式：点击直接标记，无需按压
  if (flagMode.value) return
  const cell = state.cells[i]
  if (cell.revealed) {
    // 数字格 → Chord 预览
    if (cell.adjacent > 0) {
      pressCell.value = i
      pressChord.value = true
    }
    return
  }
  pressCell.value = i
  pressChord.value = false
  pressLongFired = false
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    // 长按未翻格 → 标记旗子
    pressLongFired = true
    toggleFlagAt(i)
    if (navigator.vibrate) navigator.vibrate(30)
  }, 420)
}

function onPointerUp(i: number) {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  // 旗子模式：点击 = 标记
  if (flagMode.value) {
    pressCell.value = null
    pressChord.value = false
    pressLongFired = false
    if (showResume.value || state.status === 'won' || state.status === 'lost') return
    toggleFlagAt(i)
    return
  }
  if (pressCell.value === null) return
  const target = pressCell.value
  const chordMode = pressChord.value
  pressCell.value = null
  pressChord.value = false
  if (showResume.value || state.status === 'won' || state.status === 'lost') return
  // 长按已标记过，松手不再翻开
  if (pressLongFired) {
    pressLongFired = false
    return
  }
  if (chordMode) {
    onChord(target)
    return
  }
  if (target === i) onLeftClick(target)
}

function cancelPress() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  pressCell.value = null
  pressChord.value = false
  pressLongFired = false
}

/** 该格是否处于"被按下/Chord 预览"的凹下状态 */
function isPressed(cell: MineCell, i: number): boolean {
  if (pressCell.value === null) return false
  if (pressChord.value) {
    // 预览模式：目标数字格的未翻邻居凹下
    if (cell.revealed || i === pressCell.value) return false
    const pc = pressCell.value
    const r1 = Math.floor(pc / state.cols)
    const c1 = pc % state.cols
    const r2 = Math.floor(i / state.cols)
    const c2 = i % state.cols
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1
  }
  return pressCell.value === i
}

// ===== 计时器 =====
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  syncState()
  if (state.status === 'won') {
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
  if (state.status !== 'won' && state.status !== 'lost') persistAutosave()
  if (timer) clearInterval(timer)
  if (pressTimer) clearTimeout(pressTimer)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
/* 按压凹下 */
.cell-pressed {
  filter: brightness(0.82);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.25);
}
/* 失败抖动 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.board-shake {
  animation: shake 0.4s ease;
}
/* 翻开弹出 */
@keyframes revealPop {
  0% {
    transform: scale(0.82);
  }
  60% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}
.reveal-pop {
  animation: revealPop 0.18s ease-out;
}
/* 胜利闪绿 */
@keyframes winFlash {
  0% { background-color: rgba(74, 222, 128, 0.9); transform: scale(1.06); }
  100% { background-color: transparent; transform: scale(1); }
}
.win-cell {
  animation: winFlash 0.4s ease both;
}
</style>

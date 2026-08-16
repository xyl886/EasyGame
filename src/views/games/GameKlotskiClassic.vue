<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-amber-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🧩 三国华容道</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-amber-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-amber-400/40 transition-all active:scale-95 flex items-center justify-center"
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
      <!-- 分数面板 -->
      <div class="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-text-light dark:text-text-dark">
            三国华容道
          </h1>
          <p class="text-xs opacity-70 mt-1 text-text-muted-light dark:text-text-muted-dark">
            {{ layoutLabel }} · 4×5
            <span v-if="state.bestMoves > 0"> · 历史最少 {{ state.bestMoves }} 步</span>
            <span v-else> · 还没救出曹操</span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="步数" :value="state.moves" />
          <div class="flex flex-col items-end justify-center px-3 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[72px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">用时</span>
            <span class="text-lg font-bold tabular-nums text-text-light dark:text-text-dark">{{ elapsedText }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div class="flex gap-2">
          <button
            @click="showLevelMenu = !showLevelMenu"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-amber-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            {{ layoutLabel }} <span class="opacity-50 text-xs">▾</span>
          </button>
          <button
            @click="autoshow"
            :disabled="!canDemo"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-amber-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            {{ demoActive ? '⏹ 停止演示' : '▶️ 自动演示' }}
          </button>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            @click="undo"
            :disabled="!canUndo"
            class="px-4 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-amber-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            ↩️ 撤销
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>
      <div class="text-xs opacity-60 mb-4 text-text-muted-light dark:text-text-muted-dark">
        点击棋子直接移动（多方向时弹出方向按钮）· 方向键 / <kbd class="px-1 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">WASD</kbd> 微调 · 目标：曹操移到下方出口
      </div>

      <!-- 棋盘 -->
      <div
        ref="boardRef"
        class="relative mx-auto select-none touch-none rounded-2xl board-bg-light dark:board-bg-dark shadow-inner"
        :style="boardStyle"
      >
        <!-- 背景 20 格 -->
        <div
          class="grid w-full h-full"
          :style="{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: gapPx }"
        >
          <div
            v-for="i in ROWS * COLS"
            :key="i - 1"
            class="rounded-md cell-bg-light dark:cell-bg-dark"
          ></div>
        </div>

        <!-- 出口标记（曹操目标区域） -->
        <div class="absolute pointer-events-none" :style="exitStyle">
          <div class="w-full h-full rounded-lg border-2 border-dashed border-amber-400/70 dark:border-amber-300/70 flex items-center justify-center">
            <span class="text-[10px] font-bold text-amber-500 dark:text-amber-300/80">出口</span>
          </div>
        </div>

        <!-- 棋子层 -->
        <div class="absolute inset-0" :style="{ padding: padding }">
          <div
            v-for="p in state.pieces"
            :key="p.id"
            class="absolute rounded-lg cursor-pointer flex items-center justify-center font-bold transition-all duration-75 select-none"
            :class="[pieceClass(p.kind), { 'ring-2 ring-amber-300 dark:ring-amber-200 z-10 shadow-claude-lg': p.id === state.selectedId }]"
            :style="pieceStyle(p)"
            @click="onPieceClick(p.id)"
          >
            <span :style="{ fontSize: pieceFontSize(p.kind) }">{{ pieceLabel(p) }}</span>
          </div>
        </div>

        <!-- 方向按钮浮层（点击多方向可动棋子时显示） -->
        <div v-if="dirOverlay" class="absolute z-20 pointer-events-none" :style="overlayBoxStyle">
          <button
            v-if="dirOverlay.dirs.includes('up')"
            type="button"
            @click="moveViaOverlay('up')"
            class="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-1.5 -translate-y-full w-8 h-8 rounded-full bg-amber-400 text-gray-900 shadow-claude-md font-bold text-base flex items-center justify-center active:scale-95"
          >
            ▲
          </button>
          <button
            v-if="dirOverlay.dirs.includes('down')"
            type="button"
            @click="moveViaOverlay('down')"
            class="pointer-events-auto absolute left-1/2 -translate-x-1/2 -bottom-1.5 translate-y-full w-8 h-8 rounded-full bg-amber-400 text-gray-900 shadow-claude-md font-bold text-base flex items-center justify-center active:scale-95"
          >
            ▼
          </button>
          <button
            v-if="dirOverlay.dirs.includes('left')"
            type="button"
            @click="moveViaOverlay('left')"
            class="pointer-events-auto absolute top-1/2 -translate-y-1/2 -left-1.5 -translate-x-full w-8 h-8 rounded-full bg-amber-400 text-gray-900 shadow-claude-md font-bold text-base flex items-center justify-center active:scale-95"
          >
            ◀
          </button>
          <button
            v-if="dirOverlay.dirs.includes('right')"
            type="button"
            @click="moveViaOverlay('right')"
            class="pointer-events-auto absolute top-1/2 -translate-y-1/2 -right-1.5 translate-x-full w-8 h-8 rounded-full bg-amber-400 text-gray-900 shadow-claude-md font-bold text-base flex items-center justify-center active:scale-95"
          >
            ▶
          </button>
        </div>

        <!-- 继续上次遮罩 -->
        <div
          v-if="showResume && !state.won"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-red-500 dark:text-red-300">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">已走 {{ pendingAutosave?.moves ?? 0 }} 步，继续救曹操？</p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-claude-md transition-all active:scale-95"
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
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-red-600/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-yellow-200">🎉 曹操逃出！</div>
            <p class="opacity-90 text-white">
              {{ state.moves }} 步 · {{ elapsedText }}
              <span v-if="state.bestMoves > 0 && state.moves === state.bestMoves" class="ml-2">🏅 刷新最少步数！</span>
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
                class="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-4 sm:hidden">
        👆 点击棋子直接移动（多方向可动时滑动选择）· 目标：把曹操移到下方出口
      </div>
    </main>

    <footer class="max-w-xl w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 布局选择弹层 -->
    <transition name="panel">
      <div
        v-if="showLevelMenu"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showLevelMenu = false"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-text-light dark:text-text-dark">选择布局 · 40 经典残局</h3>
            <button
              @click="showLevelMenu = false"
              class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in levelOptions"
              :key="opt.id"
              @click="chooseLevel(opt.id)"
              class="px-3 py-2 rounded-lg text-sm border text-left flex items-center justify-between gap-1 transition-all active:scale-[0.98]"
              :class="opt.id === state.layout
                ? 'bg-amber-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-amber-400/50'"
            >
              <span class="truncate">{{ opt.label }}</span>
              <span class="text-xs shrink-0" :class="opt.minSteps > 0 ? 'opacity-60' : 'opacity-40'">
                {{ opt.minSteps > 0 ? opt.minSteps + '步' : '无解' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 设置面板 -->
    <KlotskiClassicSettingsPanel @apply="applySettings" />

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="三国华容道"
      :dimensions="leaderboardDimensions"
      size-suffix="×5"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { ClassicKlotskiEngine } from '../../game/klotski-classic/GameEngine'
import type {
  ClassicState,
  ClassicConfig,
  ClassicDirection,
  Piece,
  PieceKind,
} from '../../game/klotski-classic/types'
import {
  PIECE_LABEL,
  ROWS,
  COLS,
  classicScoreForMoves,
} from '../../game/klotski-classic/types'
import { LEVELS, findLevel } from '../../game/klotski-classic/levels'
import { useKlotskiSettingsStore } from '../../stores/klotski-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl, gameShareText } from '../../utils/share'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import ScoreBox from './components/ScoreBox.vue'
import KlotskiClassicSettingsPanel from './components/KlotskiClassicSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useKlotskiSettingsStore()

/** 演示步骤方向码：1上 2右 3下 4左 */
const DEMO_DIR_MAP: Record<number, ClassicDirection | undefined> = {
  1: 'up',
  2: 'right',
  3: 'down',
  4: 'left',
}

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'klotski-classic'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
// 维度：difficulty = 经典布局 / 随机开局（40 种布局归为 classic，避免筛选按钮爆炸）
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '类型',
    values: [
      { value: 'classic', label: '经典布局' },
      { value: 'random', label: '随机开局' },
    ],
  },
]
/** 胜利入榜去重 */
let lastSubmittedWonMoves = -1

function submitScoreIfWon() {
  if (!state.won) return
  if (state.moves === lastSubmittedWonMoves) return
  lastSubmittedWonMoves = state.moves
  leaderboard.addEntry({
    score: classicScoreForMoves(state.moves),
    difficulty: state.layout === 'random' ? 'random' : 'classic',
    size: ROWS,
    moves: state.moves,
    duration: finishedElapsed.value,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'klotski-classic'
const pendingAutosave = loadAutosave<ClassicState>(AUTOSAVE_GAME_ID)
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
const engine = shallowRef(new ClassicKlotskiEngine({ layout: settings.classicLayout }))
const state = reactive<ClassicState>(engine.value.getState())
const canUndo = ref(false)
const finishedElapsed = ref(0)
const now = ref(Date.now())

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(8)
const padding = ref(8)

const boardStyle = computed(() => ({
  width: '100%',
  maxWidth: '460px',
  aspectRatio: `${COLS} / ${ROWS}`,
  padding: `${padding.value}px`,
}))

const gapPx = computed(() => `${gap.value}px`)

const layoutLabel = computed(() =>
  findLevel(state.layout)?.name ?? (state.layout === 'random' ? '随机开局' : state.layout),
)

// ===== 布局选择 =====
const showLevelMenu = ref(false)
/** 布局菜单项：40 经典布局 + 随机 */
const levelOptions = computed(() => [
  ...LEVELS.map((l) => ({
    id: l.id,
    label: l.name,
    minSteps: l.minSteps,
  })),
  { id: 'random', label: '随机开局', minSteps: 0 },
])

function chooseLevel(id: string) {
  showLevelMenu.value = false
  if (id === state.layout) return
  applySettings({ layout: id })
}

// ===== 自动演示 =====
const demoActive = ref(false)
let demoTimer: ReturnType<typeof setInterval> | null = null
let demoSchedule: number[] = []
let demoIdx = 0

/** 当前布局是否有演示解法 */
const canDemo = computed(() => {
  const lv = findLevel(state.layout)
  return !!lv && lv.steps.length > 0
})

function stopDemo() {
  demoActive.value = false
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
}

function autoshow() {
  if (demoActive.value) {
    stopDemo()
    return
  }
  const lv = findLevel(state.layout)
  if (!lv || lv.steps.length === 0) {
    toast('该布局暂无自动演示')
    return
  }
  // 从当前布局重开并播放演示
  engine.value.reset()
  syncState()
  finishedElapsed.value = 0
  lastSubmittedWonMoves = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  showDirOverlay(null)
  demoActive.value = true
  demoSchedule = lv.steps
  demoIdx = 0
  sound.play('start')
  demoTimer = setInterval(() => {
    if (demoIdx >= demoSchedule.length) {
      stopDemo()
      return
    }
    const code = demoSchedule[demoIdx]
    demoIdx++
    const pieceId = Math.floor(code / 10)
    const dir = DEMO_DIR_MAP[code % 10]
    if (!dir) {
      stopDemo()
      return
    }
    if (engine.value.demoMove(pieceId, dir)) {
      syncState()
      sound.play('move')
      if (state.won) {
        finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
        sound.play('win')
        stopDemo()
        clearAutosave(AUTOSAVE_GAME_ID)
        submitScoreIfWon()
      }
    }
  }, 260)
}

// ===== 方向按钮浮层（点击多方向可动棋子时显示） =====
const dirOverlay = ref<{
  id: number
  row: number
  col: number
  w: number
  h: number
  dirs: ClassicDirection[]
} | null>(null)

function showDirOverlay(v: typeof dirOverlay.value) {
  dirOverlay.value = v
}

/** 点击方向按钮移动（同时选中该棋子） */
function moveViaOverlay(dir: ClassicDirection) {
  const ov = dirOverlay.value
  if (ov) {
    engine.value.select(ov.id)
    doMove(dir)
  }
  showDirOverlay(null)
}

const elapsedText = computed(() => {
  const sec = state.won ? finishedElapsed.value : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

function pieceClass(kind: PieceKind): string {
  switch (kind) {
    case 'caocao':
      return 'bg-red-600 dark:bg-red-500 text-yellow-100 shadow-claude-lg'
    case 'guanyu':
      return 'bg-green-600 dark:bg-green-500 text-white shadow-claude-md'
    case 'general':
      return 'bg-blue-600 dark:bg-blue-500 text-white shadow-claude-md'
    case 'soldier':
      return 'bg-gray-500 dark:bg-gray-400 text-white shadow-claude'
  }
}

function pieceLabel(p: Piece): string {
  return p.name ?? PIECE_LABEL[p.kind]
}

function pieceFontSize(kind: PieceKind): string {
  switch (kind) {
    case 'caocao':
      return '1.3rem'
    case 'guanyu':
      return '1rem'
    case 'general':
      return '0.85rem'
    case 'soldier':
      return '0.75rem'
  }
}

/** 棋子绝对定位（用棋子自身的 w/h，经典布局中将军横竖不一） */
function pieceStyle(p: Piece) {
  const { w, h } = p
  const g = gap.value
  const cell = `calc((100% - ${g * (COLS - 1)}px) / ${COLS})`
  const cellH = `calc((100% - ${g * (ROWS - 1)}px) / ${ROWS})`
  return {
    left: `calc(${cell} * ${p.col} + ${g * p.col}px)`,
    top: `calc(${cellH} * ${p.row} + ${g * p.row}px)`,
    width: `calc(${cell} * ${w} + ${g * (w - 1)}px)`,
    height: `calc(${cellH} * ${h} + ${g * (h - 1)}px)`,
  }
}

/** 出口标记：曹操目标区域（底部中央，(ROWS-2, 1) 起 2×2） */
const exitStyle = computed(() => {
  const g = gap.value
  const cell = `calc((100% - ${g * (COLS - 1)}px) / ${COLS})`
  const cellH = `calc((100% - ${g * (ROWS - 1)}px) / ${ROWS})`
  return {
    left: `calc(${cell} * 1 + ${g}px)`,
    top: `calc(${cellH} * ${ROWS - 2} + ${g * (ROWS - 2)}px)`,
    width: `calc(${cell} * 2 + ${g}px)`,
    height: `calc(${cellH} * 2 + ${g}px)`,
  }
})

/** 方向按钮浮层的定位盒（与目标棋子同位置同大小） */
const overlayBoxStyle = computed(() => {
  const ov = dirOverlay.value
  if (!ov) return {}
  return pieceStyle({
    id: ov.id,
    kind: 'soldier',
    row: ov.row,
    col: ov.col,
    w: ov.w,
    h: ov.h,
  })
})

function syncState() {
  const s = engine.value.getState()
  state.pieces = s.pieces.map((p) => ({ ...p }))
  state.moves = s.moves
  state.startTime = s.startTime
  state.bestMoves = s.bestMoves
  state.won = s.won
  state.over = s.over
  state.selectedId = s.selectedId
  state.layout = s.layout
  canUndo.value = engine.value.canUndo()
}

function doMove(dir: ClassicDirection) {
  if (state.won || demoActive.value) return
  const moved = engine.value.move(dir)
  if (moved) {
    syncState()
    showDirOverlay(null)
    sound.play('move')
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

function onPieceClick(id: number) {
  if (state.won || showResume.value || demoActive.value) return
  const engineInst = engine.value
  const dirs = engineInst.movableDirs(id)
  if (dirs.length === 1) {
    // 唯一可动方向 → 点击直接移动（并保持选中，方便连续推动）
    engineInst.select(id)
    doMove(dirs[0])
  } else if (dirs.length > 1) {
    // 多个方向可动 → 弹出方向按钮浮层
    engineInst.select(id)
    syncState()
    const p = state.pieces.find((x) => x.id === id)
    if (p) {
      showDirOverlay({ id, row: p.row, col: p.col, w: p.w, h: p.h, dirs })
    }
  } else {
    // 被卡死 → 选中展示 + 提示先移开阻挡的棋子
    engineInst.select(id)
    syncState()
    showDirOverlay(null)
    toast('该棋子被挡住了，先移动其他棋子为它让路')
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
  stopDemo()
  engine.value.reset()
  syncState()
  finishedElapsed.value = 0
  lastSubmittedWonMoves = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  showDirOverlay(null)
  sound.play('start')
}

/** 应用设置（布局变化） */
function applySettings(config: ClassicConfig) {
  stopDemo()
  engine.value = new ClassicKlotskiEngine(config)
  syncState()
  finishedElapsed.value = 0
  lastSubmittedWonMoves = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  showDirOverlay(null)
}

/** 分享成绩 */
async function shareResult() {
  const result = await shareOrCopy({
    text: gameShareText('klotski-classic', state.moves, undefined, true),
    url: shareUrl('/game/klotski-classic'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

// ===== 键盘操作 =====
function onKeydown(e: KeyboardEvent) {
  // 设置/排行榜/布局菜单弹窗打开时忽略游戏按键（ref 需 .value）
  if (settings.showSettings || showLeaderboard.value || showLevelMenu.value) return
  const map: Record<string, ClassicDirection> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
  }
  const dir = map[e.key]
  if (dir) {
    e.preventDefault()
    if (showResume.value) {
      resumeGame()
      return
    }
    doMove(dir)
  }
}

// ===== 触摸滑动 =====
let touchStart: { x: number; y: number } | null = null
const SWIPE_MIN = 24

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  const t = e.touches[0]
  touchStart = { x: t.clientX, y: t.clientY }
}

function onTouchEnd(e: TouchEvent) {
  if (!touchStart) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStart.x
  const dy = t.clientY - touchStart.y
  touchStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return
  if (state.won || demoActive.value) return
  if (Math.abs(dx) > Math.abs(dy)) {
    doMove(dx > 0 ? 'right' : 'left')
  } else {
    doMove(dy > 0 ? 'down' : 'up')
  }
}

// ===== 布局 =====
function updateLayout() {
  const w = window.innerWidth
  gap.value = w < 480 ? 6 : w < 768 ? 8 : 10
  padding.value = gap.value + 2
}

// ===== 计时器 =====
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateLayout()
  syncState()
  if (state.won) {
    finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
    submitScoreIfWon()
  }
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updateLayout)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  const el = boardRef.value
  if (el) {
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  }
  timer = setInterval(() => {
    now.value = Date.now()
  }, 500)
})

onBeforeUnmount(() => {
  if (!state.won) persistAutosave()
  stopDemo()
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
  const el = boardRef.value
  if (el) {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchend', onTouchEnd)
  }
})
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease;
}
.panel-enter-active > div:last-child,
.panel-leave-active > div:last-child {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
.panel-enter-from > div:last-child,
.panel-leave-to > div:last-child {
  transform: scale(0.9) translateY(10px);
}
</style>

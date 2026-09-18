<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🔢 数字连连</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all active:scale-95 flex items-center justify-center"
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
      <div class="flex items-center justify-between mb-3 gap-3">
        <div>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light dark:text-text-dark">
            数字连连
          </h1>
          <p class="text-[11px] opacity-70 mt-0.5 text-text-muted-light dark:text-text-muted-dark">
            第 {{ state.level }} 关 · {{ modeLabel }} · {{ difficultyLabel }} · {{ state.size }}×{{ state.size }}
            <span v-if="hiddenCount > 0"> · 显示 {{ total - hiddenCount }}/{{ total }}</span>
            <span v-if="state.mistakes > 0" :class="mistakesClass"> · 失误 {{ state.mistakes }}<template v-if="isEndless">/{{ ENDLESS_MAX_MISTAKES }}</template></span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="用时" :value="elapsedText" />
          <ScoreBox label="分数" :value="state.totalScore" accent />
        </div>
      </div>

      <!-- 进度条：已连 / 总数 -->
      <div class="flex items-center gap-3 mb-3">
        <div class="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-200"
            :style="{ width: `${progressPct}%` }"
          ></div>
        </div>
        <div
          class="text-xs font-extrabold tabular-nums px-2.5 py-1 rounded-full border-2"
          :class="nextBadgeClass"
        >
          下一个 {{ state.next > total ? '✓' : state.next }}
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap"
          >
            ❓ 玩法
          </button>
          <div class="text-xs opacity-70 hidden sm:block text-text-muted-light dark:text-text-muted-dark">
            只能连<strong>相邻</strong>的数字（含斜线）
          </div>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            @click="doUndo"
            :disabled="!canUndo"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap"
          >
            ↩️ 撤回
          </button>
          <button
            @click="doClear"
            :disabled="!canClear"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap"
          >
            🧹 清空
          </button>
          <button
            @click="doHint"
            :disabled="state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap"
          >
            💡 提示
          </button>
          <button
            @click="newGame"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-sky-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap"
          >
            🔄 重排
          </button>
          <button
            v-if="isEndless"
            @click="doGiveUp"
            :disabled="state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-rose-400/50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap"
          >
            🏳️ 结束
          </button>
          <button
            @click="restartLevel"
            class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold whitespace-nowrap"
          >
            🏁 重新挑战
          </button>
        </div>
      </div>

      <!-- 棋盘（指针拖拽连线） -->
      <div
        ref="boardRef"
        class="relative mx-auto select-none touch-none rounded-2xl board-bg-light dark:board-bg-dark shadow-inner"
        :style="boardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <!-- 数字格 -->
        <div
          class="grid w-full h-full"
          :style="{ gridTemplateColumns: `repeat(${state.size}, 1fr)`, gridTemplateRows: `repeat(${state.size}, 1fr)`, gap: gapPx }"
        >
          <button
            v-for="cell in cells"
            :key="cell.value"
            type="button"
            class="relative rounded-full border-2 flex items-center justify-center font-extrabold transition-all duration-150"
            :class="cellClass(cell)"
            :style="cellStyle(cell)"
          >
            <template v-if="isRevealed(cell)">{{ cell.value }}</template>
            <template v-else><span class="opacity-40 font-normal">·</span></template>
          </button>
        </div>

        <!-- 已连线路径 -->
        <svg
          v-if="committedPath.length > 1 || (committedPath.length > 0 && pointerPct)"
          class="absolute pointer-events-none z-20"
          :style="lineLayerStyle"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style="overflow: visible"
        >
          <polyline
            :points="linePoints"
            fill="none"
            stroke="rgba(14,165,233,0.85)"
            stroke-width="5"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
            class="chain-line"
          />
        </svg>

        <!-- 继续上次遮罩 -->
        <div
          v-if="showResume"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70 z-40"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-sky-500 dark:text-sky-300">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">
              第 {{ pendingAutosave?.level }} 关 · 已连到 {{ (pendingAutosave?.next ?? 1) - 1 }}，继续？
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-claude-md transition-all active:scale-95"
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

        <!-- 通关遮罩 -->
        <div
          v-if="showWin"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-sky-500/85 z-40"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">🎉 连完 {{ total }} 个！</div>
            <p class="opacity-90 text-white">
              用时 {{ winTimeText }} · 本关 +{{ state.lastLevelScore }} 分
              <span v-if="isNewBestTime" class="ml-2">⚡ 最快纪录！</span>
            </p>
            <p v-if="isEndless" class="opacity-90 text-white text-sm">
              无尽模式 · 第 {{ state.level }} 关 · 总分 {{ state.totalScore }}
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="showLeaderboard = true"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                🏆 排行榜
              </button>
              <button
                @click="shareResult"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                📤 分享成绩
              </button>
              <button
                v-if="isEndless"
                @click="doGiveUp"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                🏳️ 就此结算
              </button>
              <button
                @click="goNextLevel"
                class="px-5 py-2.5 rounded-xl bg-white text-sky-600 font-bold shadow-claude-md transition-all active:scale-95"
              >
                ➡️ 下一关（{{ nextSize }}×{{ nextSize }}）
              </button>
            </div>
          </div>
        </div>

        <!-- 本轮结束遮罩（无尽模式失误超限 / 主动结算） -->
        <div
          v-if="showOver"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-rose-500/85 z-40"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">🏳️ 无尽结束</div>
            <p class="opacity-95 text-white">
              通过 {{ state.clearedLevels }} 关 · 总分 {{ state.totalScore }}
            </p>
            <p class="opacity-80 text-white text-sm">
              <span v-if="overReason === 'mistakes'">失误达到 {{ ENDLESS_MAX_MISTAKES }} 次</span>
              <span v-else>已主动结算</span>
              · 最后到达第 {{ state.level }} 关（{{ state.size }}×{{ state.size }}）
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="showLeaderboard = true"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                🏆 排行榜
              </button>
              <button
                @click="shareResult"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                📤 分享成绩
              </button>
              <button
                @click="restartRun"
                class="px-5 py-2.5 rounded-xl bg-white text-rose-600 font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔁 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-3 sm:hidden">
        👆 按住 ① 拖到 ② 再到 ③…按顺序连完所有数字
      </div>
    </main>

    <footer class="max-w-xl w-full mx-auto mt-5 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <NumberChainSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="数字连连">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li>棋盘上放着 1 到 N 的数字（4×4 有 16 个、5×5 有 25 个……）。像"数字点点连线"一样，从 <strong>①</strong> 开始按顺序一路连到最大数。</li>
        <li><strong>只能连相邻的数字</strong>：下一个数必须落在当前格周围 <strong>8 格</strong>（上下左右 + 斜线）之内。棋盘保证一定存在这样一条通路，所以每关都连得完。</li>
        <li><strong>空白格</strong>：开局只显示一部分数字（简单约 70%、普通约 50%、困难约 30%，并各有保底数量），其余格子是空白的。</li>
        <li>规则是<strong>连到哪就显示到哪</strong>：你连上哪个格子，那个格子就亮出来。但下一个数藏在哪得靠自己找——<strong>不会</strong>提前显示给你。</li>
        <li>怎么找？<strong>拖过去试</strong>：对了就锁住并显示，不对会红闪并记一次失误、连不下去，换个相邻的方向再试。</li>
        <li>按住当前数字拖动，划到下一个数所在的圆点自动锁住；也可以逐个<strong>点按</strong>。连错或连到不相邻的数字会<strong>红闪提醒</strong>并记一次失误，但不断链。</li>
        <li>连错了？用 <strong>↩️ 撤回</strong>退一步，或用 <strong>🧹 清空</strong>从 ① 重连（都不影响已用时间）。</li>
        <li><strong>♾️ 无尽模式</strong>：棋盘不封顶，一路连下去，关卡越高藏得越多；失误累计 {{ ENDLESS_MAX_MISTAKES }} 次或主动点"结束"才结算总分。</li>
        <li>连完即通关，<strong>用时越快分越高</strong>；经典模式每关棋盘 +1（最多 8×8 = 64 个数字）。找不到下一个数？点 <strong>💡 提示</strong>。</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="数字连连"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { NumberChainEngine, ENDLESS_MAX_MISTAKES } from '../../game/numberchain/GameEngine'
import type { NumberChainState, NumberChainConfig, NumberChainDifficulty, ChainPoint } from '../../game/numberchain/types'
import { DIFFICULTY_LABELS, MODE_LABELS, levelSize } from '../../game/numberchain/types'
import { useNumberChainSettingsStore } from '../../stores/numberchain-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl } from '../../utils/share'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import HowToPlay from '../../components/HowToPlay.vue'
import ScoreBox from './components/ScoreBox.vue'
import NumberChainSettingsPanel from './components/NumberChainSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useNumberChainSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'numberchain'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
const showHowTo = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard'] as NumberChainDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
]

/** 通关入榜去重：每关只入一次 */
let lastSubmittedScore = -1
const isNewBestTime = ref(false)

function submitScoreIfWon() {
  if (state.totalScore === lastSubmittedScore) return
  if (state.status !== 'won' && state.status !== 'over') return
  lastSubmittedScore = state.totalScore
  leaderboard.addEntry({
    score: state.totalScore,
    difficulty: state.difficulty,
    size: state.size,
    moves: state.mistakes,
    duration: Math.round(state.elapsedMs / 1000),
    won: state.status === 'won',
  })
}

// ===== 引擎与状态 =====
const engine = shallowRef(new NumberChainEngine(settings.config))
const state = reactive<NumberChainState>(engine.value.getState())
const total = computed(() => state.size * state.size)
const progressPct = computed(() => Math.round(((state.next - 1) / total.value) * 100))
const nextSize = computed(() => levelSize(state.level + 1, state.difficulty, isEndless.value))
const difficultyLabel = computed(() => DIFFICULTY_LABELS[state.difficulty])
const modeLabel = computed(() => MODE_LABELS[state.mode])
const isEndless = computed(() => state.mode === 'endless')

/** 尚未揭示的格子数（空白格） */
const hiddenCount = computed(() => state.revealed.flat().filter((v) => !v).length)

/** 失误数接近上限时标红（仅无尽模式） */
const mistakesClass = computed(() =>
  isEndless.value && state.mistakes >= ENDLESS_MAX_MISTAKES - 3
    ? 'text-rose-500 dark:text-rose-400 font-bold'
    : '',
)

/** 撤回 / 清空可用性（链上至少 2 格） */
const canUndo = computed(() => state.status === 'playing' && state.committed.length > 1)
const canClear = computed(() => state.status === 'playing' && state.committed.length > 1)

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'numberchain'
const AUTOSAVE_VERSION = 2
type SavedState = NumberChainState & { savedAt?: number; v?: number }
const pendingAutosave = loadAutosave<SavedState>(AUTOSAVE_GAME_ID)
const showResume = ref(false)
if (pendingAutosave && pendingAutosave.status === 'playing') {
  if (pendingAutosave.v === AUTOSAVE_VERSION) showResume.value = true
  else clearAutosave(AUTOSAVE_GAME_ID)
}

function persistAutosave() {
  if (showResume.value) return
  if (state.next <= 1 && state.status === 'playing') {
    clearAutosave(AUTOSAVE_GAME_ID)
    return
  }
  saveAutosave(AUTOSAVE_GAME_ID, { v: AUTOSAVE_VERSION, ...engine.value.getState(), savedAt: Date.now() })
}

function resumeGame() {
  if (!pendingAutosave) return
  engine.value.loadState(pendingAutosave)
  if (pendingAutosave.savedAt) {
    engine.value.shiftClock(Date.now() - pendingAutosave.savedAt)
  }
  syncState()
  updateLayout()
  showResume.value = false
  sound.play('start')
}

function discardAutosave() {
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  engine.value.reset()
  syncState()
  updateLayout()
}

function onVisibilityChange() {
  if (state.status !== 'playing') return
  if (document.visibilityState === 'hidden') {
    engine.value.pauseClock()
    persistAutosave()
  } else {
    engine.value.resumeClock()
  }
}
function onPageHide() {
  if (state.status === 'playing') persistAutosave()
}

// ===== 弹窗打开时挂起计时 =====
const modalOpen = computed(() => settings.showSettings || showHowTo.value || showLeaderboard.value || showResume.value)
watch(modalOpen, (open, prev) => {
  if (state.status !== 'playing') return
  if (open && !prev) engine.value.pauseClock()
  else if (!open && prev) engine.value.resumeClock()
})

// ===== 布局 =====
const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(8)
const padding = ref(10)
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

const boardStyle = computed(() => {
  const n = state.size
  const maxW = n <= 4 ? 480 : n <= 5 ? 460 : n <= 6 ? 450 : 440
  return {
    width: '100%',
    maxWidth: `min(${maxW}px, calc(100dvh - 330px))`,
    aspectRatio: '1 / 1',
    padding: `${padding.value}px`,
  }
})

const lineLayerStyle = computed(() => ({
  top: `${padding.value}px`,
  left: `${padding.value}px`,
  right: `${padding.value}px`,
  bottom: `${padding.value}px`,
}))

const gapPx = computed(() => `${gap.value}px`)

interface Cell {
  value: number
  r: number
  c: number
}

const cells = computed<Cell[]>(() => {
  const out: Cell[] = []
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      out.push({ value: state.grid[r][c], r, c })
    }
  }
  return out
})

function cellStyle(cell: Cell): Record<string, string> {
  void cell
  return {}
}

/** 该格数字是否可见（开局显示的 + 已经连上的） */
function isRevealed(cell: Cell): boolean {
  return state.revealed[cell.r]?.[cell.c] === true
}

/** 数字按十位分色带（1-9 / 10-19 / …），既好看又辅助扫找 */
const BAND_COLORS = [
  'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-300',
  'bg-sky-100 dark:bg-sky-900/40 border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-300',
  'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-300',
  'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-300',
  'bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-300',
  'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-300',
  'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-300',
]

function bandOf(value: number): number {
  return Math.min(BAND_COLORS.length - 1, Math.floor((value - 1) / 9))
}

function cellClass(cell: Cell): string {
  const classes: string[] = []
  const revealedCell = isRevealed(cell)
  const isCommitted = state.committed.some((p) => p.r === cell.r && p.c === cell.c)
  const isLast = (() => {
    const last = state.committed[state.committed.length - 1]
    return last && last.r === cell.r && last.c === cell.c
  })()
  const isNext = revealedCell && cell.value === state.next && state.status === 'playing'

  if (revealedCell) {
    classes.push(BAND_COLORS[bandOf(cell.value)])
  } else {
    // 未知空白格：灰底 + 虚线，只露出一个"·"暗示这里藏着数字
    classes.push(
      'bg-black/5 dark:bg-white/5 border-dashed border-black/15 dark:border-white/15 text-transparent',
    )
  }

  if (isCommitted) classes.push('opacity-70 ring-2 ring-sky-400/70 scale-95')
  if (isLast) classes.push('scale-105 ring-4 ring-sky-500')
  if (revealedCell && cell.value === 1 && state.next === 1) classes.push('animate-pulse ring-4 ring-sky-400')
  if (isNext && state.next > 1) classes.push('ring-2 ring-sky-300/60')
  if (hintCell.value && hintCell.value.r === cell.r && hintCell.value.c === cell.c) {
    classes.push('animate-pulse ring-4 ring-amber-400 dark:ring-amber-500 z-10')
  }
  if (wrongCell.value && wrongCell.value.r === cell.r && wrongCell.value.c === cell.c) {
    classes.push('cell-wrong')
  }
  // 拖拽中：与当前链尾相邻的格子轻微提亮，直观提示"只能连这 8 格"
  if (engine.value.isDragging() && !isCommitted && isAdjacentToLast(cell)) {
    classes.push('ring-2 ring-sky-400/40')
  }
  return classes.join(' ')
}

/** 该格是否与当前链尾相邻（拖拽高亮用） */
function isAdjacentToLast(cell: Cell): boolean {
  const last = state.committed[state.committed.length - 1]
  if (!last) return false
  const dr = Math.abs(last.r - cell.r)
  const dc = Math.abs(last.c - cell.c)
  return dr <= 1 && dc <= 1 && (dr !== 0 || dc !== 0)
}

/** 下一目标徽章配色与该数字色带一致 */
const nextBadgeClass = computed(() => {
  if (state.status === 'won') return 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  return BAND_COLORS[bandOf(Math.min(state.next, total.value))] + ' font-extrabold'
})

function syncState() {
  const s = engine.value.getState()
  state.size = s.size
  state.grid = s.grid.map((row) => [...row])
  state.revealed = s.revealed.map((row) => [...row])
  state.next = s.next
  state.committed = s.committed.map((p) => ({ ...p }))
  state.elapsedMs = s.elapsedMs
  state.mistakes = s.mistakes
  state.status = s.status
  state.level = s.level
  state.difficulty = s.difficulty
  state.mode = s.mode
  state.totalScore = s.totalScore
  state.bestScore = s.bestScore
  state.lastLevelScore = s.lastLevelScore
  state.clearedLevels = s.clearedLevels
}

// ===== 指针拖拽 =====
const pointerPct = ref<{ x: number; y: number } | null>(null)
const wrongCell = ref<ChainPoint | null>(null)
let wrongTimer: ReturnType<typeof setTimeout> | null = null

function cellFromEvent(e: PointerEvent | MouseEvent): ChainPoint | null {
  const board = boardRef.value
  if (!board) return null
  const rect = board.getBoundingClientRect()
  const pad = padding.value
  const innerW = rect.width - pad * 2
  const innerH = rect.height - pad * 2
  const n = state.size
  const c = Math.floor(((e.clientX - rect.left - pad) / innerW) * n)
  const r = Math.floor(((e.clientY - rect.top - pad) / innerH) * n)
  if (r < 0 || r >= n || c < 0 || c >= n) return null
  return { r, c }
}

function pctFromEvent(e: PointerEvent | MouseEvent): { x: number; y: number } {
  const board = boardRef.value
  if (!board) return { x: 0, y: 0 }
  const rect = board.getBoundingClientRect()
  const pad = padding.value
  const innerW = rect.width - pad * 2
  const innerH = rect.height - pad * 2
  const x = ((e.clientX - rect.left - pad) / innerW) * 100
  const y = ((e.clientY - rect.top - pad) / innerH) * 100
  return { x: Math.max(-5, Math.min(105, x)), y: Math.max(-5, Math.min(105, y)) }
}

function flashWrong(cell: ChainPoint) {
  wrongCell.value = cell
  if (wrongTimer) clearTimeout(wrongTimer)
  wrongTimer = setTimeout(() => (wrongCell.value = null), 300)
}

function onPointerDown(e: PointerEvent) {
  if (showResume.value || showWin.value || showOver.value) return
  const cell = cellFromEvent(e)
  if (!cell) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  // 注意：这里必须问引擎要最新的 next。
  // state 是响应式副本，要等 syncState() 才更新；在它之前读 state.next 还是旧值，
  // 会让"是否锁定成功"的判断永远为假，导致音效不响。
  const before = engine.value.getState().next
  if (engine.value.startAt(cell.r, cell.c)) {
    pointerPct.value = pctFromEvent(e)
    const after = engine.value.getState().next
    if (after > before) sound.playChain(engine.value.getState().committed.length)
    syncState()
  } else {
    flashWrong(cell)
    sound.play('pause')
  }
}

function onPointerMove(e: PointerEvent) {
  if (!engine.value.isDragging()) return
  pointerPct.value = pctFromEvent(e)
  const cell = cellFromEvent(e)
  if (!cell) return
  const result = engine.value.extendTo(cell.r, cell.c)
  if (result === 'locked') {
    if (engine.value.getState().status === 'won') {
      onWin()
      return
    }
    // 连上的格子越多，音调越高（"连成一条链"的递进感）
    sound.playChain(engine.value.getState().committed.length)
  } else if (result === 'wrong') {
    flashWrong(cell)
    // 无尽模式失误超限：立刻结算
    if (engine.value.getState().status === 'over') {
      pointerPct.value = null
      onOver('mistakes')
      return
    }
  }
  syncState()
}

function onPointerUp() {
  if (!engine.value.isDragging()) return
  engine.value.endDrag()
  pointerPct.value = null
  syncState()
  persistAutosave()
}

// ===== 连线绘制 =====
const committedPath = computed(() => state.committed)

function pctOfCell(p: ChainPoint): { x: number; y: number } {
  const n = state.size
  const g = gap.value
  const board = boardRef.value
  if (!board) return { x: ((p.c + 0.5) / n) * 100, y: ((p.r + 0.5) / n) * 100 }
  const innerW = board.clientWidth - padding.value * 2
  const innerH = board.clientHeight - padding.value * 2
  const cellW = (innerW - g * (n - 1)) / n
  const cellH = (innerH - g * (n - 1)) / n
  const x = ((cellW * p.c + cellW / 2 + g * p.c) / innerW) * 100
  const y = ((cellH * p.r + cellH / 2 + g * p.r) / innerH) * 100
  return { x, y }
}

const linePoints = computed(() => {
  const pts = committedPath.value.map((p) => pctOfCell(p))
  if (pointerPct.value && engine.value.isDragging()) pts.push(pointerPct.value)
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
})

// ===== 计时显示 =====
const now = ref(Date.now())
const elapsedText = computed(() => {
  // 依赖 now，定时器刷新才会驱动本 computed 重算
  void now.value
  const ms = state.status === 'playing' ? engine.value.elapsed() : state.elapsedMs
  const s = ms / 1000
  return s >= 60 ? `${Math.floor(s / 60)}分${Math.round(s % 60)}秒` : `${s.toFixed(1)}s`
})

const winTimeText = computed(() => {
  const s = state.elapsedMs / 1000
  return s >= 60 ? `${Math.floor(s / 60)}分${(s % 60).toFixed(1)}秒` : `${s.toFixed(1)}s`
})

// ===== 提示 =====
const hintCell = ref<ChainPoint | null>(null)
let hintTimer: ReturnType<typeof setTimeout> | null = null

function doHint() {
  if (state.status !== 'playing') return
  hintCell.value = engine.value.nextTarget()
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => (hintCell.value = null), 2200)
  sound.play('click')
}

// ===== 撤回 / 清空 =====
function doUndo() {
  if (!engine.value.undo()) return
  syncState()
  hintCell.value = null
  sound.play('click')
  persistAutosave()
}

function doClear() {
  if (!engine.value.clearChain()) return
  syncState()
  hintCell.value = null
  sound.play('pause')
  persistAutosave()
}

// ===== 通关 / 结束 / 关卡 =====
const showWin = ref(false)
const showOver = ref(false)
const overReason = ref<'mistakes' | 'giveup'>('giveup')
let winTimer: ReturnType<typeof setTimeout> | null = null

function resetOverlays() {
  showWin.value = false
  showOver.value = false
  isNewBestTime.value = false
}

function onWin() {
  syncState()
  sound.play('win')
  // 稍作停顿展示连完的完整线路，再弹结算
  if (winTimer) clearTimeout(winTimer)
  winTimer = setTimeout(() => {
    // 历史最快纪录对比（引擎在 finishWin 已写入，读旧值需比较：这里用展示标记即可）
    isNewBestTime.value = true
    showWin.value = true
    submitScoreIfWon()
  }, 700)
  clearAutosave(AUTOSAVE_GAME_ID)
}

/** 无尽模式失误超限：拖动中被引擎置为 over，这里补弹结算 */
function onOver(reason: 'mistakes' | 'giveup') {
  overReason.value = reason
  showWin.value = false
  showOver.value = true
  syncState()
  sound.play('over')
  submitScoreIfWon()
  clearAutosave(AUTOSAVE_GAME_ID)
}

function doGiveUp() {
  if (state.status !== 'playing') return
  engine.value.giveUp()
  onOver('giveup')
}

/** 无尽模式：从头开始一整轮 */
function restartRun() {
  resetOverlays()
  engine.value.restartRun()
  syncState()
  updateLayout()
  hintCell.value = null
  lastSubmittedScore = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  sound.play('start')
}

function goNextLevel() {
  showWin.value = false
  isNewBestTime.value = false
  engine.value.nextLevel()
  syncState()
  updateLayout()
  hintCell.value = null
  sound.play('start')
}

function restartLevel() {
  resetOverlays()
  engine.value.reset()
  syncState()
  hintCell.value = null
  lastSubmittedScore = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  sound.play('start')
}

function newGame() {
  engine.value.reset()
  syncState()
  hintCell.value = null
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  resetOverlays()
  sound.play('start')
}

function applySettings(config: NumberChainConfig) {
  engine.value = new NumberChainEngine(config)
  syncState()
  updateLayout()
  hintCell.value = null
  resetOverlays()
  lastSubmittedScore = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

async function shareResult() {
  const who = isEndless.value
    ? `在无尽模式闯过 ${state.clearedLevels} 关、拿到 ${state.totalScore} 分`
    : `用 ${winTimeText.value} 连完了第 ${state.level} 关（${state.size}×${state.size} 共 ${total.value} 个数字）`
  const result = await shareOrCopy({
    text: `我在 EasyGame 数字连连${who}，来挑战我！🔢`,
    url: shareUrl('/game/numberchain'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

// ===== 响应式 gap/padding =====
const GAP_TABLE: Record<'mobile' | 'tablet' | 'desktop', Record<number, number>> = {
  mobile:  { 4: 8, 5: 7, 6: 6, 7: 5, 8: 4 },
  tablet:  { 4: 10, 5: 9, 6: 8, 7: 7, 8: 6 },
  desktop: { 4: 12, 5: 10, 6: 9, 7: 8, 8: 7 },
}

function updateLayout() {
  const w = window.innerWidth
  const tier: 'mobile' | 'tablet' | 'desktop' = w < 480 ? 'mobile' : w < 768 ? 'tablet' : 'desktop'
  const table = GAP_TABLE[tier]
  // 超过 8×8（无尽模式）时逐档收窄间距，避免格子挤成一团
  const size = state.size
  const g = size > 8 ? Math.max(2, (table[8] ?? 6) - (size - 8)) : (table[size] ?? table[8])
  gap.value = g
  padding.value = g + 4
  windowHeight.value = window.innerHeight
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateLayout()
  syncState()
  window.addEventListener('resize', updateLayout)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  timer = setInterval(() => {
    now.value = Date.now()
  }, 200)
})

onBeforeUnmount(() => {
  if (state.status === 'playing' && state.next > 1) persistAutosave()
  if (timer) clearInterval(timer)
  if (wrongTimer) clearTimeout(wrongTimer)
  if (hintTimer) clearTimeout(hintTimer)
  if (winTimer) clearTimeout(winTimer)
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
/* 按错的格子红闪 */
.cell-wrong {
  animation: wrongShake 0.3s ease-in-out;
  border-color: rgb(244 63 94 / 0.95) !important;
  background: rgb(254 226 226 / 0.9) !important;
}
.dark .cell-wrong {
  background: rgb(127 29 29 / 0.5) !important;
}
@keyframes wrongShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10%); }
  75% { transform: translateX(10%); }
}
/* 连线微光 */
.chain-line {
  filter: drop-shadow(0 0 4px rgba(14, 165, 233, 0.6));
}
</style>

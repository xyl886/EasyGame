<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-md w-full mx-auto flex items-center justify-between mb-4">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-pink-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">✨ 消消乐</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-pink-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-pink-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="设置"
        >
          ⚙️
        </button>
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- 游戏主体（窄高竖条：棋盘占满宽度，图案做大） -->
    <main class="max-w-md w-full mx-auto flex-1 flex flex-col">
      <!-- 分数面板（紧凑单行） -->
      <div class="flex items-center justify-between mb-3 gap-3">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light dark:text-text-dark">
            消消乐
          </h1>
          <p class="text-[11px] opacity-70 mt-0.5 text-text-muted-light dark:text-text-muted-dark">
            第 {{ state.level }} 关 · {{ difficultyLabel }} · {{ state.rows }}×{{ state.cols }}
            <span v-if="state.bestScore > 0"> · 最高 {{ state.bestScore }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="目标" :value="state.targetScore" />
          <ScoreBox label="得分" :value="state.score" accent />
        </div>
      </div>

      <!-- 进度 + 步数 -->
      <div class="flex items-center gap-3 mb-3">
        <div class="flex-1 h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-300"
            :style="{ width: `${progressPct}%` }"
          ></div>
        </div>
        <div class="text-xs font-semibold tabular-nums text-text-light dark:text-text-dark whitespace-nowrap">
          {{ state.score }} / {{ state.targetScore }}
        </div>
        <div class="text-xs font-bold tabular-nums" :class="state.movesLeft <= 5 ? 'text-red-500' : 'text-text-light dark:text-text-dark'">
          ⏳ {{ state.movesLeft }} 步
        </div>
      </div>

      <!-- 操作按钮（单行紧凑） -->
      <div class="flex items-center justify-between mb-3 gap-2">
        <div class="flex items-center gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-pink-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ❓ 玩法
          </button>
          <div class="hidden sm:flex items-center gap-1 text-xs opacity-70 text-text-muted-light dark:text-text-muted-dark">
            <span>⏱</span><span>{{ elapsedText }}</span>
            <span v-if="state.maxCombo > 1" class="ml-1 text-amber-500">🔥 {{ state.maxCombo }} 连</span>
          </div>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            @click="doUndo"
            :disabled="showResume || !canUndoNow || animating || state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-pink-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            ↩️ 撤销{{ state.undoLeft > 0 ? `(${state.undoLeft})` : '' }}
          </button>
          <button
            @click="doHint"
            :disabled="showResume || state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-pink-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            💡 提示
          </button>
          <button
            @click="doReshuffle"
            :disabled="showResume || state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-pink-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            🔀 洗牌
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-pink-400 hover:bg-pink-500 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>

      <!-- 棋盘 -->
      <div
        ref="boardRef"
        class="relative mx-auto select-none touch-none w-full max-w-[420px] rounded-2xl board-bg-light dark:board-bg-dark shadow-inner"
        :style="boardStyle"
      >
        <!-- 背景格（grid 固定层） -->
        <div
          class="grid w-full h-full"
          :style="{ gridTemplateColumns: `repeat(${state.cols}, 1fr)`, gridTemplateRows: `repeat(${state.rows}, 1fr)`, gap: gapPx }"
        >
          <div
            v-for="i in state.rows * state.cols"
            :key="i - 1"
            class="rounded-md cell-bg-light dark:cell-bg-dark"
          ></div>
        </div>

        <!-- 图案层（绝对定位 + 滑动过渡；容器点击事件委托计算格子；overflow 裁剪顶部滑入的新图案） -->
        <div class="absolute inset-0 overflow-hidden" :style="tileLayerStyle" @click="onLayerClick">
          <div
            v-for="t in displayTiles"
            :key="t.key"
            class="absolute flex items-center justify-center rounded-md border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude-md"
            :class="[t.isPop ? 'cell-pop' : '', t.isNew ? 'tile-drop-new' : '', t.special ? 'tile-special' : '', t.isShake ? 'tile-shake' : '', cursorClass(t.r, t.c)]"
            :style="tilePosStyle(t)"
          >
            <span class="leading-none" :style="tileFontStyle">{{ t.emoji }}</span>
          </div>
        </div>

        <!-- 继续上次遮罩 -->
        <div
          v-if="showResume && state.status === 'playing'"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-pink-500 dark:text-pink-300">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">
              {{ pendingAutosave?.score ?? state.score }} 分 · 剩 {{ pendingAutosave?.movesLeft ?? state.movesLeft }} 步，继续？
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold shadow-claude-md transition-all active:scale-95"
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
          v-if="state.status === 'won'"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-pink-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">🎉 通关成功！</div>
            <p class="opacity-90 text-white">
              {{ state.score }} 分 · 剩 {{ state.movesLeft }} 步 · {{ elapsedText }}
              <span v-if="state.maxCombo > 1" class="ml-2">🔥 {{ state.maxCombo }} 连</span>
              <span v-if="isNewBest" class="ml-2">🏅 新纪录！</span>
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
                @click="nextLevel"
                class="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                ➡️ 下一关
              </button>
              <button
                @click="newGame"
                class="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>

        <!-- 失败遮罩 -->
        <div
          v-if="state.status === 'lost'"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-slate-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">💤 步数用尽</div>
            <p class="opacity-90 text-white">
              {{ state.score }} 分 · 差 {{ Math.max(0, state.targetScore - state.score) }} 分达标
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="newGame"
                class="px-6 py-2.5 rounded-xl bg-white text-pink-600 font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-4 sm:hidden">
        👆 点击相邻两个图案交换，连成 3 个及以上相同即消除 · PC 可用方向键 + 空格
      </div>
    </main>

    <footer class="max-w-md w-full mx-auto mt-5 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <EliminateSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="消消乐">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li>点击一个图案选中，再点其<strong>上下左右相邻</strong>的图案交换位置（PC 可用方向键移动光标 + 空格）。</li>
        <li>交换后横向或纵向出现 <strong>3 个及以上</strong>相同图案即消除得分；<strong>未消除则自动还原，不消耗步数</strong>。</li>
        <li>消除后上方图案<strong>下落</strong>、新图案从顶部补入，可能引发<strong>连锁（连击）</strong>，连锁分数成倍增长。</li>
        <li>凑成 <strong>4 连</strong>生成 💣 炸弹：与相邻图案交换即引爆，炸掉周围 3×3；凑成 <strong>5 连</strong>生成 🌈 彩虹：与任意相邻图案交换，消除全盘该颜色。特殊格清除的每个图案另有加分。</li>
        <li>在有限步数内达到目标分数即<strong>获胜</strong>；步数用尽仍未达标则失败。</li>
        <li>卡住时用 <strong>💡 提示</strong> 高亮可行交换，或 <strong>🔀 洗牌</strong> 重排；无可行交换时会自动洗牌。</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="消消乐"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { EliminateEngine } from '../../game/eliminate/GameEngine'
import type { EliminateState, EliminateConfig, EliminateDifficulty } from '../../game/eliminate/types'
import { DIFFICULTY_LABELS, ELIMINATE_POOL, SPECIAL_EMOJI, isSpecial, specialType, deriveLevelParams } from '../../game/eliminate/types'
import { useEliminateSettingsStore } from '../../stores/eliminate-settings'
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
import EliminateSettingsPanel from './components/EliminateSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useEliminateSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'eliminate'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
const showHowTo = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard'] as EliminateDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
]
let lastSubmittedScore = -1
const isNewBest = ref(false)

function submitScoreIfWon() {
  if (state.status !== 'won') return
  if (state.level > 1) return
  if (state.score === lastSubmittedScore) return
  lastSubmittedScore = state.score
  const duration = Math.floor((Date.now() - state.startTime) / 1000)
  leaderboard.addEntry({
    score: state.score,
    difficulty: state.difficulty,
    size: state.rows,
    moves: state.movesLeft,
    duration,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'eliminate'
// 存档格式版本：数值/规则调参后 +1，旧版本存档直接作废（避免旧目标分毒害新对局）
const AUTOSAVE_VERSION = 2
type SavedEliminateState = EliminateState & { savedAt?: number; v?: number }
const pendingAutosave = loadAutosave<SavedEliminateState>(AUTOSAVE_GAME_ID)
const showResume = ref(false)
if (pendingAutosave && pendingAutosave.status === 'playing') {
  if (pendingAutosave.v === AUTOSAVE_VERSION) showResume.value = true
  else clearAutosave(AUTOSAVE_GAME_ID)
}

/** 是否有真实进度（一步未走的全新对局不值得续档） */
function hasProgress(): boolean {
  const initialMoves = deriveLevelParams(state.level, state.difficulty).moves
  return state.score > 0 || state.cleared > 0 || state.movesLeft < initialMoves
}

function persistAutosave() {
  // 有未处理的续档遮罩时禁止落盘：此时引擎是全新对局，覆写会毁掉玩家的存档进度
  if (showResume.value) return
  if (!hasProgress()) {
    clearAutosave(AUTOSAVE_GAME_ID)
    return
  }
  saveAutosave(AUTOSAVE_GAME_ID, { v: AUTOSAVE_VERSION, ...engine.value.getState(), savedAt: Date.now() })
}

function resumeGame() {
  if (!pendingAutosave) return
  animating.value = false
  engine.value.loadState(pendingAutosave)
  // 用存档时间戳校正"已用时"，剔除离开页面的时长
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
  animating.value = false
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

// ===== 引擎与状态 =====
const engine = shallowRef(new EliminateEngine(settings.config))
const state = reactive<EliminateState>(engine.value.getState())
const now = ref(Date.now())

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(5)
const padding = ref(6)
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

const boardStyle = computed(() => {
  // 纵向棋盘（行多列少，接近 16:9）：高度优先撑满可用空间，宽度按 列/行 比例
  // 高度预算：顶栏/分数/进度/按钮/底部提示与页脚合计约 340px，保证一屏完整显示棋盘
  return {
    width: 'auto',
    maxWidth: '100%',
    height: 'min(calc(100dvh - 340px), 700px)',
    aspectRatio: `${state.cols} / ${state.rows}`,
    padding: `${padding.value}px`,
    margin: '0 auto',
  }
})

const gapPx = computed(() => `${gap.value}px`)

const difficultyLabel = computed(() => DIFFICULTY_LABELS[state.difficulty] ?? DIFFICULTY_LABELS[settings.config.difficulty])

const themePool = computed(() => ELIMINATE_POOL[state.theme] ?? ELIMINATE_POOL.gem)

const wonElapsed = ref(0)
const elapsedText = computed(() => {
  const sec = state.status === 'won' ? wonElapsed.value : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

const progressPct = computed(() => {
  if (state.targetScore <= 0) return 0
  return Math.min(100, Math.round((state.score / state.targetScore) * 100))
})

/** 最近消除的格子（爆发动画） */
const popCells = ref<Set<string>>(new Set())
let popTimer: ReturnType<typeof setTimeout> | null = null
/** 无效交换抖动的两格 */
const shakeCells = ref<Set<string>>(new Set())
let shakeTimer: ReturnType<typeof setTimeout> | null = null
/** 连锁动画播放中（防快速连点竞态） */
const animating = ref(false)

// ===== 在途动画取消（组件卸载 / 重开局时失效旧 Promise） =====
let animToken = 0
const animRafIds = new Set<number>()
const animSleepResolvers = new Map<ReturnType<typeof setTimeout>, () => void>()

function trackRaf(cb: FrameRequestCallback): number {
  const id = requestAnimationFrame(cb)
  animRafIds.add(id)
  return id
}

function animSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      animSleepResolvers.delete(id)
      resolve()
    }, ms)
    animSleepResolvers.set(id, resolve)
  })
}

/** 开启新一轮动画，使仍在途的旧动画 step 变为失效 */
function beginAnim(): number {
  animToken++
  return animToken
}

function isAnimStale(token: number): boolean {
  return token !== animToken
}

function cancelAllAnims() {
  animToken++
  for (const id of animRafIds) cancelAnimationFrame(id)
  animRafIds.clear()
  for (const [id, resolve] of animSleepResolvers) {
    clearTimeout(id)
    resolve()
  }
  animSleepResolvers.clear()
  animating.value = false
  animTiles.value = []
  popCells.value = new Set()
}

// ===== 图案层渲染（绝对定位 + 滑动过渡） =====
interface AnimTile {
  key: string
  emoji: string
  /** 当前渲染位置（行/列） */
  r: number
  c: number
  isPop?: boolean
  isNew?: boolean
  isShake?: boolean
  /** 是否为特殊格（炸弹/彩虹） */
  special?: boolean
}

/** 图案层内边距与棋盘 padding 一致 */
const tileLayerStyle = computed(() => ({
  top: `${padding.value}px`,
  left: `${padding.value}px`,
  right: `${padding.value}px`,
  bottom: `${padding.value}px`,
}))

/** 格子定位样式：百分比定位 + 滑动过渡（宽按列数、高按行数） */
function tilePosStyle(t: AnimTile): Record<string, string> {
  const cols = state.cols
  const rows = state.rows
  const g = gap.value
  const cellW = `calc((100% - ${g * (cols - 1)}px) / ${cols})`
  const cellH = `calc((100% - ${g * (rows - 1)}px) / ${rows})`
  return {
    left: `calc(${cellW} * ${t.c} + ${g * t.c}px)`,
    top: `calc(${cellH} * ${t.r} + ${g * t.r}px)`,
    width: cellW,
    height: cellH,
    transition: 'top 0.28s cubic-bezier(0.33, 1, 0.68, 1), left 0.28s cubic-bezier(0.33, 1, 0.68, 1)',
  }
}

/** 图案字号随棋盘自适应（格子越小字越小，按行/列中较小维度） */
const tileFontStyle = computed(() => {
  const rows = state.rows
  const cols = state.cols
  const boardH = Math.min(windowHeight.value - 340, 700)
  // 格子高度 = (棋盘高 - padding×2) / 行数
  const cellH = (boardH * (1 - 2 * 0.02)) / rows
  const baseVmin = (92 / Math.max(rows, cols)) * 0.6
  return {
    fontSize: `min(${(cellH * 0.6).toFixed(1)}px, ${baseVmin.toFixed(2)}vmin)`,
  }
})

/** 选中/提示/光标高亮 class */
function cursorClass(r: number, c: number): string {
  const classes: string[] = []
  const sel = state.selected
  if (sel && sel.r === r && sel.c === c) {
    classes.push('ring-2 ring-pink-400 border-pink-400 scale-105 z-10')
  }
  const hint = state.hint
  if (hint && ((hint.r1 === r && hint.c1 === c) || (hint.r2 === r && hint.c2 === c))) {
    classes.push('ring-2 ring-amber-400 border-amber-400')
  }
  if (cursor.value && cursor.value.r === r && cursor.value.c === c) {
    classes.push('ring-2 ring-inset ring-sky-400 z-10')
  }
  return classes.join(' ')
}

/** 当前显示的图案列表：优先动画层，否则按 state.grid 渲染 */
const displayTiles = computed<AnimTile[]>(() => {
  if (animTiles.value.length > 0) return animTiles.value
  const rows = state.rows
  const cols = state.cols
  const tiles: AnimTile[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = state.grid[r][c]
      if (v === 0) continue
      tiles.push({
        key: `g${r}-${c}`,
        emoji: isSpecial(v) ? SPECIAL_EMOJI[specialType(v) ?? 'bomb'] : (themePool.value[v - 1] ?? '❔'),
        r,
        c,
        isPop: popCells.value.has(`${r},${c}`),
        isShake: shakeCells.value.has(`${r},${c}`),
        special: isSpecial(v),
      })
    }
  }
  return tiles
})

/** 动画层 tiles（消除→下落过程中使用）；空数组 = 无动画 */
const animTiles = ref<AnimTile[]>([])

function onCellClick(idx: number) {
  if (showResume.value) return
  if (animating.value) return
  if (engine.value.getState().status !== 'playing') return
  const r = Math.floor(idx / state.cols)
  const c = idx % state.cols
  const moved = engine.value.move({ r, c })
  if (!moved) return
  // 无效交换：不耗步，抖动两格 + 提示音
  const invalid = engine.value.lastSwapInvalid
  if (invalid) {
    const keys = new Set([`${invalid.r1},${invalid.c1}`, `${invalid.r2},${invalid.c2}`])
    shakeCells.value = keys
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => (shakeCells.value = new Set()), 420)
    sound.play('pause')
    syncState()
    return
  }
  // 连锁动画起始分数（逐步累加每步 gained）
  const startScore = state.score
  // 读取本次消除的连锁步骤（含下落后的逐步棋盘）
  const cascade = engine.value.lastCascade
  if (cascade.length > 0) {
    // 有效普通交换：先补播两格滑动交换动画（引擎不保留交换前状态，视图自行还原），
    // 否则连锁首步会在"交换前"的棋盘上取格，炸掉错颜色的图案
    const sw = engine.value.lastSwap
    const token = beginAnim()
    void (async () => {
      animating.value = true
      if (sw) {
        sound.play('move')
        const g = await playSwapAnimation(sw, token)
        if (isAnimStale(token)) return
        state.grid = g
      }
      if (isAnimStale(token)) return
      await playCascade(cascade, startScore, token)
    })()
  } else {
    // 无消除：正常同步
    syncState()
    sound.play('click')
    finishTurn()
  }
}

/**
 * 播放两格滑动交换动画：整盘图案先按当前位置渲染进动画层，
 * 下一帧互换两格的目标位置触发滑动；结束后返回内容互换的棋盘供连锁动画使用。
 */
function playSwapAnimation(
  sw: { r1: number; c1: number; r2: number; c2: number },
  token: number,
): Promise<number[][]> {
  return new Promise((resolve) => {
    if (isAnimStale(token)) {
      resolve(state.grid)
      return
    }
    const tiles: AnimTile[] = []
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const v = state.grid[r][c]
        if (v === 0) continue
        const sp = specialType(v)
        tiles.push({
          key: `s${r}-${c}`,
          emoji: sp ? SPECIAL_EMOJI[sp] : (themePool.value[v - 1] ?? '❔'),
          r,
          c,
          special: !!sp,
        })
      }
    }
    animTiles.value = tiles
    trackRaf(() => {
      if (isAnimStale(token)) return
      trackRaf(() => {
        if (isAnimStale(token)) return
        animTiles.value = animTiles.value.map((t) => {
          if (t.key === `s${sw.r1}-${sw.c1}`) return { ...t, r: sw.r2, c: sw.c2 }
          if (t.key === `s${sw.r2}-${sw.c2}`) return { ...t, r: sw.r1, c: sw.c1 }
          return t
        })
      })
    })
    void animSleep(300).then(() => {
      if (isAnimStale(token)) {
        resolve(state.grid)
        return
      }
      const g = state.grid.map((row) => [...row])
      const v1 = g[sw.r1][sw.c1]
      g[sw.r1][sw.c1] = g[sw.r2][sw.c2]
      g[sw.r2][sw.c2] = v1
      resolve(g)
    })
  })
}

/** 图案层点击事件委托：根据点击坐标计算格子索引 */
function onLayerClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const cols = state.cols
  const rows = state.rows
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const c = Math.min(cols - 1, Math.max(0, Math.floor((x / rect.width) * cols)))
  const r = Math.min(rows - 1, Math.max(0, Math.floor((y / rect.height) * rows)))
  onCellClick(r * cols + c)
}

/** 逐帧播放连锁：每步 pop → 滑动下落 → 进入下一步 */
async function playCascade(
  cascade: Array<{ matched: string[]; gained: number; gridAfter: number[][] }>,
  startScore: number,
  token: number,
) {
  animating.value = true
  // prevGrid 只读引用；gridAfter 为引擎快照，视图不原地改写
  let prevGrid = state.grid
  let score = startScore
  try {
    for (let i = 0; i < cascade.length; i++) {
      if (isAnimStale(token)) return
      const step = cascade[i]
      const matchedSet = new Set(step.matched)
      score += step.gained
      state.score = score
      // 阶段1：pop 被消格（棋盘 = 上一步下落后的 prevGrid）
      animTiles.value = []
      if (state.grid !== prevGrid) state.grid = prevGrid
      popCells.value = matchedSet
      sound.play('line')
      await animSleep(300)
      if (isAnimStale(token)) return
      // 阶段2：直接由 prevGrid + matched 推下落，省一整盘 emptyGrid 拷贝
      buildFallTiles(prevGrid, matchedSet, step.gridAfter, token)
      popCells.value = new Set()
      await animSleep(320)
      if (isAnimStale(token)) return
      prevGrid = step.gridAfter
      state.grid = prevGrid
      // 进入下一步前清动画层，由 displayTiles 兜底渲染（此时 state.grid=prevGrid）
      animTiles.value = []
    }
  } finally {
    if (!isAnimStale(token)) {
      animating.value = false
      syncState()
      finishTurn()
    }
  }
}

/** 计算并设置下落动画 tiles：幸存图案从原位置滑到目标位置，新图案从顶部滑入 */
function buildFallTiles(
  prevGrid: number[][],
  matchedSet: Set<string>,
  afterGrid: number[][],
  token: number,
) {
  const rows = state.rows
  const cols = state.cols
  const tiles: AnimTile[] = []
  for (let c = 0; c < cols; c++) {
    // 消除后、下落前的幸存者（自底向上；matched 视为空）
    const emptyCol: Array<{ v: number; r: number }> = []
    for (let r = rows - 1; r >= 0; r--) {
      if (matchedSet.has(`${r},${c}`)) continue
      const v = prevGrid[r][c]
      if (v !== 0) emptyCol.push({ v, r })
    }
    // 目标列非空值（自底向上）
    const afterCol: number[] = []
    for (let r = rows - 1; r >= 0; r--) {
      if (afterGrid[r][c] !== 0) afterCol.push(afterGrid[r][c])
    }
    // 幸存者：底部 survivors 个（顺序保持）；目标行 = rows-1-i
    emptyCol.forEach((t, i) => {
      const targetR = rows - 1 - i
      // 目标位若已生成特殊格（炸弹/彩虹），滑动过程中即显示特殊图案
      const afterV = afterGrid[targetR]?.[c] ?? t.v
      const sp = specialType(afterV)
      tiles.push({
        key: `f${c}-${i}`,
        emoji: sp ? SPECIAL_EMOJI[sp] : (themePool.value[t.v - 1] ?? '❔'),
        r: t.r, // 先渲染原位置
        c,
        special: !!sp,
      })
    })
    // 新图案：目标行 = rows-1-i，从顶部（-1）滑入
    for (let i = emptyCol.length; i < afterCol.length; i++) {
      tiles.push({
        key: `n${c}-${i}`,
        emoji: themePool.value[afterCol[i] - 1] ?? '❔',
        r: -1, // 顶部外
        c,
        isNew: true,
      })
    }
  }
  // 先渲染旧位置（r=原位置/-1），下一帧切换为目标位置触发滑动
  animTiles.value = tiles
  trackRaf(() => {
    if (isAnimStale(token)) return
    trackRaf(() => {
      if (isAnimStale(token)) return
      animTiles.value = animTiles.value.map((t) => {
        // 从 key 解析列内序号 i，目标行 = rows-1-i
        const m = /[fn](\d+)-(\d+)/.exec(t.key)
        const i = m ? Number(m[2]) : -1
        return { ...t, r: i >= 0 ? rows - 1 - i : t.r }
      })
    })
  })
}

/** 消除/无消除后的统一结算（胜利/失败/存档） */
function finishTurn() {
  const status = engine.value.getState().status
  if (status === 'won') {
    wonElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
    sound.play('win')
    clearAutosave(AUTOSAVE_GAME_ID)
    submitScoreIfWon()
  } else if (status === 'lost') {
    sound.play('over')
    clearAutosave(AUTOSAVE_GAME_ID)
  } else {
    persistAutosave()
  }
}

function doHint() {
  if (state.status !== 'playing') return
  if (animating.value || showResume.value) return
  if (engine.value.hintNow()) {
    syncState()
    sound.play('start')
    toast('💡 高亮的这两格交换即可消除')
  } else {
    toast('当前无可行交换，建议洗牌')
  }
}

function doReshuffle() {
  if (state.status !== 'playing') return
  if (animating.value || showResume.value) return
  engine.value.reshuffle()
  syncState()
  sound.play('rotate')
  toast('🔀 已洗牌')
}

function doUndo() {
  if (state.status !== 'playing') return
  if (animating.value || showResume.value) return
  if (engine.value.undo()) {
    syncState()
    sound.play('click')
    persistAutosave()
  }
}

/** 是否真的可撤销（恢复存档后历史栈为空，仅看 undoLeft 会误判可用） */
const canUndoNow = ref(false)

function syncState() {
  const s = engine.value.getState()
  state.rows = s.rows
  state.cols = s.cols
  state.grid = s.grid.map((row) => [...row])
  state.selected = s.selected ? { ...s.selected } : null
  state.hint = s.hint ? { ...s.hint } : null
  state.score = s.score
  state.bestScore = s.bestScore
  state.movesLeft = s.movesLeft
  state.cleared = s.cleared
  state.maxCombo = s.maxCombo
  state.star = s.star
  state.targetScore = s.targetScore
  state.startTime = s.startTime
  state.status = s.status
  state.difficulty = s.difficulty
  state.theme = s.theme
  state.level = s.level
  state.undoLeft = s.undoLeft
  canUndoNow.value = engine.value.canUndo()
}

function newGame() {
  cancelAllAnims()
  if (popTimer) clearTimeout(popTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeCells.value = new Set()
  cursor.value = null
  engine.value.reset()
  syncState()
  lastSubmittedScore = -1
  isNewBest.value = false
  wonElapsed.value = 0
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  sound.play('start')
}

function nextLevel() {
  cancelAllAnims()
  if (popTimer) clearTimeout(popTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeCells.value = new Set()
  cursor.value = null
  engine.value.nextLevel()
  syncState()
  updateLayout()
  lastSubmittedScore = -1
  isNewBest.value = false
  wonElapsed.value = 0
  clearAutosave(AUTOSAVE_GAME_ID)
  sound.play('start')
}

function applySettings(config: EliminateConfig) {
  cancelAllAnims()
  if (popTimer) clearTimeout(popTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeCells.value = new Set()
  cursor.value = null
  engine.value = new EliminateEngine(config)
  syncState()
  updateLayout()
  lastSubmittedScore = -1
  isNewBest.value = false
  wonElapsed.value = 0
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

async function shareResult() {
  const result = await shareOrCopy({
    text: `我在 EasyGame 消消乐拿了 ${state.score} 分通关「${DIFFICULTY_LABELS[state.difficulty]}」，剩 ${state.movesLeft} 步，来挑战我！✨`,
    url: shareUrl('/game/eliminate'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

// ===== 布局 =====
function updateLayout() {
  // 纵向棋盘：格子更大，gap 随列数调整
  gap.value = state.cols <= 5 ? 6 : state.cols <= 7 ? 5 : 4
  padding.value = gap.value + 3
  windowHeight.value = window.innerHeight
}

// ===== 键盘操作（方向键移动光标 + 空格/回车选择交换） =====
const cursor = ref<{ r: number; c: number } | null>(null)

function onKeydown(e: KeyboardEvent) {
  if (settings.showSettings || showLeaderboard.value || showHowTo.value) return
  const map: Record<string, [number, number]> = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    w: [-1, 0], W: [-1, 0], s: [1, 0], S: [1, 0], a: [0, -1], A: [0, -1], d: [0, 1], D: [0, 1],
  }
  const k = e.key
  if (map[k]) {
    e.preventDefault()
    if (showResume.value) {
      resumeGame()
      return
    }
    if (engine.value.getState().status !== 'playing') return
    const cur = cursor.value ?? { r: Math.floor(state.rows / 2), c: Math.floor(state.cols / 2) }
    const nr = cur.r + map[k][0]
    const nc = cur.c + map[k][1]
    if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
      cursor.value = { r: nr, c: nc }
      sound.play('move')
    }
    return
  }
  if (k === ' ' || k === 'Enter') {
    e.preventDefault()
    // 焦点在按钮上时先移除，防止空格/回车原生激活造成双重操作
    const active = document.activeElement as HTMLElement | null
    if (active && active.tagName === 'BUTTON') active.blur()
    if (showResume.value) {
      resumeGame()
      return
    }
    if (!cursor.value) return
    if (engine.value.getState().status !== 'playing') return
    onCellClick(cursor.value.r * state.cols + cursor.value.c)
    return
  }
  if (k === 'Escape') {
    cursor.value = null
  }
}

// ===== 弹窗打开时暂停用时统计（设置/玩法/排行榜/续档遮罩） =====
const modalOpen = computed(() => settings.showSettings || showHowTo.value || showLeaderboard.value || showResume.value)
watch(modalOpen, (open, prev) => {
  if (state.status !== 'playing') return
  if (open && !prev) engine.value.pauseClock()
  else if (!open && prev) engine.value.resumeClock()
})

// ===== 计时器 =====
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateLayout()
  syncState()
  if (state.status === 'won') {
    submitScoreIfWon()
  }
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updateLayout)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  timer = setInterval(() => {
    now.value = Date.now()
  }, 500)
})

onBeforeUnmount(() => {
  if (state.status === 'playing') persistAutosave()
  cancelAllAnims()
  if (timer) clearInterval(timer)
  if (popTimer) clearTimeout(popTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
@keyframes cellPop {
  0% {
    transform: scale(0.3);
    opacity: 1;
  }
  70% {
    transform: scale(1.3);
    opacity: 0.7;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}
.cell-pop {
  animation: cellPop 0.35s ease-out forwards;
}
/* 新补图案从顶部滑入（淡入 + 轻微放大） */
@keyframes tileDropIn {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.tile-drop-new {
  animation: tileDropIn 0.3s ease-out;
}
/* 无效交换抖动 */
@keyframes tileShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-9%) rotate(-3deg); }
  40% { transform: translateX(9%) rotate(3deg); }
  60% { transform: translateX(-7%) rotate(-2deg); }
  80% { transform: translateX(7%) rotate(2deg); }
}
.tile-shake {
  animation: tileShake 0.4s ease-in-out;
  border-color: rgb(244 63 94 / 0.7) !important;
}
/* 特殊格子光晕 */
.tile-special {
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
  background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(236,72,153,0.2));
}
/* 爆炸动画 */
@keyframes explode {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.8; }
  100% { transform: scale(0); opacity: 0; }
}
.cell-explode {
  animation: explode 0.4s ease-out forwards;
}
</style>

<template>
  <div class="eg-shell">
    <!-- 顶部栏 -->
    <header class="max-w-md w-full mx-auto flex items-center justify-between mb-4">
      <RouterLink to="/" class="eg-back-btn group" aria-label="返回游戏大厅">
        ←
      </RouterLink>
      <div class="eg-game-title">🔢 1024 消消乐</div>
      <div class="flex gap-2">
        <button @click="showLeaderboard = true" class="eg-icon-btn" aria-label="排行榜">🏆</button>
        <button @click="settings.openSettings()" class="eg-icon-btn" aria-label="设置">⚙️</button>
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- 游戏主体 -->
    <main class="max-w-md w-full mx-auto flex-1 flex flex-col">
      <!-- 分数面板 -->
      <div class="eg-score-row !mb-3">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light dark:text-text-dark">
            1024 消消乐
          </h1>
          <p class="text-[11px] opacity-70 mt-0.5 text-text-muted-light dark:text-text-muted-dark">
            第 {{ state.level }} / {{ maxLevel }} 关 · {{ difficultyLabel }} · 目标合成 {{ state.target }}
            <span v-if="state.bestScore > 0"> · 最高 {{ state.bestScore }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="得分" :value="state.score" accent />
          <ScoreBox label="最大" :value="state.maxTile" />
        </div>
      </div>

      <!-- 进度 + 步数 -->
      <div class="flex items-center gap-3 mb-3">
        <div class="flex-1 h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            :style="{ width: `${progressPct}%` }"
          ></div>
        </div>
        <div class="text-xs font-semibold tabular-nums text-text-light dark:text-text-dark whitespace-nowrap">
          {{ state.maxTile }} / {{ state.target }}
        </div>
        <div class="text-xs font-bold tabular-nums" :class="state.movesLeft <= 5 ? 'text-red-500' : 'text-text-light dark:text-text-dark'">
          ⏳ {{ state.movesLeft }} 步
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="eg-toolbar !mb-3">
        <div class="flex items-center gap-2">
          <button @click="showHowTo = true" class="eg-ghost-btn">❓ 玩法</button>
          <div class="hidden sm:flex items-center gap-1 text-xs opacity-70 text-text-muted-light dark:text-text-muted-dark">
            <span>⏱</span><span>{{ elapsedText }}</span>
            <span v-if="state.maxCombo > 1" class="ml-1 text-amber-500">🔥 {{ state.maxCombo }} 连</span>
          </div>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            v-if="state.chainPath && state.chainPath.length > 0"
            @click="doCommit"
            class="eg-primary-btn"
          >
            ✔ 确定（{{ chainSum }}）
          </button>
          <button
            @click="doUndo"
            :disabled="showResume || !canUndoNow || animating || state.status !== 'playing'"
            class="eg-ghost-btn"
          >
            ↩️ 撤销{{ state.undoLeft > 0 ? `(${state.undoLeft})` : '' }}
          </button>
          <button
            @click="doHint"
            :disabled="showResume || state.status !== 'playing'"
            class="eg-ghost-btn"
          >
            💡 提示
          </button>
          <button
            @click="doReshuffle"
            :disabled="showResume || state.status !== 'playing'"
            class="eg-ghost-btn"
          >
            🔀 洗牌
          </button>
          <button @click="newGame" class="eg-primary-btn">🔄 新游戏</button>
        </div>
      </div>

      <!-- 棋盘 -->
      <div
        ref="boardRef"
        class="relative mx-auto select-none touch-none w-full max-w-[480px] rounded-2xl board-bg-light dark:board-bg-dark shadow-inner"
        :style="boardStyle"
      >
        <!-- 背景格 -->
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

        <!-- 图案层（绝对定位 + 滑动过渡） -->
        <div
          class="absolute inset-0 overflow-hidden"
          :style="tileLayerStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <div
            v-for="t in displayTiles"
            :key="t.key"
            class="absolute flex items-center justify-center rounded-md font-extrabold shadow-claude-md tile-base"
            :class="[t.isPop ? 'cell-pop' : '', t.isNew ? 'tile-drop-new' : '', t.isGrow ? 'tile-grow' : '', t.isChain ? 'tile-chain' : '', t.isHint ? 'tile-hint' : '']"
            :style="tileStyle(t)"
          >
            <span class="leading-none" :style="{ fontSize: tileFont(t) }">{{ t.value }}</span>
          </div>

          <!-- 连线路径高亮线 -->
          <svg
            v-if="state.chainPath && state.chainPath.length >= 2"
            class="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              :points="chainPolyline(state.chainPath)"
              fill="none"
              stroke="rgba(251,191,36,0.9)"
              stroke-width="6"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
          <svg
            v-else-if="state.hintPath && state.hintPath.length >= 2"
            class="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              :points="chainPolyline(state.hintPath)"
              fill="none"
              stroke="rgba(52,211,153,0.9)"
              stroke-width="5"
              stroke-dasharray="6 6"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </div>

        <!-- 继续上次遮罩（z-10：棋子带 z-index，会盖住无层级的遮罩） -->
        <div
          v-if="showResume && state.status === 'playing'"
          class="absolute inset-0 z-10 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-amber-500 dark:text-amber-300">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">
              第 {{ pendingAutosave?.level ?? state.level }} 关 · {{ pendingAutosave?.score ?? state.score }} 分 · 剩 {{ pendingAutosave?.movesLeft ?? state.movesLeft }} 步，继续？
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button @click="resumeGame" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-claude-md transition-all active:scale-95">
                ▶️ 继续上次
              </button>
              <button @click="discardAutosave" class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95">
                🔄 重新开始
              </button>
            </div>
          </div>
        </div>

        <!-- 胜利遮罩 -->
        <div
          v-if="state.status === 'won'"
          class="absolute inset-0 z-10 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-amber-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">🎉 合成 {{ state.target }} 成功！</div>
            <p class="opacity-90 text-white">
              {{ state.score }} 分 · 剩 {{ state.movesLeft }} 步 · {{ elapsedText }}
              <span v-if="state.maxCombo > 1" class="ml-2">🔥 {{ state.maxCombo }} 连</span>
              <span v-if="isNewBest" class="ml-2">🏅 新纪录！</span>
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button @click="showLeaderboard = true" class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95">
                🏆 查看排行榜
              </button>
              <button @click="shareResult" class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95">
                📤 分享成绩
              </button>
              <button
                v-if="state.level < maxLevel"
                @click="nextLevel"
                class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                ➡️ 下一关
              </button>
              <button @click="newGame" class="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold shadow-claude-md transition-all active:scale-95">
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>

        <!-- 失败遮罩 -->
        <div
          v-if="state.status === 'lost'"
          class="absolute inset-0 z-10 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-slate-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">💤 步数用尽</div>
            <p class="opacity-90 text-white">
              {{ state.score }} 分 · 最大 {{ state.maxTile }} / 目标 {{ state.target }}
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button @click="newGame" class="px-6 py-2.5 rounded-xl bg-white text-amber-600 font-bold shadow-claude-md transition-all active:scale-95">
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作说明 -->
      <div class="text-center text-xs opacity-60 mt-4">
        👆 拖动连线相邻的<b>相同数字</b>（≥2 格），松手求和；或点击依次连、按 ✔ 确定
      </div>
    </main>

    <footer class="max-w-md w-full mx-auto mt-5 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <Merge1024SettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="1024 消消乐">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li><strong>拖动连线</strong>：手指/鼠标划过<strong>上下左右相邻且数字相同</strong>的格子（最少 2 格，能连多长连多长）。</li>
        <li>松手后连线格子<b>求和</b>成一个新数字（2+2+2=6，不是 ×2）；连线越长倍率越高（3 连 ×2、4 连 ×3、5 连 ×4）。</li>
        <li>腾出的格子由上方数字<b>下落</b>、顶部<b>自动补新</b>；棋盘始终满格，所以每次连线都会换来新的低值数字。</li>
        <li>合并出的新数字若与相邻同数<b>自动连锁</b>继续合并，连锁分数成倍增长，还可能直接合成目标数字。</li>
        <li>每关在有限步数内<b>合成目标数字</b>（16 → 32 → … → 1024）即过关，目标每关翻倍。</li>
        <li>卡住时用 💡 提示高亮可行连线，或 🔀 洗牌重排；无可行连线会自动洗牌。⚠️ 连线求和是数值守恒——<b>腾格子才是核心资源</b>，别急着吞大数字。</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="1024 消消乐"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Merge1024Engine } from '../../game/merge1024/GameEngine'
import type { Merge1024State, Merge1024Config, Merge1024Difficulty, ChainCell } from '../../game/merge1024/types'
import { DIFFICULTY_LABELS, MERGE1024_PRESETS, tileColor } from '../../game/merge1024/types'
import { useMerge1024SettingsStore } from '../../stores/merge1024-settings'
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
import Merge1024SettingsPanel from './components/Merge1024SettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useMerge1024SettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'merge1024'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
const showHowTo = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard'] as Merge1024Difficulty[]).map((d) => ({
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
const AUTOSAVE_GAME_ID = 'merge1024'
const AUTOSAVE_VERSION = 1
type SavedMerge1024State = Merge1024State & { savedAt?: number; v?: number }
const pendingAutosave = loadAutosave<SavedMerge1024State>(AUTOSAVE_GAME_ID)
const showResume = ref(false)
if (pendingAutosave && pendingAutosave.status === 'playing') {
  if (pendingAutosave.v === AUTOSAVE_VERSION) showResume.value = true
  else clearAutosave(AUTOSAVE_GAME_ID)
}

function hasProgress(): boolean {
  return state.score > 0 || state.movesLeft < MERGE1024_PRESETS[state.difficulty].moves
}

function persistAutosave() {
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
const engine = shallowRef(new Merge1024Engine(settings.config))
const state = reactive<Merge1024State>(engine.value.getState())
const now = ref(Date.now())

const maxLevel = computed(() => engine.value.getMaxLevel())

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(5)
const padding = ref(8)
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

const boardStyle = computed(() => ({
  width: 'auto',
  maxWidth: '100%',
  height: 'min(calc(100dvh - 360px), 600px)',
  aspectRatio: `${state.cols} / ${state.rows}`,
  padding: `${padding.value}px`,
  margin: '0 auto',
}))

const gapPx = computed(() => `${gap.value}px`)

const difficultyLabel = computed(() => DIFFICULTY_LABELS[state.difficulty] ?? DIFFICULTY_LABELS[settings.config.difficulty])

const wonElapsed = ref(0)
const elapsedText = computed(() => {
  const sec = state.status === 'won' ? wonElapsed.value : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

const progressPct = computed(() => {
  if (state.target <= 0) return 0
  return Math.min(100, Math.round((state.maxTile / state.target) * 100))
})

const chainSum = computed(() => {
  const path = state.chainPath
  if (!path || path.length === 0) return 0
  let sum = 0
  for (const p of path) sum += state.grid[p.r][p.c]
  return sum
})

// ===== 动画状态 =====
interface AnimTile {
  key: string
  value: number
  r: number
  c: number
  isPop?: boolean
  isNew?: boolean
  isGrow?: boolean
  isChain?: boolean
  isHint?: boolean
}

/** 最近消除的格子（爆发动画） */
const popCells = ref<Set<string>>(new Set())
/** 连锁锚点：显示新合成数字的格子 */
const anchorCell = ref<{ r: number; c: number; value: number } | null>(null)
/** 连锁动画播放中（防快速连点竞态） */
const animating = ref(false)

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
  anchorCell.value = null
}

// ===== 图案层渲染 =====
const tileLayerStyle = computed(() => ({
  top: `${padding.value}px`,
  left: `${padding.value}px`,
  right: `${padding.value}px`,
  bottom: `${padding.value}px`,
}))

/** 格子定位 + 配色 + 过渡 */
function tileStyle(t: AnimTile): Record<string, string> {
  const cols = state.cols
  const rows = state.rows
  const g = gap.value
  const cellW = `calc((100% - ${g * (cols - 1)}px) / ${cols})`
  const cellH = `calc((100% - ${g * (rows - 1)}px) / ${rows})`
  const color = tileColor(t.value, state.theme)
  return {
    left: `calc(${cellW} * ${t.c} + ${g * t.c}px)`,
    top: `calc(${cellH} * ${t.r} + ${g * t.r}px)`,
    width: cellW,
    height: cellH,
    backgroundColor: color.bg,
    color: color.text,
    transition: 'top 0.28s cubic-bezier(0.33, 1, 0.68, 1), left 0.28s cubic-bezier(0.33, 1, 0.68, 1)',
    zIndex: t.isChain || t.isGrow ? '5' : '1',
  }
}

/** 数字字号随位数分档 */
function tileFont(t: AnimTile): string {
  const rows = state.rows
  const cols = state.cols
  const boardH = Math.min(windowHeight.value - 360, 600)
  const cellH = (boardH * (1 - 2 * 0.02)) / rows
  const digits = t.value >= 10000 ? 5 : t.value >= 1000 ? 4 : t.value >= 100 ? 3 : t.value >= 10 ? 2 : 1
  const factor = digits >= 5 ? 0.24 : digits === 4 ? 0.32 : digits === 3 ? 0.42 : 0.58
  const baseVmin = (92 / Math.max(rows, cols)) * 0.8
  return `min(${(cellH * factor).toFixed(1)}px, ${(baseVmin / (digits >= 4 ? 1.6 : digits === 3 ? 1.25 : 1)).toFixed(2)}vmin)`
}

function isInPath(path: ChainCell[] | null, r: number, c: number): boolean {
  if (!path) return false
  return path.some((p) => p.r === r && p.c === c)
}

/** 当前显示的图案列表：优先动画层，否则按 state.grid 渲染 */
const displayTiles = computed<AnimTile[]>(() => {
  if (animTiles.value.length > 0) return animTiles.value
  const rows = state.rows
  const cols = state.cols
  const tiles: AnimTile[] = []
  const chain = state.chainPath
  const hint = state.hintPath
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = state.grid[r][c]
      if (v === 0) continue
      let value = v
      let isGrow = false
      const anchor = anchorCell.value
      if (anchor && anchor.r === r && anchor.c === c) {
        value = anchor.value
        isGrow = true
      }
      tiles.push({
        key: `g${r}-${c}`,
        value,
        r,
        c,
        isPop: popCells.value.has(`${r},${c}`),
        isGrow,
        isChain: isInPath(chain, r, c),
        isHint: isInPath(hint, r, c),
      })
    }
  }
  return tiles
})

const animTiles = ref<AnimTile[]>([])

/** 连线路径 → SVG 折线点（百分比坐标） */
function chainPolyline(path: ChainCell[]): string {
  const cols = state.cols
  const rows = state.rows
  return path
    .map((p) => `${(((p.c + 0.5) / cols) * 100).toFixed(1)},${(((p.r + 0.5) / rows) * 100).toFixed(1)}`)
    .join(' ')
}

// ===== 交互：拖拽连线 + 点击连线 =====
let dragging = false
let didDrag = false
let activePointer: number | null = null

function cellFromEvent(e: PointerEvent): { r: number; c: number } | null {
  const el = e.currentTarget as HTMLElement
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const c = Math.min(state.cols - 1, Math.max(0, Math.floor((x / rect.width) * state.cols)))
  const r = Math.min(state.rows - 1, Math.max(0, Math.floor((y / rect.height) * state.rows)))
  return { r, c }
}

function onPointerDown(e: PointerEvent) {
  if (showResume.value || animating.value) return
  if (state.status !== 'playing') return
  const cell = cellFromEvent(e)
  if (!cell) return
  e.preventDefault()
  dragging = true
  didDrag = false
  activePointer = e.pointerId
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  // 已有连线且该格可续 → 延伸；否则以该格为新起点
  const cur = engine.value.getChainPath()
  if (cur && cur.length > 0 && engine.value.canExtend(cur, cell.r, cell.c)) {
    engine.value.extendChain(cell.r, cell.c)
  } else {
    engine.value.beginChain(cell.r, cell.c)
  }
  syncState()
  sound.play('click')
}

function onPointerMove(e: PointerEvent) {
  if (!dragging || activePointer !== e.pointerId) return
  if (animating.value || state.status !== 'playing') return
  const cell = cellFromEvent(e)
  if (!cell) return
  if (extendToward(cell)) didDrag = true
}

/**
 * 从路径末格向采样点逐格补走（延伸到合法断点为止）。
 * 快速拖拽时 pointermove 采样稀疏会直接跳过中间格，逐格比较会静默拒连，
 * 表现为「拖了没反应」；这里按单轴步进重建经过的格子，恢复自然拖拽手感。
 */
function extendToward(cell: { r: number; c: number }): boolean {
  const path = engine.value.getChainPath()
  if (!path || path.length === 0) return false
  let last = path[path.length - 1]
  let extended = false
  for (let guard = 0; guard < 128 && (last.r !== cell.r || last.c !== cell.c); guard++) {
    const dr = cell.r - last.r
    const dc = cell.c - last.c
    const stepRow = Math.abs(dr) >= Math.abs(dc)
    const nr = stepRow ? last.r + Math.sign(dr) : last.r
    const nc = stepRow ? last.c : last.c + Math.sign(dc)
    if (!engine.value.canExtend(path, nr, nc)) break
    if (!engine.value.extendChain(nr, nc)) break
    path.push({ r: nr, c: nc })
    last = { r: nr, c: nc }
    extended = true
  }
  if (extended) syncState()
  return extended
}

function onPointerUp(e: PointerEvent) {
  if (!dragging || activePointer !== e.pointerId) return
  dragging = false
  activePointer = null
  if (animating.value || state.status !== 'playing') return
  // 松手点同样纳入补走：快速轻扫可能只剩 down/up 两个采样点
  if (e.type === 'pointerup') {
    const cell = cellFromEvent(e)
    if (cell && extendToward(cell)) didDrag = true
  }
  const path = engine.value.getChainPath()
  if (path && path.length >= 2 && didDrag) {
    doCommit()
  } else if (path && path.length >= 2) {
    // 点击连线：保留路径，等待 ✔ 确定
    sound.play('move')
  }
}

function doCommit() {
  if (showResume.value || animating.value) return
  if (state.status !== 'playing') return
  // 提交前快照分数（commitChain 已把得分累加进引擎，但 state 尚未同步，仍是移动前分数）
  const startScore = state.score
  if (!engine.value.commitChain()) {
    toast('至少连 2 格')
    return
  }
  // 连线路径已结算，立即清除高亮，避免动画期间残留旧折线
  state.chainPath = null
  const cascade = engine.value.lastCascade
  if (cascade.length > 0) {
    const token = beginAnim()
    void playCascade(cascade, startScore, token)
  } else {
    syncState()
    finishTurn()
  }
}

/** 逐帧播放连锁：每步「爆发 + 合成 → 下落补新」。长连锁截断动画，避免长时间卡死输入 */
const MAX_ANIM_STEPS = 4

async function playCascade(
  cascade: Array<{ merged: string[]; anchor: { r: number; c: number }; value: number; gained: number; gridBefore: number[][]; gridAfter: number[][] }>,
  startScore: number,
  token: number,
) {
  animating.value = true
  const totalGained = cascade.reduce((acc, s) => acc + s.gained, 0)
  let score = startScore
  try {
    for (let i = 0; i < cascade.length; i++) {
      if (isAnimStale(token)) return
      // 超过动画步数上限：不再逐帧播放，直接落到最终分，避免多步连锁数秒卡死
      if (i >= MAX_ANIM_STEPS) break
      const step = cascade[i]
      score += step.gained
      state.score = score
      // 阶段1：显示合并前棋盘，被吃格爆发，锚点格显示新数字（生长）
      animTiles.value = []
      state.grid = step.gridBefore.map((row) => [...row])
      const pop = new Set<string>()
      for (const k of step.merged) {
        if (k === `${step.anchor.r},${step.anchor.c}`) continue
        pop.add(k)
      }
      popCells.value = pop
      anchorCell.value = { r: step.anchor.r, c: step.anchor.c, value: step.value }
      sound.playUpgrade(step.value)
      await animSleep(180)
      if (isAnimStale(token)) return
      // 阶段2：下落补新
      buildFallTiles(step.gridBefore, pop, step.gridAfter, token)
      popCells.value = new Set()
      anchorCell.value = null
      await animSleep(300)
      if (isAnimStale(token)) return
      animTiles.value = []
      state.grid = step.gridAfter.map((row) => [...row])
    }
    // 确保最终分数正确（含被截断的连锁步）
    state.score = startScore + totalGained
  } finally {
    if (!isAnimStale(token)) {
      // 清理动画瞬时态，避免 displayTiles 仍命中 animTiles 残留
      animTiles.value = []
      popCells.value = new Set()
      anchorCell.value = null
      animating.value = false
      syncState()
      finishTurn()
    }
  }
}

/** 计算并设置下落动画 tiles：幸存图案从原位置滑到目标位置，新图案从顶部滑入 */
function buildFallTiles(
  prevGrid: number[][],
  mergedSet: Set<string>,
  afterGrid: number[][],
  token: number,
) {
  const rows = state.rows
  const cols = state.cols
  const tiles: AnimTile[] = []
  for (let c = 0; c < cols; c++) {
    const survivors: Array<{ v: number; r: number }> = []
    for (let r = rows - 1; r >= 0; r--) {
      if (mergedSet.has(`${r},${c}`)) continue
      const v = prevGrid[r][c]
      if (v !== 0) survivors.push({ v, r })
    }
    const afterCol: number[] = []
    for (let r = rows - 1; r >= 0; r--) {
      if (afterGrid[r][c] !== 0) afterCol.push(afterGrid[r][c])
    }
    survivors.forEach((t, i) => {
      const targetR = rows - 1 - i
      const afterV = afterGrid[targetR]?.[c] ?? t.v
      tiles.push({
        key: `f${c}-${i}`,
        value: afterV,
        r: t.r,
        c,
      })
    })
    for (let i = survivors.length; i < afterCol.length; i++) {
      tiles.push({
        key: `n${c}-${i}`,
        value: afterCol[i],
        r: -1,
        c,
        isNew: true,
      })
    }
  }
  animTiles.value = tiles
  trackRaf(() => {
    if (isAnimStale(token)) return
    trackRaf(() => {
      if (isAnimStale(token)) return
      animTiles.value = animTiles.value.map((t) => {
        const m = /[fn](\d+)-(\d+)/.exec(t.key)
        const i = m ? Number(m[2]) : -1
        return { ...t, r: i >= 0 ? rows - 1 - i : t.r }
      })
    })
  })
}

/** 统一结算（胜利/失败/存档） */
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
    toast('💡 高亮路径即可连线合成')
  } else {
    toast('当前无可行连线，建议洗牌')
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

const canUndoNow = ref(false)

function syncState() {
  const s = engine.value.getState()
  state.rows = s.rows
  state.cols = s.cols
  state.grid = s.grid.map((row) => [...row])
  state.chainPath = s.chainPath ? s.chainPath.map((p) => ({ ...p })) : null
  state.hintPath = s.hintPath ? s.hintPath.map((p) => ({ ...p })) : null
  state.score = s.score
  state.bestScore = s.bestScore
  state.target = s.target
  state.maxTile = s.maxTile
  state.movesLeft = s.movesLeft
  state.maxCombo = s.maxCombo
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
  engine.value.nextLevel()
  syncState()
  updateLayout()
  lastSubmittedScore = -1
  isNewBest.value = false
  wonElapsed.value = 0
  clearAutosave(AUTOSAVE_GAME_ID)
  sound.play('start')
}

function applySettings(config: Merge1024Config) {
  cancelAllAnims()
  engine.value = new Merge1024Engine(config)
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
    text: `我在 EasyGame 1024 消消乐合成到了 ${state.maxTile}（目标 ${state.target}），拿了 ${state.score} 分！来挑战我！🔢`,
    url: shareUrl('/game/merge1024'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

// ===== 布局 =====
function updateLayout() {
  gap.value = state.cols <= 6 ? 6 : state.cols === 7 ? 5 : 4
  padding.value = gap.value + 3
  windowHeight.value = window.innerHeight
}

// ===== 键盘 =====
function onKeydown(e: KeyboardEvent) {
  if (settings.showSettings || showLeaderboard.value || showHowTo.value) return
  if (e.key === 'Enter') {
    e.preventDefault()
    if (state.chainPath && state.chainPath.length >= 2) doCommit()
    return
  }
  if (e.key === 'Escape') {
    if (state.chainPath) {
      engine.value.beginChain(state.chainPath[0].r, state.chainPath[0].c)
      syncState()
    }
  }
}

// ===== 弹窗打开时暂停用时统计 =====
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
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
.tile-base {
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.tile-chain {
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.85), 0 4px 12px rgba(0, 0, 0, 0.25);
  border-color: rgba(251, 191, 36, 0.9) !important;
}
.tile-hint {
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.8);
  border-color: rgba(52, 211, 153, 0.85) !important;
}
/* 被合并格爆发消失 */
@keyframes cellPop {
  0% { transform: scale(1); opacity: 1; }
  60% { transform: scale(1.35); opacity: 0.8; }
  100% { transform: scale(0); opacity: 0; }
}
.cell-pop {
  animation: cellPop 0.3s ease-out forwards;
}
/* 新合成数字生长 */
@keyframes tileGrow {
  0% { transform: scale(0.4); opacity: 0.6; }
  100% { transform: scale(1); opacity: 1; }
}
.tile-grow {
  animation: tileGrow 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* 新补数字从顶部滑入 */
@keyframes tileDropIn {
  0% { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
}
.tile-drop-new {
  animation: tileDropIn 0.3s ease-out;
}
</style>

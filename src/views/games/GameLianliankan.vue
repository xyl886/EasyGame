<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-lg w-full mx-auto flex items-center justify-between mb-4">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-indigo-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🔗 连连看</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-indigo-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-indigo-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="设置"
        >
          ⚙️
        </button>
        <SoundToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- 游戏主体（窄高竖条：棋盘占满宽度，图案做大） -->
    <main class="max-w-lg w-full mx-auto flex-1 flex flex-col">
      <!-- 分数面板（紧凑单行） -->
      <div class="flex items-center justify-between mb-3 gap-3">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light dark:text-text-dark">
            连连看
          </h1>
          <p class="text-[11px] opacity-70 mt-0.5 text-text-muted-light dark:text-text-muted-dark">
            第 {{ state.level }} 关 · {{ difficultyLabel }} · {{ state.rows }}×{{ state.cols }}
            <span v-if="state.bestScore > 0"> · 最高 {{ state.bestScore }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="已消除" :value="state.pairs" />
          <ScoreBox label="分数" :value="state.score" accent />
        </div>
      </div>

      <!-- 操作按钮（单行紧凑） -->
      <div class="flex items-center justify-between mb-3 gap-2">
        <div class="flex items-center gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-indigo-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ❓ 玩法
          </button>
          <div class="hidden sm:flex items-center gap-1 text-xs opacity-70 text-text-muted-light dark:text-text-muted-dark">
            <span>⏱</span><span>{{ elapsedText }}</span>
            <span class="mx-1">·</span>
            <span>👣 {{ state.moves }} 次</span>
          </div>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            @click="doUndo"
            :disabled="showResume || !canUndoNow || state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-indigo-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            ↩️ 撤销{{ state.undoLeft > 0 ? `(${state.undoLeft})` : '' }}
          </button>
          <button
            @click="doHint"
            :disabled="showResume || state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-indigo-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            💡 提示
          </button>
          <button
            @click="doReshuffle"
            :disabled="showResume || state.status !== 'playing'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-indigo-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            🔀 洗牌
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-500 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>

      <!-- 倒计时 -->
      <div class="flex items-center gap-3 mb-3">
        <div class="flex-1 h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="state.timeLeft <= 10 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'"
            :style="{ width: `${Math.max(0, (state.timeLeft / state.timeLimit) * 100)}%` }"
          ></div>
        </div>
        <div
          class="text-xs font-bold tabular-nums whitespace-nowrap"
          :class="state.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-text-light dark:text-text-dark'"
        >
          ⏰ {{ formatTime(state.timeLeft) }}
        </div>
      </div>

      <!-- 棋盘 -->
      <div
        ref="boardRef"
        class="relative mx-auto select-none touch-none w-full rounded-2xl board-bg-light dark:board-bg-dark shadow-inner"
        :style="boardStyle"
      >
        <div class="grid w-full h-full" :style="{ gridTemplateColumns: `repeat(${state.cols}, 1fr)`, gridTemplateRows: `repeat(${state.rows}, 1fr)` }">
          <button
            v-for="i in state.rows * state.cols"
            :key="i - 1"
            type="button"
            class="relative flex items-center justify-center select-none"
            :style="tileFontStyle"
            :class="tileClass(i - 1)"
            @click="onTileClick(i - 1)"
          >
            <span v-if="tileValue(i - 1) !== ''" class="leading-none">{{ tileValue(i - 1) }}</span>
          </button>
        </div>

        <!-- 连线绘制（SVG 覆盖层，按真实 ≤2 弯路径，流动发光动画）
             定位到棋盘内容区（inset = padding），使 SVG 百分比坐标与格子中心一致 -->
        <svg
          v-if="connectPath"
          class="absolute w-full h-full pointer-events-none z-30 link-line-svg"
          :style="lineLayerStyle"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style="overflow: visible"
        >
          <polyline
            :points="connectPoints"
            fill="none"
            stroke="rgba(129,140,248,0.95)"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <!-- 流动虚线层 -->
          <polyline
            :points="connectPoints"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="6 6"
            class="link-line-flow"
          />
          <!-- 端点圆点 -->
          <circle v-for="(pt, i) in connectPath" :key="i" :cx="ptPct(pt)[0]" :cy="ptPct(pt)[1]" :r="0.8" fill="#6366f1" />
        </svg>

        <!-- 金卡连带消除连线（紫红色区分） -->
        <svg
          v-if="extraPath"
          class="absolute w-full h-full pointer-events-none z-30 link-line-svg"
          :style="lineLayerStyle"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style="overflow: visible"
        >
          <polyline
            :points="extraPoints"
            fill="none"
            stroke="rgba(232,121,249,0.95)"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle v-for="(pt, i) in extraPath" :key="i" :cx="ptPct(pt)[0]" :cy="ptPct(pt)[1]" :r="0.8" fill="#d946ef" />
        </svg>

        <!-- 继续上次遮罩 -->
        <div
          v-if="showResume && state.status !== 'won'"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-indigo-500 dark:text-indigo-300">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">
              已消除 {{ pendingAutosave?.pairs ?? state.pairs }} 对 · {{ pendingAutosave?.score ?? state.score }} 分，继续？
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-claude-md transition-all active:scale-95"
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
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-indigo-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">🎉 全部消除！</div>
            <p class="opacity-90 text-white">
              {{ state.pairs }} 对 · {{ state.score }} 分 · {{ elapsedText }}
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
                class="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                ➡️ 下一关
              </button>
              <button
                @click="newGame"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>

        <!-- 超时失败遮罩 -->
        <div
          v-if="state.status === 'lost'"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-red-500/80"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">⏰ 时间到</div>
            <p class="opacity-90 text-white">
              已消除 {{ state.pairs }} 对 · {{ state.score }} 分
            </p>
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
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-4 sm:hidden">
        👆 点击两张相同图案，能用最多两段直线连上即可消除 · PC 可用方向键 + 空格
      </div>
    </main>

    <footer class="max-w-lg w-full mx-auto mt-5 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <LianliankanSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="连连看">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li>点击一张图案选中，再<strong>点击另一张相同图案</strong>，若两者之间能用<strong>最多拐两次弯</strong>的直线路径相连（路径上无其它图案，可走棋盘边缘外侧），即消除这一对。</li>
        <li>PC 也可用 <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">方向键</kbd> 移动光标 + <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">空格</kbd> 选择，<kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">Esc</kbd> 取消光标。</li>
        <li>消除路径拐弯越少，得分越高；金框图案为 <strong>✨ 金卡</strong>：金卡与同图案的普通卡可以互消，<strong>两张金卡相消</strong>额外 +50 分并自动连带消除一对。</li>
        <li>找不到可消除的一对时点 <strong>🔀 洗牌</strong> 重铺；卡住时用 <strong>💡 提示</strong> 高亮一对可消除的图案；消除错了可用 <strong>↩️ 撤销</strong>（次数有限，不返还时间）。</li>
        <li>清空全部图案即<strong>获胜</strong>，用时越短、剩余时间越多得分越高；倒计时归零则失败。</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="连连看"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { LianliankanEngine } from '../../game/lianliankan/GameEngine'
import type { LinkState, LinkConfig, LinkDifficulty } from '../../game/lianliankan/types'
import { DIFFICULTY_LABELS, SYMBOL_POOL, isSpecialTile, baseSymbol } from '../../game/lianliankan/types'
import { useLianliankanSettingsStore } from '../../stores/lianliankan-settings'
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
import LianliankanSettingsPanel from './components/LianliankanSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useLianliankanSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'lianliankan'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
const showHowTo = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard'] as LinkDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
]
/** 胜利入榜去重：通关后只入一次 */
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
    moves: state.pairs,
    duration,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'lianliankan'
// 存档格式版本：调参后 +1，旧版本存档直接作废（避免旧时间限制/旧参数毒害新对局）
const AUTOSAVE_VERSION = 2
type SavedLinkState = LinkState & { savedAt?: number; v?: number }
const pendingAutosave = loadAutosave<SavedLinkState>(AUTOSAVE_GAME_ID)
const showResume = ref(false)
if (pendingAutosave && pendingAutosave.status === 'playing') {
  if (pendingAutosave.v === AUTOSAVE_VERSION) showResume.value = true
  else clearAutosave(AUTOSAVE_GAME_ID)
}

function persistAutosave() {
  // 有未处理的续档遮罩时禁止落盘：此时引擎是全新对局，覆写会毁掉玩家的存档进度
  if (showResume.value) return
  // 一对都没消的全新对局不值得续档
  if (state.pairs <= 0) {
    clearAutosave(AUTOSAVE_GAME_ID)
    return
  }
  saveAutosave(AUTOSAVE_GAME_ID, { v: AUTOSAVE_VERSION, ...engine.value.getState(), savedAt: Date.now() })
}

function resumeGame() {
  if (!pendingAutosave) return
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
  engine.value.reset()
  syncState()
  updateLayout()
}

function onVisibilityChange() {
  if (state.status !== 'playing') return
  if (document.visibilityState === 'hidden') {
    // 挂起倒计时（后台/锁屏不扣时间）并落盘
    engine.value.pauseClock()
    syncState()
    persistAutosave()
  } else {
    engine.value.resumeClock()
  }
}
function onPageHide() {
  if (state.status === 'playing') persistAutosave()
}

// ===== 引擎与状态 =====
const engine = shallowRef(new LianliankanEngine(settings.config))
const state = reactive<LinkState>(engine.value.getState())
const now = ref(Date.now())

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(6)
const padding = ref(8)
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

const boardStyle = computed(() => {
  // 纵向棋盘（高>宽）：高度优先撑满可用空间，宽度按 列/行 比例自动
  // 高度预算：顶栏/分数/按钮/倒计时/底部提示与页脚合计约 340px，保证一屏完整显示棋盘
  return {
    width: 'auto',
    maxWidth: '100%',
    height: 'min(calc(100dvh - 340px), 720px)',
    aspectRatio: `${state.cols} / ${state.rows}`,
    padding: `${padding.value}px`,
    margin: '0 auto',
  }
})

const difficultyLabel = computed(() => DIFFICULTY_LABELS[state.difficulty] ?? DIFFICULTY_LABELS[settings.config.difficulty])

const themePool = computed(() => SYMBOL_POOL[state.theme] ?? SYMBOL_POOL.fruit)

/**
 * 图案字号随棋盘尺寸自适应：
 * 格子越大字号越大（10×12 的格子比 6×8 小，字号必须相应缩小防止溢出）。
 * 格子边长按（估算棋盘高 − 上下 padding）/ 行数 精确计算，并以 vmin 兜底。
 */
const tileFontStyle = computed(() => {
  // 纵向棋盘：高度优先（与 boardStyle 一致），格子高 = (棋盘高 - padding×2) / 行数
  const boardH = Math.min(windowHeight.value - 340, 720)
  const cellH = (boardH - 2 * padding.value) / state.rows
  const baseVmin = 92 / Math.max(state.rows, state.cols) * 0.62
  return {
    fontSize: `min(${(cellH * 0.62).toFixed(1)}px, ${baseVmin.toFixed(2)}vmin)`,
  }
})

const wonElapsed = ref(0)

const elapsedText = computed(() => {
  const sec = state.status === 'won' ? wonElapsed.value : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

function formatTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`
}

function tileValue(idx: number): string {
  const r = Math.floor(idx / state.cols)
  const c = idx % state.cols
  const v = state.grid[r][c]
  if (v === 0) return ''
  const base = isSpecialTile(v) ? baseSymbol(v) : v
  return (themePool.value[base - 1] ?? '❔')
}

function tileClass(idx: number): string {
  const r = Math.floor(idx / state.cols)
  const c = idx % state.cols
  const v = state.grid[r][c]
  if (v === 0) return 'invisible'
  const classes: string[] = ['rounded-lg bg-card-light dark:bg-card-dark shadow-claude-md border border-border-light dark:border-border-dark transition-all duration-100 active:scale-90 m-[2px] sm:m-[2.5px]']
  if (isSpecialTile(v)) {
    classes.push('ring-2 ring-amber-300 border-amber-300 bg-amber-50 dark:bg-amber-200/20')
  }
  const sel = state.selected
  if (sel && sel.r === r && sel.c === c) {
    classes.push('ring-2 ring-indigo-400 border-indigo-400 scale-105 z-10')
  }
  const hint = state.hint
  if (hint && ((hint.r1 === r && hint.c1 === c) || (hint.r2 === r && hint.c2 === c))) {
    classes.push('ring-2 ring-amber-400 border-amber-400 bg-amber-100 dark:bg-amber-200/30')
  }
  // 键盘光标
  if (cursor.value && cursor.value.r === r && cursor.value.c === c) {
    classes.push('ring-2 ring-inset ring-sky-400 z-10')
  }
  return classes.join(' ')
}

function onTileClick(idx: number) {
  if (showResume.value) return
  if (engine.value.getState().status !== 'playing') return
  const r = Math.floor(idx / state.cols)
  const c = idx % state.cols
  if (state.grid[r][c] === 0) return
  const prevSel = state.selected
  const before = state.score
  // 预计算路径（move 会清空两格，需在消除前取路径）
  let prePath: Array<[number, number]> | null = null
  if (prevSel) {
    prePath = engine.value.getPath(prevSel.r, prevSel.c, r, c)
  }
  const moved = engine.value.move({ r, c })
  if (moved) {
    syncState()
    if (state.score > before) {
      sound.play('merge')
      // 用消除前计算的路径绘制连线
      if (prePath) flashConnectLine(prePath)
      // 金卡连带消除的一对：另色连线 + 提示
      const extra = engine.value.lastExtra
      if (extra) {
        flashExtraLine(extra.path)
        toast('✨ 金卡连消一对 +50')
      }
    } else {
      sound.play('click')
    }
    if (engine.value.getState().status === 'won') {
      wonElapsed.value = Math.floor((Date.now() - engine.value.getState().startTime) / 1000)
      sound.play('win')
      clearAutosave(AUTOSAVE_GAME_ID)
      submitScoreIfWon()
    } else {
      persistAutosave()
    }
  }
}

/** 金卡连带消除的连线（紫红色，与主连线区分） */
const extraPath = ref<Array<[number, number]> | null>(null)
let extraTimer: ReturnType<typeof setTimeout> | null = null
function flashExtraLine(path: Array<[number, number]>) {
  if (extraTimer) clearTimeout(extraTimer)
  extraPath.value = path
  extraTimer = setTimeout(() => (extraPath.value = null), 900)
}

const extraPoints = computed(() => {
  const path = extraPath.value
  if (!path) return ''
  return path.map((p) => ptPct(p).join(',')).join(' ')
})

/** 消除连线（按引擎返回的真实 ≤2 弯路径绘制，流动发光动画） */
const connectPath = ref<Array<[number, number]> | null>(null)
let connectTimer: ReturnType<typeof setTimeout> | null = null
function flashConnectLine(path: Array<[number, number]>) {
  if (connectTimer) clearTimeout(connectTimer)
  connectPath.value = path
  connectTimer = setTimeout(() => (connectPath.value = null), 700)
}

/** 虚拟坐标 → 棋盘内百分比（供 SVG 定位） */
function ptPct(pt: [number, number]): [number, number] {
  const [vr, vc] = pt
  const x = ((vc - 1 + 0.5) / state.cols) * 100
  const y = ((vr - 1 + 0.5) / state.rows) * 100
  return [Number(x.toFixed(2)), Number(y.toFixed(2))]
}

const connectPoints = computed(() => {
  const path = connectPath.value
  if (!path) return ''
  return path.map((p) => ptPct(p).join(',')).join(' ')
})

/** 连线层定位到棋盘内容区（与格子百分比坐标一致） */
const lineLayerStyle = computed(() => ({
  top: `${padding.value}px`,
  left: `${padding.value}px`,
  right: `${padding.value}px`,
  bottom: `${padding.value}px`,
}))

function doHint() {
  if (state.status !== 'playing' || showResume.value) return
  if (engine.value.hintNow()) {
    syncState()
    sound.play('start')
    toast('💡 高亮的这对可以消除')
  } else {
    toast('当前没有可消除的一对，建议洗牌')
  }
}

function doReshuffle() {
  if (state.status !== 'playing' || showResume.value) return
  engine.value.reshuffle()
  syncState()
  // 洗牌后清除残留连线/提示
  if (connectTimer) clearTimeout(connectTimer)
  connectPath.value = null
  if (extraTimer) clearTimeout(extraTimer)
  extraPath.value = null
  sound.play('rotate')
  toast('🔀 已洗牌')
}

function doUndo() {
  if (state.status !== 'playing' || showResume.value) return
  if (engine.value.undo()) {
    syncState()
    if (connectTimer) clearTimeout(connectTimer)
    connectPath.value = null
    if (extraTimer) clearTimeout(extraTimer)
    extraPath.value = null
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
  state.pairs = s.pairs
  state.moves = s.moves
  state.score = s.score
  state.bestScore = s.bestScore
  state.startTime = s.startTime
  state.status = s.status
  state.difficulty = s.difficulty
  state.theme = s.theme
  state.timeLimit = s.timeLimit
  state.timeLeft = s.timeLeft
  state.level = s.level
  state.undoLeft = s.undoLeft
  canUndoNow.value = engine.value.canUndo()
}

function newGame() {
  engine.value.reset()
  syncState()
  lastSubmittedScore = -1
  isNewBest.value = false
  wonElapsed.value = 0
  cursor.value = null
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  sound.play('start')
}

function nextLevel() {
  engine.value.nextLevel()
  syncState()
  updateLayout()
  lastSubmittedScore = -1
  isNewBest.value = false
  wonElapsed.value = 0
  cursor.value = null
  clearAutosave(AUTOSAVE_GAME_ID)
  if (connectTimer) clearTimeout(connectTimer)
  connectPath.value = null
  if (extraTimer) clearTimeout(extraTimer)
  extraPath.value = null
  sound.play('start')
}

function applySettings(config: LinkConfig) {
  engine.value = new LianliankanEngine(config)
  syncState()
  updateLayout()
  lastSubmittedScore = -1
  isNewBest.value = false
  wonElapsed.value = 0
  cursor.value = null
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

async function shareResult() {
  const result = await shareOrCopy({
    text: `我在 EasyGame 连连看用了 ${elapsedText.value} 消除了 ${state.pairs} 对、${state.score} 分，来挑战我！🔗`,
    url: shareUrl('/game/lianliankan'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

// ===== 键盘操作（方向键移动光标 + 空格/回车选择） =====
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
    // 空格=选择/消除（与点击一致）
    onTileClick(cursor.value.r * state.cols + cursor.value.c)
    return
  }
  if (k === 'Escape') {
    cursor.value = null
  }
}

// ===== 布局 =====
function updateLayout() {
  const maxDim = Math.max(state.rows, state.cols)
  gap.value = maxDim <= 8 ? 6 : maxDim <= 10 ? 5 : 4
  padding.value = gap.value + 4
  windowHeight.value = window.innerHeight
}

// ===== 弹窗打开时挂起倒计时（续档遮罩/设置/玩法/排行榜） =====
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
    if (showResume.value || modalOpen.value) return
    // 用响应式 status 判断，避免额外一次 getState；tick 后仅 syncState 一次
    if (state.status !== 'playing') return
    const lost = engine.value.tick()
    syncState()
    if (lost) {
      sound.play('over')
      clearAutosave(AUTOSAVE_GAME_ID)
    }
  }, 500)
})

onBeforeUnmount(() => {
  if (state.status === 'playing') persistAutosave()
  if (timer) clearInterval(timer)
  if (connectTimer) clearTimeout(connectTimer)
  if (extraTimer) clearTimeout(extraTimer)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
/* 连线流动动画：白色虚线沿路径流动 */
@keyframes linkFlow {
  from {
    stroke-dashoffset: 40;
  }
  to {
    stroke-dashoffset: 0;
  }
}
.link-line-flow {
  animation: linkFlow 0.6s linear infinite;
}
/* 连线淡入 + 发光 */
.link-line-svg {
  animation: linkFadeIn 0.18s ease-out;
  filter: drop-shadow(0 0 3px rgba(99, 102, 241, 0.6));
}
@keyframes linkFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

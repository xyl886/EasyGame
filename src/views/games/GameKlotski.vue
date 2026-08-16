<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-rose-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🧩 华容道</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-rose-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-rose-400/40 transition-all active:scale-95 flex items-center justify-center"
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
            华容道
          </h1>
          <p class="text-xs opacity-70 mt-1 text-text-muted-light dark:text-text-muted-dark">
            {{ state.size }}×{{ state.size }} · {{ difficultyLabel }}
            <span v-if="state.bestMoves > 0"> · 历史最少 {{ state.bestMoves }} 步</span>
            <span v-else> · 还没完成过</span>
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
      <div class="flex items-center justify-between mb-4 gap-2">
        <div class="flex items-center gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-rose-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ❓ 玩法
          </button>
          <div class="text-xs opacity-70 hidden sm:block text-text-muted-light dark:text-text-muted-dark">
            方向键 / <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">WASD</kbd>
            或点击数字移动 · 目标：数字按顺序排好，空格在右下角
          </div>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            @click="undo"
            :disabled="!canUndo"
            class="px-4 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-rose-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            ↩️ 撤销
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-rose-400 hover:bg-rose-500 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>

      <!-- 棋盘 -->
      <div
        ref="boardRef"
        class="relative mx-auto select-none touch-none rounded-2xl board-bg-light dark:board-bg-dark shadow-inner"
        :style="boardStyle"
      >
        <div
          class="grid w-full h-full"
          :style="{ gridTemplateColumns: `repeat(${state.size}, 1fr)`, gap: gapPx }"
        >
          <button
            v-for="(v, i) in state.board"
            :key="i"
            type="button"
            class="rounded-lg font-bold transition-colors duration-75 flex items-center justify-center"
            :class="tileClass(v)"
            :style="{ fontSize: tileFontSize }"
            :disabled="v === 0"
            :aria-label="v === 0 ? '空格' : `数字 ${v}`"
            @click="onTileClick(i)"
          >
            <span v-if="v !== 0">{{ v }}</span>
          </button>
        </div>

        <!-- 继续上次遮罩 -->
        <div
          v-if="showResume && !state.won"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-rose-500 dark:text-rose-300">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">已走 {{ pendingAutosave?.moves ?? 0 }} 步，继续挑战？</p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-rose-400 hover:bg-rose-500 text-white font-bold shadow-claude-md transition-all active:scale-95"
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
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-rose-400/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold text-white">🎉 解出成功！</div>
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
                class="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-4 sm:hidden">
        👆 点击数字或滑动手指移动 · 目标：数字排好序，空格在右下角
      </div>
    </main>

    <footer class="max-w-xl w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <KlotskiSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="华容道 · 数字版">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li><strong>点击数字</strong>或<strong>滑动屏幕</strong> / 方向键，把数字移入空格</li>
        <li>目标：数字按 <strong>1 → N²-1 顺序</strong>排好，空格在右下角</li>
        <li>支持 <strong>撤销</strong>；误退/刷新后自动存档可一键继续</li>
        <li>棋盘越大（3×3 / 4×4 / 5×5）难度越高；同一布局可挑战最少步数</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="华容道"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { KlotskiEngine } from '../../game/klotski/GameEngine'
import type { KlotskiState, KlotskiConfig, KlotskiDirection, KlotskiDifficulty } from '../../game/klotski/types'
import { DIFFICULTY_LABELS, scoreForMoves } from '../../game/klotski/types'
import { useKlotskiSettingsStore } from '../../stores/klotski-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl, gameShareText } from '../../utils/share'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import HowToPlay from '../../components/HowToPlay.vue'
import ScoreBox from './components/ScoreBox.vue'
import KlotskiSettingsPanel from './components/KlotskiSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useKlotskiSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'klotski'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
/** 玩法说明弹层 */
const showHowTo = ref(false)
// 维度：difficulty = 难度，size = 尺寸
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard'] as KlotskiDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
  {
    key: 'size',
    label: '尺寸',
    values: [3, 4, 5].map((s) => ({ value: s, label: `${s}×${s}` })),
  },
]
/** 胜利入榜去重：解出后只入一次 */
let lastSubmittedWonMoves = -1

function submitScoreIfWon() {
  if (!state.won) return
  if (state.moves === lastSubmittedWonMoves) return
  lastSubmittedWonMoves = state.moves
  const duration = finishedElapsed.value
  leaderboard.addEntry({
    score: scoreForMoves(state.moves),
    difficulty: settings.config.difficulty,
    size: settings.config.size,
    moves: state.moves,
    duration,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'klotski'
const pendingAutosave = loadAutosave<KlotskiState>(AUTOSAVE_GAME_ID)
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
  if (document.visibilityState === 'hidden' && !state.won) persistAutosave()
}
function onPageHide() {
  if (!state.won) persistAutosave()
}

// ===== 引擎与状态 =====
const engine = shallowRef(new KlotskiEngine(settings.config))
const state = reactive<KlotskiState>(engine.value.getState())
const canUndo = ref(false)
/** 完成时刻的用时（秒），胜利后固定显示 */
const finishedElapsed = ref(0)
const now = ref(Date.now())

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(8)
const padding = ref(8)

const boardStyle = computed(() => {
  const n = state.size
  const maxW = n <= 3 ? 400 : n <= 4 ? 440 : 460
  return {
    width: '100%',
    maxWidth: `${maxW}px`,
    aspectRatio: '1 / 1',
    padding: `${padding.value}px`,
  }
})

const gapPx = computed(() => `${gap.value}px`)

const tileFontSize = computed(() => {
  const n = state.size
  return n <= 3 ? '2.2rem' : n <= 4 ? '1.8rem' : '1.4rem'
})

const difficultyLabel = computed(() => DIFFICULTY_LABELS[settings.config.difficulty])

const elapsedText = computed(() => {
  const sec = state.won ? finishedElapsed.value : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

function tileClass(v: number): string {
  if (v === 0) return 'bg-transparent'
  return 'bg-gradient-to-br from-rose-400 to-rose-600 dark:from-rose-500 dark:to-rose-700 text-white shadow-claude-md hover:from-rose-500 hover:to-rose-700 dark:hover:from-rose-400 dark:hover:to-rose-600 transition-transform active:scale-95'
}

function syncState() {
  const s = engine.value.getState()
  state.board = [...s.board]
  state.size = s.size
  state.moves = s.moves
  state.startTime = s.startTime
  state.bestMoves = s.bestMoves
  state.won = s.won
  state.over = s.over
  state.difficulty = s.difficulty
  canUndo.value = engine.value.canUndo()
}

/** 数字移动方向 → 空格反向移动 */
function doMove(dir: KlotskiDirection) {
  if (state.won) return
  const moved = engine.value.move(dir)
  if (moved) {
    syncState()
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
  updateLayout()
  finishedElapsed.value = 0
  lastSubmittedWonMoves = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  sound.play('start')
}

/** 点击数字块：与空格相邻则移动 */
function onTileClick(i: number) {
  if (state.won || showResume.value) return
  const dir = dirFromTile(i)
  if (dir) doMove(dir)
}

/** 计算某个数字块相对空格应移动的方向 */
function dirFromTile(i: number): KlotskiDirection | null {
  const empty = state.board.indexOf(0)
  if (empty < 0) return null
  const size = state.size
  const er = Math.floor(empty / size)
  const ec = empty % size
  const r = Math.floor(i / size)
  const c = i % size
  if (r === er && c === ec + 1) return 'left' // 数字在空格右边 → 左移
  if (r === er && c === ec - 1) return 'right' // 数字在空格左边 → 右移
  if (c === ec && r === er + 1) return 'up' // 数字在空格下方 → 上移
  if (c === ec && r === er - 1) return 'down' // 数字在空格上方 → 下移
  return null
}

/** 应用设置：重建引擎并重新开始 */
function applySettings(config: KlotskiConfig) {
  engine.value = new KlotskiEngine(config)
  syncState()
  updateLayout()
  finishedElapsed.value = 0
  lastSubmittedWonMoves = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

/** 分享成绩 */
async function shareResult() {
  const result = await shareOrCopy({
    text: gameShareText('klotski', state.moves, state.size, true),
    url: shareUrl('/game/klotski'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

// ===== 键盘操作 =====
function onKeydown(e: KeyboardEvent) {
  // 设置/排行榜弹窗打开时忽略游戏按键（注意 ref 需 .value）
  if (settings.showSettings || showLeaderboard.value) return
  const map: Record<string, KlotskiDirection> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
  }
  const dir = map[e.key]
  if (dir) {
    e.preventDefault()
    // 有「继续上次」弹窗时，方向键 = 继续上次
    if (showResume.value) {
      resumeGame()
      return
    }
    doMove(dir)
  }
}

// ===== 触摸/点击 =====
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
  if (state.won) return
  // 滑动方向 = 数字移动方向（与键盘一致）
  if (Math.abs(dx) > Math.abs(dy)) {
    doMove(dx > 0 ? 'right' : 'left')
  } else {
    doMove(dy > 0 ? 'down' : 'up')
  }
}

// ===== 布局 =====
function updateLayout() {
  const w = window.innerWidth
  const n = state.size
  const tier: 'mobile' | 'tablet' | 'desktop' = w < 480 ? 'mobile' : w < 768 ? 'tablet' : 'desktop'
  const GAP_TABLE: Record<'mobile' | 'tablet' | 'desktop', Record<number, number>> = {
    mobile: { 3: 8, 4: 7, 5: 5 },
    tablet: { 3: 10, 4: 8, 5: 6 },
    desktop: { 3: 12, 4: 10, 5: 8 },
  }
  const g = GAP_TABLE[tier][n] ?? 8
  gap.value = g
  padding.value = g + 2
}

// ===== 计时器（仅未完成时刷新显示） =====
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateLayout()
  syncState()
  // 胜利状态恢复（存档恢复时可能已 won？不会：存档只在未 won 时保存）
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
  // 离开页面兜底保存
  if (!state.won) persistAutosave()
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
/* klotski 不需要额外样式，靠 tailwind 工具类 */
</style>

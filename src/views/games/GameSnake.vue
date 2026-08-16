<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-lime-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🐍 贪吃蛇</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-lime-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-lime-400/40 transition-all active:scale-95 flex items-center justify-center"
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
            贪吃蛇
          </h1>
          <p class="text-xs opacity-70 mt-1 text-text-muted-light dark:text-text-muted-dark">
            {{ state.size }}×{{ state.size }} · {{ speedLabel }}
            <span v-if="state.wallThrough"> · 穿墙</span>
            <span v-if="state.multiFood"> · 多食物</span>
            <span v-if="state.obstacleCount > 0"> · {{ state.obstacleCount }} 障碍</span>
            <span v-if="state.winLength > 0"> · 目标 {{ state.winLength }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="分数" :value="state.score" />
          <ScoreBox label="最高分" :value="state.bestScore" accent />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between mb-4 gap-2">
        <div class="flex items-center gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-lime-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ❓ 玩法
          </button>
          <div class="text-xs opacity-70 hidden sm:block text-text-muted-light dark:text-text-muted-dark">
            键盘 <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">↑↓←→</kbd>
            或 <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">WASD</kbd> ·
            <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">空格</kbd> 暂停
          </div>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            @click="togglePause"
            :disabled="state.over || !started"
            class="px-4 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-lime-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            {{ state.paused ? '▶️ 继续' : '⏸️ 暂停' }}
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-500 text-gray-900 shadow-claude-md transition-all active:scale-95 text-sm font-bold"
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
          <div
            v-for="i in state.size * state.size"
            :key="i - 1"
            class="rounded-sm transition-colors duration-75"
            :class="cellClass(i - 1)"
          ></div>
        </div>

        <!-- 游戏结束遮罩 -->
        <div
          v-if="state.over || state.won"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm"
          :class="state.won ? 'bg-lime-400/70' : 'bg-bg-light/80 dark:bg-bg-dark/80'"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold" :class="state.won ? 'text-gray-900' : 'text-text-light dark:text-text-dark'">
              {{ state.won ? '🎉 通关！' : '💤 游戏结束' }}
            </div>
            <p class="opacity-80 text-text-light dark:text-text-dark">
              最终得分：<strong>{{ state.score }}</strong>
              <span class="opacity-60 ml-2">· 长度 {{ state.snake.length }} · {{ state.moveCount }} 步</span>
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
                class="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-gray-900 font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>

        <!-- 就绪遮罩（未开始） -->
        <div
          v-if="!started && !state.over"
          class="absolute inset-0 rounded-2xl flex items-center justify-center bg-bg-light/70 dark:bg-bg-dark/70 backdrop-blur-sm"
        >
          <!-- 有自动存档：提供继续/重开 -->
          <div v-if="showResume" class="text-center space-y-3 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-lime-600 dark:text-lime-300">🕹️ 上次进度还在</div>
            <p class="text-sm opacity-70 text-text-light dark:text-text-dark">
              得分 {{ pendingAutosave?.score }} · 长度 {{ pendingAutosave?.snake.length ?? 0 }}，继续挑战？
            </p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-6 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-gray-900 font-bold shadow-claude-md transition-all active:scale-95"
              >
                ▶️ 继续上次
              </button>
              <button
                @click="discardAutosave"
                class="px-6 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                🔄 重新开始
              </button>
            </div>
          </div>
          <!-- 全新开局 -->
          <div v-else class="text-center space-y-3 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-lime-600 dark:text-lime-300">▶️ 准备好了吗？</div>
            <p class="text-sm opacity-70 text-text-light dark:text-text-dark">
              按 <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">方向键</kbd>
              / <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">WASD</kbd>
              / <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">空格</kbd> 开始
            </p>
            <button
              @click="start"
              class="px-6 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-gray-900 font-bold shadow-claude-md transition-all active:scale-95"
            >
              🎮 开始游戏
            </button>
          </div>
        </div>

        <!-- 暂停遮罩 -->
        <div
          v-if="state.paused && started && !state.over"
          class="absolute inset-0 rounded-2xl flex items-center justify-center bg-white/50 dark:bg-bg-dark/50 backdrop-blur-sm"
        >
          <div class="text-3xl font-extrabold opacity-70">⏸️ 已暂停</div>
        </div>
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-4 sm:hidden">
        👆 在棋盘上滑动手指控制方向
      </div>
    </main>

    <footer class="max-w-xl w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <SnakeSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="贪吃蛇">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li>用 <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">方向键</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">WASD</kbd> 或<strong>滑动屏幕</strong>控制蛇的移动方向</li>
        <li>吃到食物得分并<strong>变长</strong>；金色 bonus 食物 +5 分</li>
        <li>撞墙、撞到自己或障碍物即失败（设置里开启<strong>穿墙</strong>可绕到对面）</li>
        <li>蛇身达到目标长度即<strong>获胜</strong>（设置里可调，0 为无尽模式）</li>
        <li><kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">空格</kbd> 暂停 / 继续</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="贪吃蛇"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { SnakeEngine } from '../../game/snake/GameEngine'
import type { SnakeState, SnakeConfig, SpeedTier, Direction } from '../../game/snake/types'
import { SPEED_LABELS } from '../../game/snake/types'
import { useSnakeSettingsStore } from '../../stores/snake-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave, throttledSaver } from '../../utils/autosave'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import HowToPlay from '../../components/HowToPlay.vue'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl, gameShareText } from '../../utils/share'
import { toast } from '../../utils/toast'
import ScoreBox from './components/ScoreBox.vue'
import SnakeSettingsPanel from './components/SnakeSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useSnakeSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'snake'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
/** 玩法说明弹层 */
const showHowTo = ref(false)
/** 是否已开始（未开始时显示就绪遮罩，等待玩家按键/点击才开始 tick） */
const started = ref(false)
// 排行榜维度：speed 映射到 difficulty 字段，size 单独维度
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '速度',
    values: (['slow', 'medium', 'fast'] as SpeedTier[]).map((s) => ({
      value: s,
      label: SPEED_LABELS[s],
    })),
  },
  {
    key: 'size',
    label: '尺寸',
    values: [12, 16, 20, 24].map((s) => ({ value: s, label: `${s}×${s}` })),
  },
]
let lastSubmittedOverScore = -1

function submitScoreIfOver() {
  if (!state.over) return
  if (state.score === lastSubmittedOverScore) return
  lastSubmittedOverScore = state.score
  const duration = Math.floor((Date.now() - state.startTime) / 1000)
  leaderboard.addEntry({
    score: state.score,
    difficulty: settings.config.speed,
    size: settings.config.size,
    moves: state.moveCount,
    duration,
    won: state.won,
  })
}

// ===== 自动存档：误退/刷新后可继续上次进度 =====
const AUTOSAVE_GAME_ID = 'snake'
const pendingAutosave = loadAutosave<SnakeState>(AUTOSAVE_GAME_ID)
/** 是否显示「继续上次」弹窗（存在未完成且未结束的存档） */
const showResume = ref(false)
if (pendingAutosave && !pendingAutosave.over && !pendingAutosave.won) {
  showResume.value = true
}
/** tick 型游戏：节流保存，间隔内最多落盘一次 */
const autosaver = throttledSaver(() => saveAutosave(AUTOSAVE_GAME_ID, engine.value.getState()))

function resumeGame() {
  if (!pendingAutosave) return
  engine.value.loadState(pendingAutosave)
  syncState()
  showResume.value = false
  started.value = true
  sound.play('start')
  if (!state.over && !state.paused) scheduleTick()
}

function discardAutosave() {
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  engine.value.reset()
  syncState()
}

/** 就绪态下：有存档则恢复，否则新开局（键盘/触摸首次操作共用） */
function beginOrResume() {
  if (showResume.value) resumeGame()
  else start()
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden' && !state.over) autosaver.flush()
}
function onPageHide() {
  if (!state.over) autosaver.flush()
}

// ===== 引擎与状态 =====
const engine = shallowRef(new SnakeEngine(settings.config))
const state = reactive<SnakeState>(engine.value.getState())

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(2)
const padding = ref(6)

const boardStyle = computed(() => {
  const n = state.size
  // 尺寸越大棋盘越大但有上限，保持 cell 大小合理
  const maxW = n <= 12 ? 460 : n <= 16 ? 460 : n <= 20 ? 460 : 440
  return {
    width: '100%',
    maxWidth: `${maxW}px`,
    aspectRatio: '1 / 1',
    padding: `${padding.value}px`,
  }
})

const gapPx = computed(() => `${gap.value}px`)

const speedLabel = computed(() => SPEED_LABELS[settings.config.speed])

/** 单元格类型查表：每次 syncState 后重算 */
const cellMap = computed(() => {
  const m = new Map<string, 'head' | 'body' | 'food' | 'bonus' | 'obstacle'>()
  if (state.snake.length > 0) {
    const h = state.snake[0]
    m.set(`${h.x},${h.y}`, 'head')
  }
  for (let i = 1; i < state.snake.length; i++) {
    const p = state.snake[i]
    m.set(`${p.x},${p.y}`, 'body')
  }
  for (const f of state.foods) {
    m.set(`${f.pos.x},${f.pos.y}`, f.type === 'bonus' ? 'bonus' : 'food')
  }
  for (const o of state.obstacles) {
    m.set(`${o.pos.x},${o.pos.y}`, 'obstacle')
  }
  return m
})

function cellClass(idx: number): string {
  const x = idx % state.size
  const y = Math.floor(idx / state.size)
  const type = cellMap.value.get(`${x},${y}`)
  switch (type) {
    case 'head':
      return 'bg-lime-600 dark:bg-lime-300 shadow-sm'
    case 'body':
      return 'bg-lime-400 dark:bg-lime-500'
    case 'food':
      return 'bg-amber-400 dark:bg-amber-300'
    case 'bonus':
      return 'bg-amber-500 dark:bg-amber-400 animate-pulse'
    case 'obstacle':
      return 'bg-gray-600 dark:bg-gray-400'
    default:
      return 'cell-bg-light dark:cell-bg-dark'
  }
}

function syncState() {
  const s = engine.value.getState()
  // 深拷贝触发响应式
  state.snake = s.snake.map((p) => ({ ...p }))
  state.foods = s.foods.map((f) => ({ ...f, pos: { ...f.pos } }))
  state.obstacles = s.obstacles.map((o) => ({ ...o, pos: { ...o.pos } }))
  state.direction = s.direction
  state.nextDirection = s.nextDirection
  state.score = s.score
  state.bestScore = s.bestScore
  state.over = s.over
  state.won = s.won
  state.paused = s.paused
  state.tickInterval = s.tickInterval
  state.moveCount = s.moveCount
  state.startTime = s.startTime
  state.size = s.size
  // 同步配置快照字段，避免改设置后标题徽标（穿墙/多食物/障碍/目标）残留旧值
  state.speed = s.speed
  state.wallThrough = s.wallThrough
  state.multiFood = s.multiFood
  state.obstacleCount = s.obstacleCount
  state.winLength = s.winLength
}

// ===== Tick 循环（setTimeout 递归，支持动态间隔） =====
let tickTimer: ReturnType<typeof setTimeout> | null = null

function scheduleTick() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => {
    if (state.over || state.paused) {
      tickTimer = null
      return
    }
    const prevScore = state.score
    engine.value.step()
    syncState()
    // 音效：吃到食物 / 通关 / 游戏结束（引擎胜利时 over 同步为 true，先判 won）
    if (state.score > prevScore) sound.play('eat')
    if (state.won) sound.play('win')
    else if (state.over) sound.play('over')
    submitScoreIfOver()
    if (!state.over) {
      // 自动存档（节流）
      autosaver.save()
      scheduleTick()
    } else {
      tickTimer = null
      clearAutosave(AUTOSAVE_GAME_ID)
    }
  }, engine.value.getTickInterval())
}

function stopTick() {
  if (tickTimer) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
}

/** 开始游戏（从就绪态进入运行态） */
function start() {
  if (started.value || state.over) return
  started.value = true
  sound.play('start')
  scheduleTick()
}

/** 分享本局成绩 */
async function shareResult() {
  const result = await shareOrCopy({
    text: gameShareText('snake', state.score, undefined, state.won),
    url: shareUrl('/game/snake'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

function newGame() {
  engine.value.reset()
  syncState()
  lastSubmittedOverScore = -1
  stopTick()
  started.value = false
  // 新开局清除旧存档
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

function togglePause() {
  engine.value.togglePause()
  syncState()
  // 暂停瞬间也落盘，暂停后离开页面可原样恢复
  if (!state.over) autosaver.flush()
  // 暂停→继续时重启 tick 循环
  if (!state.paused && !state.over && !tickTimer) {
    scheduleTick()
  }
}

/** 应用设置：重建引擎并重新开始 */
function applySettings(config: SnakeConfig) {
  engine.value = new SnakeEngine(config)
  syncState()
  lastSubmittedOverScore = -1
  stopTick()
  started.value = false
  // 设置变更视为放弃旧局面
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

// ===== 键盘操作 =====
function onKeydown(e: KeyboardEvent) {
  // 设置/排行榜弹窗打开时忽略游戏按键，避免误操作背后的棋盘
  if (settings.showSettings || showLeaderboard.value) return
  const map: Record<string, SnakeConfig['speed'] | Direction | 'pause'> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
    ' ': 'pause',
  }
  const action = map[e.key]
  if (!action) return
  e.preventDefault()
  if (action === 'pause') {
    if (!started.value) {
      beginOrResume()
      return
    }
    togglePause()
    return
  }
  if (state.over) return
  if (!started.value) {
    beginOrResume()
  }
  if (engine.value.move(action as Direction)) sound.play('move')
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
  if (state.over) return
  if (!started.value) {
    beginOrResume()
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    if (engine.value.move(dx > 0 ? 'right' : 'left')) sound.play('move')
  } else {
    if (engine.value.move(dy > 0 ? 'down' : 'up')) sound.play('move')
  }
}

// ===== 响应式 gap（屏幕宽度 × 棋盘尺寸） =====
const GAP_TABLE: Record<'mobile' | 'tablet' | 'desktop', Record<number, number>> = {
  mobile: { 12: 3, 16: 2, 20: 2, 24: 1 },
  tablet: { 12: 4, 16: 3, 20: 2, 24: 2 },
  desktop: { 12: 5, 16: 4, 20: 3, 24: 2 },
}

function updateLayout() {
  const w = window.innerWidth
  const tier: 'mobile' | 'tablet' | 'desktop' = w < 480 ? 'mobile' : w < 768 ? 'tablet' : 'desktop'
  const n = state.size
  const table = GAP_TABLE[tier]
  const g = table[n] ?? (n >= 24 ? table[24] : table[12])
  gap.value = g
  padding.value = g + 2
}

onMounted(() => {
  updateLayout()
  syncState()
  submitScoreIfOver()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updateLayout)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  const el = boardRef.value
  if (el) {
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  }
  // 不自动开始 tick：进入就绪态，等待玩家按键/点击 start()
})

onBeforeUnmount(() => {
  stopTick()
  // 离开页面兜底保存
  if (!state.over) autosaver.flush()
  autosaver.dispose()
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
/* snake 暂不需要额外样式 */
</style>

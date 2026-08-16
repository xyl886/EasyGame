<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-3xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-cyan-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🧱 俄罗斯方块</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-cyan-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-cyan-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="设置"
        >
          ⚙️
        </button>
          <SoundToggle />
          <ThemeToggle />
      </div>
    </header>

    <!-- 游戏主体 -->
    <main class="max-w-3xl w-full mx-auto flex-1 flex flex-col">
      <!-- 标题 + 分数 -->
      <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light dark:text-text-dark">
            俄罗斯方块
          </h1>
          <p class="text-xs opacity-70 mt-1 text-text-muted-light dark:text-text-muted-dark">
            Lv {{ state.level }} · {{ state.lines }} 行
            <span v-if="state.targetLines > 0"> · 目标 {{ state.targetLines }}</span>
            <span v-else> · 无尽</span>
            <span class="ml-1">· {{ speedLabel }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="分数" :value="state.score" />
          <ScoreBox label="最高分" :value="state.bestScore" accent />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-cyan-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ❓ 玩法
          </button>
          <div class="text-xs opacity-70 hidden sm:block text-text-muted-light dark:text-text-muted-dark">
            <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">←→</kbd> 移动 ·
            <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">↑/W</kbd> 旋转 ·
            <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">↓</kbd> 软降 ·
            <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">空格</kbd> 硬降 ·
            <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">C</kbd> Hold ·
            <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">P</kbd> 暂停
          </div>
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            v-if="state.holdPiece"
            @click="hold"
            :disabled="state.over || !started || !state.canHold"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-cyan-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            🤚 Hold
          </button>
          <button
            @click="togglePause"
            :disabled="state.over || !started"
            class="px-4 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-cyan-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            {{ state.paused ? '▶️ 继续' : '⏸️ 暂停' }}
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-500 text-gray-900 shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>

      <!-- 棋盘 + 侧栏 -->
      <div class="flex gap-3 justify-center items-start flex-wrap">
        <!-- Hold 槽（左侧，仅启用时显示） -->
        <div v-if="state.holdPiece" class="flex flex-col items-center">
          <div class="text-xs opacity-70 mb-1 font-semibold">HOLD</div>
          <div
            class="rounded-lg bg-white/50 dark:bg-bg-dark/40 shadow-inner p-1.5"
            :style="{ width: previewBoxPx, height: previewBoxPx }"
          >
            <div class="w-full h-full grid" :style="{ gridTemplateColumns: `repeat(4, 1fr)`, gap: '1px' }">
              <div
                v-for="i in 16"
                :key="i - 1"
                class="rounded-[2px]"
                :class="previewCellClass(state.hold, i - 1, !state.canHold)"
              ></div>
            </div>
          </div>
        </div>

        <!-- 主棋盘 -->
        <div
          ref="boardRef"
          class="relative select-none touch-none rounded-2xl board-bg-light dark:board-bg-dark shadow-inner"
          :style="boardStyle"
        >
          <div
            class="grid w-full h-full"
            :style="{ gridTemplateColumns: `repeat(${state.width}, 1fr)`, gap: gapPx }"
          >
            <div
              v-for="i in state.width * state.height"
              :key="i - 1"
              class="rounded-[2px] transition-colors duration-75"
              :class="cellClass(i - 1)"
            ></div>
          </div>

          <!-- 消行白闪反馈 -->
          <div
            v-if="lineFlash"
            class="absolute inset-0 rounded-2xl pointer-events-none z-20 bg-white dark:bg-white/80 line-flash"
          ></div>

          <!-- 游戏结束遮罩 -->
          <div
            v-if="state.over || state.won"
            class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm"
            :class="state.won ? 'bg-cyan-400/70' : 'bg-bg-light/80 dark:bg-bg-dark/80'"
          >
            <div class="text-center space-y-4 px-4">
              <div class="text-4xl md:text-5xl font-extrabold" :class="state.won ? 'text-gray-900' : 'text-text-light dark:text-text-dark'">
                {{ state.won ? '🎉 通关！' : '💤 游戏结束' }}
              </div>
              <p class="opacity-80 text-text-light dark:text-text-dark">
                最终得分：<strong>{{ state.score }}</strong>
                <span class="opacity-60 ml-2">· {{ state.lines }} 行 · Lv {{ state.level }} · {{ state.moveCount }} 步</span>
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
                  class="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-500 text-gray-900 font-bold shadow-claude-md transition-all active:scale-95"
                >
                  🔄 再来一局
                </button>
              </div>
            </div>
          </div>

          <!-- 就绪遮罩 -->
          <div
            v-if="!started && !state.over"
            class="absolute inset-0 rounded-2xl flex items-center justify-center bg-bg-light/70 dark:bg-bg-dark/70 backdrop-blur-sm"
          >
            <!-- 有自动存档：提供继续/重开 -->
            <div v-if="showResume" class="text-center space-y-3 px-4">
              <div class="text-3xl md:text-4xl font-extrabold text-cyan-600 dark:text-cyan-300">🕹️ 上次进度还在</div>
              <p class="text-sm opacity-70 text-text-light dark:text-text-dark">
                得分 {{ pendingAutosave?.score }} · {{ pendingAutosave?.lines }} 行 · Lv {{ pendingAutosave?.level }}，继续挑战？
              </p>
              <div class="flex gap-3 justify-center flex-wrap">
                <button
                  @click="resumeGame"
                  class="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-500 text-gray-900 font-bold shadow-claude-md transition-all active:scale-95"
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
              <div class="text-3xl md:text-4xl font-extrabold text-cyan-600 dark:text-cyan-300">▶️ 准备好了吗？</div>
              <p class="text-sm opacity-70 text-text-light dark:text-text-dark">
                按 <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">方向键</kbd>
                / <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">空格</kbd> 开始
              </p>
              <button
                @click="start"
                class="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-500 text-gray-900 font-bold shadow-claude-md transition-all active:scale-95"
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

        <!-- 侧栏：下一个方块预览 -->
        <div class="flex flex-col items-center">
          <div class="text-xs opacity-70 mb-1 font-semibold">下一个</div>
          <div class="flex flex-col gap-2">
            <div
              v-for="(piece, idx) in previewPieces"
              :key="idx"
              class="rounded-lg bg-white/50 dark:bg-bg-dark/40 shadow-inner p-1.5"
              :style="{ width: previewBoxPx, height: previewBoxPx }"
            >
              <div class="w-full h-full grid" :style="{ gridTemplateColumns: `repeat(4, 1fr)`, gap: '1px' }">
                <div
                  v-for="i in 16"
                  :key="i - 1"
                  class="rounded-[2px]"
                  :class="previewCellClass(piece, i - 1, false)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 移动端操作说明 -->
      <div class="text-center text-xs opacity-60 mt-4 sm:hidden">
        👆 点击棋盘旋转 · 左右滑动移动 · 下滑软降 · 上滑硬降
      </div>

      <!-- 移动端触控按钮 -->
      <div class="grid grid-cols-6 gap-2 mt-3 sm:hidden max-w-[380px] mx-auto w-full">
        <button
          @click="touchMove('left')"
          class="aspect-square rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude active:scale-90 active:bg-cyan-100 dark:active:bg-cyan-900/40 transition-all text-xl font-bold text-text-light dark:text-text-dark flex items-center justify-center"
          aria-label="左移"
        >◀</button>
        <button
          @click="touchMove('right')"
          class="aspect-square rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude active:scale-90 active:bg-cyan-100 dark:active:bg-cyan-900/40 transition-all text-xl font-bold text-text-light dark:text-text-dark flex items-center justify-center"
          aria-label="右移"
        >▶</button>
        <button
          @click="touchRotate"
          class="aspect-square rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude active:scale-90 active:bg-cyan-100 dark:active:bg-cyan-900/40 transition-all text-xl font-bold text-text-light dark:text-text-dark flex items-center justify-center"
          aria-label="旋转"
        >↻</button>
        <button
          @click="touchSoftDrop"
          class="aspect-square rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude active:scale-90 active:bg-cyan-100 dark:active:bg-cyan-900/40 transition-all text-xl font-bold text-text-light dark:text-text-dark flex items-center justify-center"
          aria-label="软降"
        >▼</button>
        <button
          @click="touchHardDrop"
          class="aspect-square rounded-xl bg-cyan-400 hover:bg-cyan-500 text-gray-900 shadow-claude-md active:scale-90 transition-all text-xl font-bold flex items-center justify-center"
          aria-label="硬降"
        >⏬</button>
        <button
          @click="touchHold"
          :disabled="state.over || !started || !state.canHold"
          class="aspect-square rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude active:scale-90 active:bg-cyan-100 dark:active:bg-cyan-900/40 transition-all text-xl font-bold text-text-light dark:text-text-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="暂存"
        >🤚</button>
      </div>
    </main>

    <footer class="max-w-3xl w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <TetrisSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="俄罗斯方块">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li><kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">←→</kbd>/<kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">A D</kbd> 左右移动，<kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">↑/W/X</kbd> 旋转，<kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">↓</kbd> 软降，<kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">空格</kbd> 硬降，<kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">C</kbd> 暂存，<kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs shadow-sm">P</kbd> 暂停</li>
        <li>七种方块依次下落（Bag-7 随机），填满一整行即<strong>消除得分</strong></li>
        <li>消行越多等级越高、下落越快、得分越多</li>
        <li>达到目标行数即<strong>获胜</strong>（设置里可调）；方块堆到顶部则失败</li>
        <li>💡 <strong>鬼影</strong>显示落点，<strong>Hold</strong> 可暂存当前方块备用</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="俄罗斯方块"
      :dimensions="leaderboardDimensions"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { TetrisEngine } from '../../game/tetris/GameEngine'
import type { TetrisState, TetrisConfig, SpeedTier, Direction, Rotation } from '../../game/tetris/types'
import { SPEED_LABELS, TETROMINOES } from '../../game/tetris/types'
import { useTetrisSettingsStore } from '../../stores/tetris-settings'
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
import TetrisSettingsPanel from './components/TetrisSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useTetrisSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'tetris'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
const started = ref(false)
/** 玩法说明弹层 */
const showHowTo = ref(false)
// 维度：speed 映射到 difficulty 字段，targetLines 作为「尺寸」维度（影响难度）
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
    label: '目标行数',
    values: [
      { value: 0, label: '∞ 无尽' },
      { value: 10, label: '10' },
      { value: 20, label: '20' },
      { value: 40, label: '40' },
      { value: 150, label: '150' },
    ],
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
    size: settings.config.targetLines,
    moves: state.moveCount,
    duration,
    won: state.won,
  })
}

// ===== 自动存档：误退/刷新后可继续上次进度 =====
const AUTOSAVE_GAME_ID = 'tetris'
const pendingAutosave = loadAutosave<TetrisState>(AUTOSAVE_GAME_ID)
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
const engine = shallowRef(new TetrisEngine(settings.config))
const state = reactive<TetrisState>(engine.value.getState())

/** 消行白闪（短暂高亮反馈） */
const lineFlash = ref(false)
let lineFlashTimer: ReturnType<typeof setTimeout> | null = null
function flashLines() {
  lineFlash.value = true
  if (lineFlashTimer) clearTimeout(lineFlashTimer)
  lineFlashTimer = setTimeout(() => (lineFlash.value = false), 280)
}

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(2)
const padding = ref(4)
const cellPx = ref(24)

const boardStyle = computed(() => {
  const w = state.width * cellPx.value + (state.width - 1) * gap.value + padding.value * 2
  const h = state.height * cellPx.value + (state.height - 1) * gap.value + padding.value * 2
  return {
    width: `${w}px`,
    height: `${h}px`,
    padding: `${padding.value}px`,
  }
})

const previewBoxPx = computed(() => {
  // 4×4 mini grid，每格 16px + padding
  const inner = 4 * 16 + 3 * 1 + 2 * 6
  return `${inner}px`
})

const gapPx = computed(() => `${gap.value}px`)

const speedLabel = computed(() => SPEED_LABELS[settings.config.speed])

/** 预览下一个方块的类型数组（截取前 N 个） */
const previewPieces = computed(() => state.next.slice(0, state.previewCount))

/**
 * 计算 (row, col) 处单元格应使用的 CSS 类
 * 优先级：当前活动方块 > 鬼影 > 已锁定格 > 空
 */
const cellMap = computed(() => {
  // 已锁定格
  const locked = new Map<string, number>()
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.grid[y][x] !== 0) locked.set(`${x},${y}`, state.grid[y][x])
    }
  }
  // 当前活动方块
  const active = new Set<string>()
  if (state.current) {
    for (const [dx, dy] of TETROMINOES[state.current.type].rotations[state.current.rotation]) {
      const x = state.current.x + dx
      const y = state.current.y + dy
      if (y >= 0) active.add(`${x},${y}`)
    }
  }
  // 鬼影
  const ghost = new Set<string>()
  if (state.current && state.ghostY >= 0) {
    for (const [dx, dy] of TETROMINOES[state.current.type].rotations[state.current.rotation]) {
      const x = state.current.x + dx
      const y = state.ghostY + dy
      if (y >= 0 && !active.has(`${x},${y}`)) ghost.add(`${x},${y}`)
    }
  }
  return { locked, active, ghost }
})

function cellClass(idx: number): string {
  const x = idx % state.width
  const y = Math.floor(idx / state.width)
  const { locked, active, ghost } = cellMap.value
  if (active.has(`${x},${y}`)) {
    return pieceColorClass(state.current!.type, true)
  }
  if (locked.has(`${x},${y}`)) {
    return pieceColorClass(locked.get(`${x},${y}`)!, true)
  }
  if (ghost.has(`${x},${y}`)) {
    return pieceColorClass(state.current!.type, false)
  }
  return 'cell-bg-light dark:cell-bg-dark'
}

/** 预览方块格子的 CSS 类（4×4 mini grid 中索引 0~15） */
function previewCellClass(pieceType: number | null, idx: number, dim: boolean): string {
  if (pieceType === null) return 'bg-transparent'
  const x = idx % 4
  const y = Math.floor(idx / 4)
  const cells = TETROMINOES[pieceType].rotations[0]
  const isOn = cells.some(([cx, cy]) => cx === x && cy === y)
  if (!isOn) return 'bg-transparent'
  return pieceColorClass(pieceType, !dim)
}

/** 方块颜色 → CSS 类（按类型 id 1~7） */
function pieceColorClass(typeId: number, solid: boolean): string {
  if (solid) {
    switch (typeId) {
      case 1: return 'bg-cyan-400 dark:bg-cyan-300 shadow-sm' // I
      case 2: return 'bg-yellow-400 dark:bg-yellow-300 shadow-sm' // O
      case 3: return 'bg-purple-500 dark:bg-purple-400 shadow-sm' // T
      case 4: return 'bg-green-500 dark:bg-green-400 shadow-sm' // S
      case 5: return 'bg-red-500 dark:bg-red-400 shadow-sm' // Z
      case 6: return 'bg-blue-600 dark:bg-blue-400 shadow-sm' // J
      case 7: return 'bg-orange-500 dark:bg-orange-400 shadow-sm' // L
      default: return 'bg-gray-400'
    }
  }
  // 鬼影：半透明轮廓
  switch (typeId) {
    case 1: return 'bg-cyan-400/20 border border-cyan-400/50'
    case 2: return 'bg-yellow-400/20 border border-yellow-400/50'
    case 3: return 'bg-purple-500/20 border border-purple-500/50'
    case 4: return 'bg-green-500/20 border border-green-500/50'
    case 5: return 'bg-red-500/20 border border-red-500/50'
    case 6: return 'bg-blue-600/20 border border-blue-600/50'
    case 7: return 'bg-orange-500/20 border border-orange-500/50'
    default: return 'bg-gray-400/20 border border-gray-400/50'
  }
}

function syncState() {
  const s = engine.value.getState()
  state.grid = s.grid.map((row) => [...row])
  state.current = s.current ? { ...s.current } : null
  state.next = [...s.next]
  state.hold = s.hold
  state.canHold = s.canHold
  state.ghostY = s.ghostY
  state.score = s.score
  state.bestScore = s.bestScore
  state.level = s.level
  state.lines = s.lines
  state.over = s.over
  state.won = s.won
  state.paused = s.paused
  state.tickInterval = s.tickInterval
  state.moveCount = s.moveCount
  state.startTime = s.startTime
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
    const prevLines = state.lines
    const prevLevel = state.level
    engine.value.step()
    syncState()
    // 升级提示
    if (state.level > prevLevel) toast(`⬆️ 升级到 Lv ${state.level}，加速了！`)
    // 音效：消行 / 通关 / 游戏结束（引擎胜利时 won=true 且 over=true，先判 won）
    if (state.lines > prevLines) {
      sound.play('line')
      flashLines()
    }
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

function start() {
  if (started.value || state.over) return
  started.value = true
  sound.play('start')
  scheduleTick()
}

/** 分享本局成绩 */
async function shareResult() {
  const result = await shareOrCopy({
    text: gameShareText('tetris', state.score, state.lines, state.won),
    url: shareUrl('/game/tetris'),
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
  sound.play('pause')
  syncState()
  // 暂停瞬间也落盘，暂停后离开页面可原样恢复
  if (!state.over) autosaver.flush()
  if (!state.paused && !state.over && !tickTimer) {
    scheduleTick()
  }
}

function applySettings(config: TetrisConfig) {
  engine.value = new TetrisEngine(config)
  syncState()
  lastSubmittedOverScore = -1
  stopTick()
  started.value = false
  // 设置变更视为放弃旧局面
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

function hold() {
  engine.value.hold()
  syncState()
}

// ===== 键盘操作 =====
function onKeydown(e: KeyboardEvent) {
  // 设置/排行榜弹窗打开时忽略游戏按键，避免误操作背后的棋盘
  if (settings.showSettings || showLeaderboard.value) return
  const moveMap: Record<string, Direction> = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down',
    a: 'left', A: 'left', d: 'right', D: 'right', s: 'down', S: 'down',
  }
  const rotateMap: Record<string, Rotation> = {
    ArrowUp: 'cw', w: 'cw', W: 'cw', x: 'cw', X: 'cw',
    z: 'ccw', Z: 'ccw',
  }
  const k = e.key
  if (moveMap[k]) {
    e.preventDefault()
    if (state.over) return
    if (!started.value) beginOrResume()
    if (engine.value.move(moveMap[k])) sound.play('move')
    syncState()
    return
  }
  if (rotateMap[k]) {
    e.preventDefault()
    if (state.over) return
    if (!started.value) beginOrResume()
    if (engine.value.rotate(rotateMap[k])) sound.play('rotate')
    syncState()
    return
  }
  if (k === ' ') {
    e.preventDefault()
    if (state.over) return
    if (!started.value) {
      beginOrResume()
      return
    }
    if (settings.config.hardDrop) {
      if (engine.value.hardDrop()) sound.play('drop')
    } else {
      if (engine.value.move('down')) sound.play('move')
    }
    syncState()
    return
  }
  if (k === 'c' || k === 'C' || k === 'Shift') {
    e.preventDefault()
    if (state.over || !started.value) return
    if (engine.value.hold()) sound.play('click')
    syncState()
    return
  }
  if (k === 'p' || k === 'P' || k === 'Escape') {
    e.preventDefault()
    if (!started.value) {
      beginOrResume()
      return
    }
    togglePause()
    return
  }
}

// ===== 触摸操作 =====
let touchStart: { x: number; y: number; t: number } | null = null
const SWIPE_MIN = 24
const TAP_MAX = 12
const LONG_PRESS_MS = 400

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  const t = e.touches[0]
  touchStart = { x: t.clientX, y: t.clientY, t: Date.now() }
}

function onTouchEnd(e: TouchEvent) {
  if (!touchStart) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStart.x
  const dy = t.clientY - touchStart.y
  const elapsed = Date.now() - touchStart.t
  touchStart = null
  if (state.over) return
  if (!started.value) {
    beginOrResume()
    return
  }
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  // 点击（短距离）→ 旋转
  if (Math.max(adx, ady) < TAP_MAX) {
    if (engine.value.rotate('cw')) sound.play('rotate')
    syncState()
    return
  }
  // 长按 → hold
  if (elapsed > LONG_PRESS_MS && Math.max(adx, ady) < TAP_MAX * 2) {
    if (engine.value.hold()) sound.play('click')
    syncState()
    return
  }
  if (Math.max(adx, ady) < SWIPE_MIN) return
  if (adx > ady) {
    if (engine.value.move(dx > 0 ? 'right' : 'left')) sound.play('move')
  } else if (dy > 0) {
    // 下滑 → 软降 1 格
    if (engine.value.move('down')) sound.play('move')
  } else {
    // 上滑 → 硬降
    if (engine.value.hardDrop()) sound.play('drop')
  }
  syncState()
}

// ===== 移动端触控按钮（小屏专用，与键盘/滑动等价） =====
function touchEnsureStarted(): boolean {
  if (state.over) return false
  if (!started.value) {
    beginOrResume()
    return started.value
  }
  return true
}

function touchMove(dir: Direction) {
  if (!touchEnsureStarted()) return
  if (engine.value.move(dir)) sound.play('move')
  syncState()
}

function touchRotate() {
  if (!touchEnsureStarted()) return
  if (engine.value.rotate('cw')) sound.play('rotate')
  syncState()
}

function touchSoftDrop() {
  if (!touchEnsureStarted()) return
  if (engine.value.move('down')) sound.play('move')
  syncState()
}

function touchHardDrop() {
  if (!touchEnsureStarted()) return
  if (engine.value.hardDrop()) sound.play('drop')
  syncState()
}

function touchHold() {
  if (state.over || !started.value) return
  if (engine.value.hold()) sound.play('click')
  syncState()
}

// ===== 响应式单元格尺寸（屏幕宽度自适应） =====
function updateLayout() {
  const w = window.innerWidth
  const h = window.innerHeight
  // 棋盘宽 10 列、高 20 行，长宽比 1:2，需根据屏幕高度和宽度同时约束
  // 预留：顶部栏+分数+按钮 ≈ 240px，侧栏宽度 ≈ 90px
  const sideReserved = w >= 640 ? 220 : 0
  const verticalReserved = 260
  const maxByWidth = Math.floor((w - 40 - sideReserved) / 10)
  const maxByHeight = Math.floor((h - verticalReserved) / 20)
  let cell = Math.min(maxByWidth, maxByHeight)
  // 兜底
  cell = Math.max(14, Math.min(34, cell))
  cellPx.value = cell
  gap.value = cell >= 24 ? 2 : 1
  padding.value = Math.max(3, Math.floor(cell / 8))
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
})

onBeforeUnmount(() => {
  stopTick()
  if (lineFlashTimer) clearTimeout(lineFlashTimer)
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
/* 消行白闪 */
@keyframes lineFlash {
  0% {
    opacity: 0.55;
  }
  100% {
    opacity: 0;
  }
}
.line-flash {
  animation: lineFlash 0.28s ease-out forwards;
}
/* tetris 不需要额外样式，靠 tailwind 工具类 */
</style>

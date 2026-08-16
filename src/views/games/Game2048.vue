<template>
  <div class="min-h-screen w-full py-4 px-3 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-xl w-full mx-auto flex items-center justify-between mb-5">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-accent-light/40 dark:hover:border-accent-dark/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🎯 2048</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-accent-light/40 dark:hover:border-accent-dark/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-accent-light/40 dark:hover:border-accent-dark/40 transition-all active:scale-95 flex items-center justify-center"
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
            {{ winLabel }}
          </h1>
          <p class="text-xs opacity-70 mt-1 text-text-muted-light dark:text-text-muted-dark">
            {{ state.size }}×{{ state.size }} · {{ difficultyLabel }}
            <span v-if="isCakeSkin"> · 🧁 小蛋糕版</span>
          </p>
        </div>
        <div class="flex gap-2">
          <ScoreBox label="分数" :value="state.score" />
          <ScoreBox label="最高分" :value="state.bestScore" accent />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center justify-between mb-4 gap-2">
        <!-- 小屏：键盘提示隐藏，按钮组占满整行 -->
        <!-- 大屏：左侧提示，右侧按钮 -->
        <div class="text-xs opacity-70 hidden sm:block text-text-muted-light dark:text-text-muted-dark">
          键盘 <kbd class="px-1.5 py-0.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark shadow-sm">↑↓←→</kbd>
          或手机滑动操作
        </div>
        <div class="flex gap-2 w-full sm:w-auto justify-end">
          <button
            @click="undo"
            :disabled="!canUndo"
            class="px-4 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-accent-light/40 dark:hover:border-accent-dark/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            ↩️ 撤销
          </button>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-accent-light dark:bg-accent-dark hover:bg-accent-hover-light dark:hover:bg-accent-hover-dark text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
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
        <!-- 背景格 -->
        <div
          class="grid w-full h-full"
          :style="{ gridTemplateColumns: `repeat(${state.size}, 1fr)`, gap: gapPx }"
        >
          <div
            v-for="i in state.size * state.size"
            :key="'bg-' + i"
            class="rounded-xl cell-bg-light dark:cell-bg-dark"
          ></div>
        </div>

        <!-- 方块层（绝对定位 + left/top 百分比，平滑过渡） -->
        <div class="absolute" :style="tileLayerStyle">
          <div
            v-for="tile in allTiles"
            :key="tile.id"
            class="absolute tile-move"
            :style="tileStyle(tile)"
          >
            <div
              class="w-full h-full rounded-xl flex items-center justify-center font-bold tile-shadow will-change-transform"
              :class="[tileClass(tile.value), tileAnimClass(tile)]"
            >
              <span v-if="isCakeSkin" class="tile-emoji">{{ tileDisplay(tile.value) }}</span>
              <span v-else class="min-w-0 overflow-hidden whitespace-nowrap px-1" :class="tileTextClass(tile.value)">{{ tile.value }}</span>
            </div>
          </div>
        </div>

        <!-- 自动存档恢复遮罩 -->
        <div
          v-if="showResume"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-bg-light/70 dark:bg-bg-dark/70"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-3xl md:text-4xl font-extrabold text-text-light dark:text-text-dark">🕹️ 上次进度还在</div>
            <p class="opacity-80 text-text-light dark:text-text-dark text-sm">上次游戏尚未完成，是否继续？</p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                @click="resumeGame"
                class="px-5 py-2.5 rounded-xl bg-accent-light dark:bg-accent-dark hover:bg-accent-hover-light dark:hover:bg-accent-hover-dark text-white font-bold shadow-claude-md transition-all active:scale-95"
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

        <!-- 游戏结束遮罩 -->
        <div
          v-if="state.over || activeWin"
          class="absolute inset-0 rounded-2xl flex items-center justify-center backdrop-blur-sm"
          :class="state.over ? 'bg-bg-light/80 dark:bg-bg-dark/80' : 'bg-accent-light/70'"
        >
          <div class="text-center space-y-4 px-4">
            <div class="text-4xl md:text-5xl font-extrabold" :class="state.over ? 'text-text-light dark:text-text-dark' : 'text-white'">
              {{ activeWin ? '🎉 你赢了！' : '💤 游戏结束' }}
            </div>
            <p class="opacity-80 text-text-light dark:text-text-dark">最终得分：<strong>{{ state.score }}</strong></p>
            <div class="flex gap-3 justify-center flex-wrap">
              <button
                v-if="activeWin"
                @click="continueGame"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                继续挑战
              </button>
              <button
                @click="shareResult"
                class="px-5 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-bold shadow-claude hover:shadow-claude-md transition-all active:scale-95"
              >
                📤 分享成绩
              </button>
              <button
                @click="newGame"
                class="px-5 py-2.5 rounded-xl bg-accent-light dark:bg-accent-dark hover:bg-accent-hover-light dark:hover:bg-accent-hover-dark text-white font-bold shadow-claude-md transition-all active:scale-95"
              >
                🔄 再来一局
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作说明（小屏） -->
      <div class="text-center text-xs opacity-60 mt-4 sm:hidden">
        👆 在棋盘上滑动手指即可移动方块
      </div>
    </main>

    <footer class="max-w-xl w-full mx-auto mt-6 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <SettingsPanel @apply="applySettings" />

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="2048"
      :dimensions="leaderboardDimensions"
      size-suffix="×"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { Game2048Engine } from '../../game/2048/GameEngine'
import type { Game2048State, Tile, Direction, Game2048Config, Difficulty } from '../../game/2048/types'
import { DIFFICULTY_LABELS, CAKE_EMOJI, CAKE_OVERFLOW_EMOJI } from '../../game/2048/types'
import { useGame2048SettingsStore, SIZE_OPTIONS } from '../../stores/game2048-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { StorageAdapter } from '../../adapters/StorageAdapter'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { genEntryId, type LeaderboardDimension, type LeaderboardEntry } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl, gameShareText } from '../../utils/share'
import { toast } from '../../utils/toast'
import ScoreBox from './components/ScoreBox.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useGame2048SettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = '2048'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
// 排行榜维度配置：与 2048 的设置项保持一致
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['easy', 'normal', 'hard', 'nightmare'] as Difficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
  {
    key: 'size',
    label: '尺寸',
    values: SIZE_OPTIONS.map((s) => ({ value: s, label: `${s}×${s}` })),
  },
]
// 用于去重：每次游戏结束只入榜一次，避免重复触发
let lastSubmittedOverScore = -1

/**
 * 把历史 best 分数迁移到排行榜。
 * 历史键格式：easygame-2048-best-${size}-${difficulty}，值为 number。
 * 仅在排行榜为空时执行一次。
 */
function migrateLegacyBest() {
  if (leaderboard.entries.length > 0) return
  const records: LeaderboardEntry[] = []
  for (const size of SIZE_OPTIONS) {
    for (const difficulty of ['easy', 'normal', 'hard', 'nightmare'] as Difficulty[]) {
      const key = `easygame-2048-best-${size}-${difficulty}`
      const best = StorageAdapter.get<number>(key)
      if (typeof best === 'number' && best > 0) {
        records.push({
          id: genEntryId(),
          playerName: '历史最佳',
          score: best,
          timestamp: 0, // 迁移记录用 0 标记，时间排序时排在最后
          difficulty,
          size,
          won: false,
        })
      }
    }
  }
  if (records.length > 0) {
    leaderboard.seedEntries(records)
  }
}

/** 游戏结束时把本局分数加入排行榜（每个 game-over 只入一次） */
function submitScoreIfOver() {
  if (!state.over) return
  if (state.score === lastSubmittedOverScore) return
  lastSubmittedOverScore = state.score
  leaderboard.addEntry({
    score: state.score,
    difficulty: settings.config.difficulty,
    size: settings.config.size,
    won: state.won,
  })
}

// 用 shallowRef 持有引擎实例（非响应式，避免深层代理开销）
const engine = shallowRef(new Game2048Engine(settings.config))
const state = reactive<Game2048State>(engine.value.getState())
const canUndo = ref(false)
/** 胜利音效去重：每局只响一次（继续挑战后 won 仍为 true） */
const winSoundPlayed = ref(false)

// ===== 自动存档：误退/刷新后可继续上次进度 =====
const AUTOSAVE_GAME_ID = '2048'
const pendingAutosave = loadAutosave<Game2048State>(AUTOSAVE_GAME_ID)
/** 是否显示「继续上次」弹窗（存在未完成存档且未结束） */
const showResume = ref(false)
if (pendingAutosave && !pendingAutosave.over) {
  showResume.value = true
}

/** 保存当前局面（engine 为状态唯一来源，直接取 getState 序列化） */
function persistAutosave() {
  saveAutosave(AUTOSAVE_GAME_ID, engine.value.getState())
}

function resumeGame() {
  if (!pendingAutosave) return
  engine.value.loadState(pendingAutosave)
  syncState()
  updateLayout() // 存档棋盘尺寸可能与当前设置不同
  showResume.value = false
}

function discardAutosave() {
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
  engine.value.reset()
  syncState()
  updateLayout()
}

/** 页面切后台/关闭时兜底保存 */
function onVisibilityChange() {
  if (document.visibilityState === 'hidden' && !state.over) persistAutosave()
}
function onPageHide() {
  if (!state.over) persistAutosave()
}

const boardRef = ref<HTMLDivElement | null>(null)
const gap = ref(12)
const padding = ref(12)

// 棋盘容器样式：根据尺寸动态调整最大宽度
const boardStyle = computed(() => {
  const n = state.size
  // 尺寸越大，棋盘越小，确保在各种屏幕都能完整显示
  const maxW = n <= 4 ? 480 : n <= 5 ? 420 : n <= 6 ? 380 : 340
  return {
    width: '100%',
    maxWidth: `${maxW}px`,
    aspectRatio: '1 / 1',
    padding: `${padding.value}px`,
  }
})

// 方块层 inset 等于 padding
const tileLayerStyle = computed(() => ({
  top: `${padding.value}px`,
  left: `${padding.value}px`,
  right: `${padding.value}px`,
  bottom: `${padding.value}px`,
}))

const gapPx = computed(() => `${gap.value}px`)

/**
 * 方块定位：用 left/top 百分比定位（百分比相对父容器），
 * 通过 transition 实现平滑移动动画。
 */
function tileStyle(tile: Tile) {
  const n = state.size
  const g = gap.value
  // 每格尺寸 = (100% - gap*(n-1)) / n
  const cell = `calc((100% - ${g * (n - 1)}px) / ${n})`
  const left = `calc(${cell} * ${tile.col} + ${g * tile.col}px)`
  const top = `calc(${cell} * ${tile.row} + ${g * tile.row}px)`
  return {
    width: cell,
    height: cell,
    left,
    top,
  }
}

const allTiles = computed(() => {
  const list: Tile[] = []
  for (const row of state.grid) {
    for (const tile of row) {
      if (tile) list.push(tile)
    }
  }
  return list
})

const winLabel = computed(() => {
  const v = settings.config.winValue
  if (isCakeSkin.value) return v > 0 ? (CAKE_EMOJI[v] ?? CAKE_OVERFLOW_EMOJI) : '✨∞'
  return v > 0 ? v : '∞'
})

// 当前是否处于“刚赢、等待玩家选择”状态：继续挑战后 keepPlaying=true 即关闭遮罩
const activeWin = computed(() => state.won && !state.keepPlaying)

const difficultyLabel = computed(() => DIFFICULTY_LABELS[settings.config.difficulty])

const isCakeSkin = computed(() => settings.config.skin === 'cake')

/** 方块内容展示：cake 皮肤下返回 emoji，经典皮肤下保留数字（此处仅提供 cake 查询） */
function tileDisplay(value: number): string {
  return CAKE_EMOJI[value] ?? CAKE_OVERFLOW_EMOJI
}

const tileValueColors: Record<number, string> = {
  2: 'bg-tile-2',
  4: 'bg-tile-4',
  8: 'bg-tile-8',
  16: 'bg-tile-16',
  32: 'bg-tile-32',
  64: 'bg-tile-64',
  128: 'bg-tile-128',
  256: 'bg-tile-256',
  512: 'bg-tile-512',
  1024: 'bg-tile-1024',
  2048: 'bg-tile-2048',
  4096: 'bg-tile-4096',
  8192: 'bg-tile-8192',
}

function tileClass(value: number): string {
  if (tileValueColors[value]) return tileValueColors[value]
  return 'bg-purple-600 dark:bg-purple-500 text-white'
}

// 字号二维表：按棋盘尺寸 × 数字位数查表，避免字符串 replace 脆弱匹配
const TILE_FONT_TABLE: Record<number, Record<number, string>> = {
  4: { 1: 'text-4xl md:text-5xl', 2: 'text-4xl md:text-5xl', 3: 'text-3xl md:text-4xl', 4: 'text-2xl md:text-3xl', 5: 'text-xl md:text-2xl', 6: 'text-lg md:text-xl' },
  5: { 1: 'text-3xl md:text-4xl', 2: 'text-3xl md:text-4xl', 3: 'text-2xl md:text-3xl', 4: 'text-xl md:text-2xl', 5: 'text-lg md:text-xl',  6: 'text-base md:text-lg' },
  6: { 1: 'text-2xl md:text-3xl', 2: 'text-2xl md:text-3xl', 3: 'text-xl md:text-2xl', 4: 'text-lg md:text-xl',  5: 'text-base md:text-lg', 6: 'text-sm md:text-base' },
  7: { 1: 'text-xl md:text-2xl',  2: 'text-xl md:text-2xl',  3: 'text-lg md:text-xl',  4: 'text-base md:text-lg', 5: 'text-sm md:text-base',  6: 'text-xs md:text-sm' },
}

function tileTextClass(value: number): string {
  const n = state.size
  const digits = String(value).length
  const table = TILE_FONT_TABLE[n] ?? TILE_FONT_TABLE[7]
  const base = table[digits] ?? table[6] ?? 'text-sm md:text-base'
  if (value <= 4) return `tile-text-light ${base}`
  return `tile-text-dark ${base}`
}

function tileAnimClass(tile: Tile): string {
  if (tile.isNew) return 'animate-tile-pop'
  if (tile.isMerged) return 'animate-tile-merge'
  return ''
}

function syncState() {
  const s = engine.value.getState()
  // 深拷贝 grid：引擎直接操作原始对象绕过了 Vue reactive 代理，
  // 必须创建新的 tile 引用才能触发响应式更新与位置动画
  state.grid = s.grid.map((row) => row.map((t) => (t ? { ...t } : null)))
  state.score = s.score
  state.bestScore = s.bestScore
  state.won = s.won
  state.over = s.over
  state.keepPlaying = s.keepPlaying
  state.size = s.size
  canUndo.value = engine.value.canUndo()
}

function doMove(dir: Direction) {
  if (state.over) return
  if (state.won && !state.keepPlaying) return
  const moved = engine.value.move(dir)
  if (moved) {
    const prevScore = state.score
    syncState()
    // 音效：本步发生合并（分数增加）播 merge，否则播 move
    if (state.score > prevScore) sound.play('merge')
    else sound.play('move')
    if (state.won && !winSoundPlayed.value) {
      winSoundPlayed.value = true
      sound.play('win')
    }
    if (state.over) sound.play('over')
    // 自动存档：结束清档，否则保存最新局面
    if (state.over) clearAutosave(AUTOSAVE_GAME_ID)
    else persistAutosave()
    // 游戏结束自动入榜（每个 game-over 只入一次，由 lastSubmittedOverScore 去重）
    submitScoreIfOver()
  }
}

function newGame() {
  engine.value.reset()
  syncState()
  // 重置入榜去重标记，允许本局重新入榜
  lastSubmittedOverScore = -1
  winSoundPlayed.value = false
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

function undo() {
  if (engine.value.undo()) {
    syncState()
    // 撤销可能让 game-over 状态回退，允许重新入榜
    if (!state.over) lastSubmittedOverScore = -1
    if (state.over) clearAutosave(AUTOSAVE_GAME_ID)
    else persistAutosave()
  }
}

function continueGame() {
  engine.value.continueAfterWin()
  syncState()
  persistAutosave()
}

/** 应用设置：重建引擎并重新开始 */
function applySettings(config: Game2048Config) {
  engine.value = new Game2048Engine(config)
  syncState()
  // 尺寸变化时 gap/padding 需要按新尺寸重算
  updateLayout()
  lastSubmittedOverScore = -1
  winSoundPlayed.value = false
  // 设置变更视为放弃旧局面
  clearAutosave(AUTOSAVE_GAME_ID)
  showResume.value = false
}

/** 分享本局成绩 */
async function shareResult() {
  const result = await shareOrCopy({
    text: gameShareText('2048', state.score, undefined, state.won),
    url: shareUrl('/game/2048'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

// ===== 键盘操作 =====
function onKeydown(e: KeyboardEvent) {
  // 设置/排行榜弹窗打开时忽略游戏按键，避免误操作背后的棋盘
  if (settings.showSettings || showLeaderboard.value) return
  const map: Record<string, Direction> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
  }
  const dir = map[e.key]
  if (dir) {
    e.preventDefault()
    // 有「继续上次」弹窗时，方向键 = 继续上次（与贪吃蛇/俄罗斯方块行为一致）
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
  if (Math.abs(dx) > Math.abs(dy)) {
    doMove(dx > 0 ? 'right' : 'left')
  } else {
    doMove(dy > 0 ? 'down' : 'up')
  }
}

// ===== 响应式 gap/padding（屏幕宽度 × 棋盘尺寸 双维度） =====
// 屏幕档位：mobile(<480) / tablet(<768) / desktop(>=768)
// 棋盘越大 gap 越小，让单格尺寸保持稳定，避免 6×6/7×7 在大屏上格子被间隙挤掉
const GAP_TABLE: Record<'mobile' | 'tablet' | 'desktop', Record<number, number>> = {
  mobile:  { 4: 8,  5: 7,  6: 6,  7: 5  },
  tablet:  { 4: 10, 5: 8,  6: 7,  7: 6  },
  desktop: { 4: 12, 5: 10, 6: 8,  7: 7  },
}

function updateLayout() {
  const w = window.innerWidth
  const tier: 'mobile' | 'tablet' | 'desktop' = w < 480 ? 'mobile' : w < 768 ? 'tablet' : 'desktop'
  const n = state.size
  const table = GAP_TABLE[tier]
  const g = table[n] ?? (n >= 7 ? table[7] : table[4])
  gap.value = g
  // padding = gap + 4，保持视觉层次（边框比内部间距略大）
  padding.value = g + 4
}

onMounted(() => {
  updateLayout()
  syncState()
  // 历史最高分迁移到排行榜（仅首次执行一次）
  migrateLegacyBest()
  // 若初始状态已是 game-over（极少见，但保险），也允许入榜
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
  // 离开页面兜底保存
  if (!state.over) persistAutosave()
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
/* 外层：负责 left/top 定位 + 移动过渡 */
.tile-move {
  transition: left 0.13s cubic-bezier(0.25, 1, 0.5, 1),
              top 0.13s cubic-bezier(0.25, 1, 0.5, 1);
}
/* 内层：阴影 + 动画（transform scale 不影响定位） */
.tile-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
/* cake 皮肤的 emoji 大小根据棋盘尺寸自适应，比字号表略缩以贴合方块 */
.tile-emoji {
  line-height: 1;
}
.grid {
  /* 从父级的 state.size 派生，使用 @container 不方便，这里通过 n-响应式字号表实现 */
}
/* 用 CSS 规则覆盖：在不同棋盘尺寸下给 tile-emoji 一个合适的字号。
   因为棋盘本身已经通过 maxWidth 调整，直接使用相对 em 基准更稳妥。
   以 text 字号表为参照，给 emoji 一个稍大但不过分溢出的尺寸。 */
.tile-emoji {
  font-size: clamp(1.1rem, 5.2vmin, 2.4rem);
}
@media (min-width: 640px) {
  .tile-emoji {
    font-size: clamp(1.4rem, 4.6vmin, 3rem);
  }
}
</style>

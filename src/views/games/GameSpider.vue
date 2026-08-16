<template>
  <div class="min-h-screen w-full py-4 px-2 md:px-6 flex flex-col">
    <!-- 顶部栏 -->
    <header class="max-w-3xl w-full mx-auto flex items-center justify-between mb-4">
      <RouterLink to="/" class="flex items-center gap-2 group">
        <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-purple-400/40 transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
          ←
        </button>
      </RouterLink>
      <div class="text-lg font-bold text-text-light dark:text-text-dark">🕷️ 蜘蛛纸牌</div>
      <div class="flex gap-2">
        <button
          @click="showLeaderboard = true"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-purple-400/40 transition-all active:scale-95 flex items-center justify-center"
          aria-label="排行榜"
        >
          🏆
        </button>
        <button
          @click="settings.openSettings()"
          class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-purple-400/40 transition-all active:scale-95 flex items-center justify-center"
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
      <!-- 信息栏 -->
      <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[64px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">分数</span>
            <span class="text-lg font-bold tabular-nums text-purple-600 dark:text-purple-400">{{ state.score }}</span>
          </div>
          <div class="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[64px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">完成</span>
            <span class="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{{ state.completed }}/8</span>
          </div>
          <div class="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude min-w-[72px]">
            <span class="text-[10px] opacity-60 text-text-muted-light dark:text-text-muted-dark">⏱ 用时</span>
            <span class="text-lg font-bold tabular-nums text-text-light dark:text-text-dark">{{ elapsedText }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs opacity-70 text-text-muted-light dark:text-text-muted-dark">
            {{ difficultyLabel }}
            <span v-if="state.bestScore > 0"> · 最高 {{ state.bestScore }}</span>
          </span>
          <button
            @click="newGame"
            class="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow-claude-md transition-all active:scale-95 text-sm font-bold"
          >
            🔄 新游戏
          </button>
        </div>
      </div>

      <!-- 操作区 -->
      <div class="flex items-center justify-between mb-3 gap-2">
        <div class="flex gap-2">
          <button
            @click="showHowTo = true"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-purple-400/40 transition-all active:scale-95 text-sm font-medium text-text-light dark:text-text-dark"
          >
            ❓ 玩法
          </button>
          <button
            @click="doHint"
            :disabled="state.status === 'won'"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-purple-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            💡 提示
          </button>
          <button
            @click="undo"
            :disabled="!canUndo"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-purple-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            ↩️ 撤销
          </button>
          <button
            @click="deal"
            :disabled="state.stock.length === 0"
            class="px-3 py-2 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md hover:border-purple-400/40 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-light dark:text-text-dark"
          >
            🃏 发牌<span v-if="state.stock.length > 0" class="opacity-60 ml-1">×{{ state.stock.length }}</span>
          </button>
        </div>
        <div class="text-xs opacity-60 text-text-muted-light dark:text-text-muted-dark hidden sm:block">
          点击/拖动牌串 → 目标列 · 双击自动归位 · 同花色降序才能整串移动
        </div>
      </div>

      <!-- 牌桌 -->
      <div
        ref="tableRef"
        class="relative w-full rounded-xl bg-emerald-900/10 dark:bg-emerald-950/30 border border-border-light dark:border-border-dark p-2 overflow-x-auto"
        @pointermove="onTablePointerMove"
        @pointerup="onTablePointerUp"
        @pointercancel="cancelDrag"
      >
        <div class="flex gap-1.5 min-w-max mx-auto">
          <div
            v-for="(col, ci) in state.columns"
            :key="ci"
            :data-col="ci"
            class="relative shrink-0 rounded-md"
            :class="[colClass(ci), { 'ring-2 ring-emerald-400 z-10': dragOverCol === ci && dragging }]"
            :style="{ width: cardW + 'px', height: Math.max(84, col.length * stackOffset + 10) + 'px' }"
            @click="onColumnAreaClick(ci)"
            @dblclick.self="onColumnDblClick(ci)"
          >
            <div
              v-for="(card, idx) in col"
              :key="idx"
              class="absolute w-full rounded-md border flex flex-col items-center justify-center leading-none shadow-sm"
              :class="cardClass(ci, idx)"
              :style="{ top: idx * stackOffset + 'px', height: cardH + 'px' }"
              @pointerdown.stop="onCardPointerDown(ci, idx, $event)"
              @click.stop="onCardClick(ci, idx)"
              @dblclick.stop="onCardDblClick(ci, idx)"
            >
              <span class="absolute top-0.5 left-0.5 text-[11px] font-bold leading-none px-0.5 rounded-sm" :class="suitColor(card) + ' bg-bg-light/70 dark:bg-bg-dark/60'">{{ rankLabel(card.rank) }}{{ SUIT_SYMBOL[card.suit] }}</span>
              <span class="text-xl" :class="suitColor(card)">{{ SUIT_SYMBOL[card.suit] }}</span>
            </div>
            <!-- 空列占位 -->
            <div
              v-if="col.length === 0"
              class="absolute top-0 w-full rounded-md border-2 border-dashed border-border-light dark:border-border-dark flex items-center justify-center text-xs opacity-40"
              :style="{ height: cardH + 'px' }"
            >
              ✦
            </div>
          </div>
        </div>
        <!-- 拖拽跟随指示 -->
        <div
          v-if="dragging && dragPreview"
          class="fixed z-50 pointer-events-none rounded-md border bg-white dark:bg-gray-800 shadow-claude-lg flex flex-col items-center justify-center"
          :style="{ width: cardW + 'px', height: cardH + 'px', left: dragX + 'px', top: dragY + 'px' }"
        >
          <span class="absolute top-0.5 left-0.5 text-[11px] font-bold px-0.5 rounded-sm bg-bg-light/70 dark:bg-bg-dark/60">{{ dragPreview }}</span>
          <span class="text-xl">♠</span>
        </div>
      </div>

      <!-- 移动端提示 -->
      <div class="text-center text-xs opacity-60 mt-3 sm:hidden">
        👆 点牌串选中 → 点目标列移动（牌桌可左右滑动）
      </div>

      <!-- 胜利遮罩 -->
      <div
        v-if="state.status === 'won'"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <div class="relative w-full max-w-md rounded-2xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude-lg p-8 text-center space-y-4">
          <div class="text-5xl">🕷️</div>
          <div class="text-3xl md:text-4xl font-extrabold text-purple-600 dark:text-purple-400">🎉 全部清空！</div>
          <p class="text-text-light dark:text-text-dark opacity-80">
            分数 <strong>{{ state.score }}</strong> · 用时 {{ elapsedText }}
            <span v-if="state.score === state.bestScore" class="ml-1">🏅 新纪录！</span>
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
              class="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-claude-md transition-all active:scale-95"
            >
              🔄 再来一局
            </button>
          </div>
        </div>
      </div>
    </main>

    <footer class="max-w-3xl w-full mx-auto mt-4 py-3 text-center text-xs opacity-40">
      <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
    </footer>

    <!-- 设置面板 -->
    <SpiderSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="蜘蛛纸牌">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li>两副牌（104 张）铺在 10 列上，目标：按 <strong>K→A 同花色降序</strong>收集完整序列，共 <strong>8 组</strong>全部收完即获胜</li>
        <li><strong>点击一串牌</strong>（同花色且降序连续）选中，再<strong>点击目标列</strong>移动过去；空列可以放任意牌串</li>
        <li>目标列顶牌必须比移动串的底牌 <strong>大 1</strong>（如 6 上面只能放 5），花色不限；但整串移动必须<strong>同花色</strong></li>
        <li>牌堆（🃏）还有牌时点<strong>发牌</strong>，给每列各发一张</li>
        <li>列尾凑齐 K→A 同花色序列会<strong>自动收走</strong>；单花色最容易，四花色最难</li>
        <li>计分：起始 500，每步 −1，收一组 +100</li>
      </ol>
    </HowToPlay>

    <!-- 排行榜面板 -->
    <LeaderboardPanel
      v-model="showLeaderboard"
      :game-id="LEADERBOARD_GAME_ID"
      game-name="蜘蛛纸牌"
      :dimensions="leaderboardDimensions"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { SpiderEngine } from '../../game/spider/GameEngine'
import type { SpiderState, SpiderConfig, Card, SpiderDifficulty } from '../../game/spider/types'
import { DIFFICULTY_LABELS } from '../../game/spider/types'
import { useSpiderSettingsStore } from '../../stores/spider-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { shareOrCopy, shareUrl } from '../../utils/share'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import HowToPlay from '../../components/HowToPlay.vue'
import SpiderSettingsPanel from './components/SpiderSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

const settings = useSpiderSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'spider'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
/** 玩法说明弹层 */
const showHowTo = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: (['one', 'two', 'four'] as SpiderDifficulty[]).map((d) => ({
      value: d,
      label: DIFFICULTY_LABELS[d],
    })),
  },
]
let lastSubmittedScore = -1

function submitScoreIfWon() {
  if (state.status !== 'won') return
  if (state.score === lastSubmittedScore) return
  lastSubmittedScore = state.score
  leaderboard.addEntry({
    score: state.score,
    difficulty: settings.config.difficulty,
    size: 10,
    moves: state.moves,
    duration: finishedElapsed.value,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'spider'
const pendingAutosave = loadAutosave<SpiderState>(AUTOSAVE_GAME_ID)
/** 引擎（蜘蛛直接自动恢复存档，无需确认弹窗） */
let engine: SpiderEngine = (() => {
  if (pendingAutosave && pendingAutosave.status !== 'won') {
    const e = new SpiderEngine({ difficulty: pendingAutosave.difficulty })
    e.loadState(pendingAutosave)
    return e
  }
  return new SpiderEngine(settings.config)
})()

// ===== 引擎与状态 =====
const state = reactive<SpiderState>(engine.getState())
const canUndo = ref(false)
const finishedElapsed = ref(0)
const now = ref(Date.now())

/** 牌尺寸（加大，便于看清花色点数） */
const cardW = 56
const cardH = 76
/** 牌堆叠露边（露出角标） */
const stackOffset = 28

// ===== 拖拽状态 =====
const tableRef = ref<HTMLElement | null>(null)
const dragging = ref(false)
const dragX = ref(0)
const dragY = ref(0)
const dragPreview = ref('')
const dragOverCol = ref<number | null>(null)
/** 拖拽源：{ col, count, startX, startY } */
const dragSource = ref<{ col: number; count: number; startX: number; startY: number } | null>(null)
/** 提示高亮的列 */
const hintCol = ref<number | null>(null)
/** 收牌动画的列 */
const flashCol = ref<number | null>(null)

/** 选中串后所有合法目标列 */
const validTargets = computed<number[]>(() => {
  const sel = state.selected
  if (!sel) return []
  const list: number[] = []
  for (let t = 0; t < 10; t++) {
    if (engine.canMoveTo(sel.col, t, sel.count)) list.push(t)
  }
  return list
})

function colClass(ci: number): string {
  const classes: string[] = []
  // 合法目标列高亮（选中后）
  if (state.selected && validTargets.value.includes(ci)) {
    classes.push('ring-2 ring-emerald-400/70')
  }
  // 提示高亮
  if (hintCol.value === ci) {
    classes.push('hint-flash')
  }
  // 收牌闪光
  if (flashCol.value === ci) {
    classes.push('complete-flash')
  }
  return classes.join(' ')
}

const difficultyLabel = computed(() => DIFFICULTY_LABELS[settings.config.difficulty])

const elapsedText = computed(() => {
  const sec = state.status === 'won' ? finishedElapsed.value : state.startTime === 0 ? 0 : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

const SUIT_SYMBOL = ['♠', '♥', '♦', '♣']
const SUIT_RED = [false, true, true, false]

/** 花色颜色类（红桃/方块红，黑桃/梅花黑） */
function suitColor(card: Card): string {
  return SUIT_RED[card.suit]
    ? 'text-red-600 dark:text-red-400'
    : 'text-text-light dark:text-text-dark'
}

function rankLabel(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function cardClass(ci: number, idx: number): string {
  const classes: string[] = []
  // 牌面底色
  classes.push('bg-white dark:bg-gray-800')
  // 选中高亮（选中串范围）
  const sel = state.selected
  if (sel && sel.col === ci && idx >= state.columns[ci].length - sel.count) {
    classes.push('ring-2 ring-purple-400 shadow-claude-md z-10 -translate-y-1')
  }
  return classes.join(' ')
}

/** 点击列中某张牌 */
function onCardClick(ci: number, idx: number) {
  if (state.status === 'won') return
  const eng = engine
  if (eng.getSelected()) {
    // 有选中：点击自己列的牌 = 重新选择
    if (eng.getSelected()!.col === ci) {
      eng.clearSelection()
      syncState()
      return
    }
    eng.moveSelected(ci)
    sound.play('move')
    syncState()
    handleProgress()
    return
  }
  const count = eng.selectAt(ci, idx)
  if (count > 0) {
    sound.play('click')
    syncState()
  }
}

// ===== 拖拽 =====
function onCardPointerDown(ci: number, idx: number, e: PointerEvent) {
  if (state.status === 'won') return
  if (e.button === 2) return
  const eng = engine
  // 无选中时先选中（点击逻辑也会做，这里为拖拽记录起点）
  if (!eng.getSelected()) {
    eng.selectAt(ci, idx)
  }
  const sel = eng.getSelected()
  if (!sel) return
  syncState()
  dragSource.value = { col: ci, count: sel.count, startX: e.clientX, startY: e.clientY }
  dragging.value = false
  dragOverCol.value = null
  const card = state.columns[ci][idx]
  dragPreview.value = rankLabel(card.rank) + SUIT_SYMBOL[card.suit]
}

function onTablePointerMove(e: PointerEvent) {
  const src = dragSource.value
  if (!src) return
  const dx = e.clientX - src.startX
  const dy = e.clientY - src.startY
  if (!dragging.value && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
    dragging.value = true
    if (navigator.vibrate) navigator.vibrate(10)
  }
  if (!dragging.value) return
  dragX.value = e.clientX - cardW / 2
  dragY.value = e.clientY - cardH / 2
  // 找当前悬停列
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  const colEl = el?.closest('[data-col]') as HTMLElement | null
  dragOverCol.value = colEl ? Number(colEl.dataset.col) : null
}

function onTablePointerUp(e: PointerEvent) {
  const src = dragSource.value
  if (!src) return
  dragSource.value = null
  if (dragging.value) {
    dragging.value = false
    // 拖到目标列 → 移动
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const colEl = el?.closest('[data-col]') as HTMLElement | null
    const target = colEl ? Number(colEl.dataset.col) : null
    if (target !== null && target !== src.col) {
      if (engine.moveSelected(target)) {
        sound.play('move')
        syncState()
        handleProgress()
        dragOverCol.value = null
        return
      }
    }
    dragOverCol.value = null
    // 拖动未成功：保持选中
    syncState()
  }
}

function cancelDrag() {
  dragSource.value = null
  dragging.value = false
  dragOverCol.value = null
}

// ===== 双击自动移动 =====
function onCardDblClick(ci: number, idx: number) {
  if (state.status === 'won') return
  const count = engine.selectAt(ci, idx)
  if (count > 0 && engine.autoMove(ci, count)) {
    sound.play('move')
    syncState()
    handleProgress()
  } else {
    engine.clearSelection()
    syncState()
  }
}

function onColumnDblClick(ci: number) {
  if (state.status === 'won') return
  const moves = engine.findMoves()
  const m = moves.find((x) => x.col === ci)
  if (m && engine.autoMove(ci, m.count)) {
    sound.play('move')
    syncState()
    handleProgress()
  }
}

// ===== 提示 =====
function doHint() {
  if (state.status === 'won') return
  const moves = engine.findMoves()
  if (moves.length === 0) {
    toast(state.stock.length > 0 ? '没有可用移动，试试发牌 🃏' : '没有可用移动了')
    return
  }
  const m = moves[0]
  hintCol.value = m.col
  sound.play('start')
  setTimeout(() => {
    hintCol.value = null
  }, 1500)
}

/** 点击列（空白区域/列顶上方） */
function onColumnAreaClick(ci: number) {
  if (state.status === 'won') return
  const eng = engine
  const col = state.columns[ci]
  if (col.length === 0) {
    // 空列：有选中则移动过去
    if (eng.getSelected()) {
      eng.moveSelected(ci)
      sound.play('move')
      syncState()
      handleProgress()
    }
    return
  }
  // 点击列顶牌 = 选中最大可移动串
  const count = eng.selectTop(ci)
  if (count > 0) {
    sound.play('click')
    syncState()
  }
}

/** 发牌 */
function deal() {
  if (state.status === 'won') return
  const before = state.completed
  if (engine.deal()) {
    sound.play('drop')
    syncState()
    if (state.completed > before) sound.play('line')
    persistAutosave()
  }
}

function undo() {
  if (engine.undo()) {
    syncState()
    sound.play('move')
    persistAutosave()
  }
}

function newGame() {
  engine = new SpiderEngine(settings.config)
  syncState()
  finishedElapsed.value = 0
  lastSubmittedScore = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  sound.play('start')
}

function applySettings(config: SpiderConfig) {
  engine = new SpiderEngine(config)
  syncState()
  finishedElapsed.value = 0
  lastSubmittedScore = -1
  clearAutosave(AUTOSAVE_GAME_ID)
}

/** 移动/发牌后的进度处理（收牌音效 / 胜利） */
function handleProgress() {
  if (state.status === 'won') {
    finishedElapsed.value = Math.floor((Date.now() - engine.getState().startTime) / 1000)
    sound.play('win')
    clearAutosave(AUTOSAVE_GAME_ID)
    submitScoreIfWon()
  } else {
    persistAutosave()
  }
}

/** 分享成绩 */
async function shareResult() {
  const result = await shareOrCopy({
    text: `我在 EasyGame 蜘蛛纸牌以 ${state.score} 分完成了「${DIFFICULTY_LABELS[settings.config.difficulty]}」，来挑战我！🕷️`,
    url: shareUrl('/game/spider'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制' : '❌ 分享失败')
}

function syncState() {
  const s = engine.getState()
  state.columns = s.columns.map((c) => [...c])
  state.stock = [...s.stock]
  state.completed = s.completed
  state.moves = s.moves
  state.score = s.score
  state.selected = s.selected ? { ...s.selected } : null
  state.status = s.status
  state.startTime = s.startTime
  state.bestScore = s.bestScore
  state.difficulty = s.difficulty
  canUndo.value = engine.canUndo()
  // 收牌动画检测
  const last = engine.getLastCompleted()
  if (last) {
    flashCol.value = last.col
    sound.play('line')
    setTimeout(() => {
      flashCol.value = null
    }, 800)
  }
  engine.clearLastCompleted()
}

function persistAutosave() {
  saveAutosave(AUTOSAVE_GAME_ID, engine.getState())
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden' && state.status !== 'won') persistAutosave()
}
function onPageHide() {
  if (state.status !== 'won') persistAutosave()
}

// ===== 计时器 =====
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  syncState()
  if (state.status === 'won') {
    finishedElapsed.value = Math.floor((Date.now() - state.startTime) / 1000)
    submitScoreIfWon()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  timer = setInterval(() => {
    now.value = Date.now()
  }, 500)
})

onBeforeUnmount(() => {
  if (state.status !== 'won') persistAutosave()
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
/* 提示高亮闪烁 */
@keyframes hintFlash {
  0%, 100% { box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.8); }
  50% { box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.2); }
}
.hint-flash {
  animation: hintFlash 0.6s ease-in-out 2;
}
/* 收牌闪光 */
@keyframes completeFlash {
  0% { background-color: rgba(52, 211, 153, 0.85); }
  100% { background-color: transparent; }
}
.complete-flash {
  animation: completeFlash 0.7s ease;
}
</style>

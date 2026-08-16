<template>
  <div class="min-h-screen w-full flex flex-col" :class="{ 'landscape-root': landscape }">
    <div v-if="landscape" class="landscape-scrim" @click.self="landscape = false"></div>

    <div class="game-shell flex flex-col h-screen w-full" :class="{ 'landscape-rotated bg-bg-light dark:bg-bg-dark': landscape }">
      <!-- 顶部栏 -->
      <header class="max-w-5xl w-full mx-auto flex items-center justify-between mb-3 px-2">
        <RouterLink to="/" class="flex items-center gap-2 group">
          <button class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md transition-all duration-200 group-hover:-translate-x-0.5 text-lg flex items-center justify-center">
            ←
          </button>
        </RouterLink>
        <div class="text-lg font-bold text-text-light dark:text-text-dark">🕷️ 蜘蛛纸牌</div>
        <div class="flex gap-2">
          <button
            v-if="isMobile"
            @click="toggleLandscape"
            class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md transition-all active:scale-95 flex items-center justify-center text-base"
            :aria-label="landscape ? '切回竖屏' : '翻转横屏'"
          >
            {{ landscape ? '🔃' : '🔄' }}
          </button>
          <button
            @click="showLeaderboard = true"
            class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md transition-all active:scale-95 flex items-center justify-center"
            aria-label="排行榜"
          >
            🏆
          </button>
          <button
            @click="settings.openSettings()"
            class="w-10 h-10 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude hover:shadow-claude-md transition-all active:scale-95 flex items-center justify-center"
            aria-label="设置"
          >
            ⚙️
          </button>
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <!-- 游戏主体 -->
      <main class="max-w-5xl w-full mx-auto flex-1 flex flex-col px-2">
        <!-- 牌桌舞台（flex 占满可用高度，牌堆自动铺满） -->
        <div
          ref="wrapRef"
          class="relative w-full flex-1 min-h-0 overflow-x-auto overflow-y-hidden rounded-xl bg-[#017e00] dark:bg-[#016300] shadow-inner"
          @wheel.prevent="onWheel"
          @pointermove="onTablePointerMove"
          @pointerup="onTablePointerUp"
          @pointercancel="cancelDrag"
        >
          <div
            class="relative"
            :style="stageStyle"
          >
            <!-- 10 列 -->
            <div
              v-for="(col, ci) in state.columns"
              :key="ci"
              :data-col="ci"
              class="absolute rounded-lg"
              :class="[colClass(ci), { 'ring-4 ring-emerald-300 z-30': dragOverCol === ci && dragging }]"
              :style="colStyle(ci)"
              @click="onColumnAreaClick(ci)"
              @dblclick.self="onColumnDblClick(ci)"
            >
              <!-- 牌位占位框 -->
              <div class="absolute pad-slot" :style="padStyle"></div>

              <!-- 牌 -->
              <div
                v-for="(card, idx) in col"
                :key="idx"
                class="absolute cursor-pointer"
                :class="cardWrapClass(ci, idx)"
                :style="cardStyle(ci, idx)"
                @pointerdown.stop="onCardPointerDown(ci, idx, $event)"
                @click.stop="onCardClick(ci, idx)"
                @dblclick.stop="onCardDblClick(ci, idx)"
              >
                <div
                  class="card3d"
                  :class="{ 'face-down': !isTopCard(ci, idx), 'flip-in': flipKeys.has(ci + '-' + idx) }"
                >
                  <!-- 牌面 -->
                  <div class="card-face card-front rounded-xl bg-white dark:bg-gray-700 border shadow-sm">
                    <span class="absolute top-1.5 left-1.5 font-bold leading-none" :class="suitColor(card)" :style="{ fontSize: '42px' }">{{ rankLabel(card.rank) }}{{ SUIT_SYMBOL[card.suit] }}</span>
                    <span :class="suitColor(card)" :style="{ fontSize: '130px', lineHeight: 1 }">{{ SUIT_SYMBOL[card.suit] }}</span>
                  </div>
                  <!-- 牌背 -->
                  <div class="card-face card-back rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 信息栏（牌桌下方）：牌堆/发牌 + 得分操作时间 + 按钮 -->
        <div class="mt-2 rounded-xl bg-black/45 text-white p-2 flex items-center justify-between gap-2 flex-wrap">
          <!-- 牌堆：点击发牌 -->
          <button
            class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            :class="{ 'opacity-40 cursor-not-allowed': state.stock.length === 0 }"
            :disabled="state.stock.length === 0"
            @click="deal"
            :title="'剩余 ' + state.stock.length + ' 张，点击发牌'"
          >
            <span class="relative inline-block w-7 h-10">
              <span class="absolute inset-0 rounded-md border-2 border-white/50 bg-[#1e3a6e] translate-x-1 translate-y-1"></span>
              <span class="absolute inset-0 rounded-md border-2 border-white/60 bg-[#1e3a6e] translate-x-0.5 translate-y-0.5"></span>
              <span class="absolute inset-0 rounded-md border-2 border-white/70 bg-[#1e3a6e] flex items-center justify-center text-white text-[10px]">🕷️</span>
            </span>
            <span class="text-sm font-bold tabular-nums">{{ state.stock.length }}</span>
          </button>

          <div class="flex gap-4 text-sm">
            <div><span class="opacity-70 text-xs">得分</span> <b class="tabular-nums">{{ state.score }}</b></div>
            <div><span class="opacity-70 text-xs">操作</span> <b class="tabular-nums">{{ state.moves }}</b></div>
            <div><span class="opacity-70 text-xs">时间</span> <b class="tabular-nums">{{ elapsedText }}</b></div>
          </div>

          <div class="flex gap-1.5 flex-wrap">
            <button
              @click="newGame"
              class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              开局
            </button>
            <button
              @click="settings.openSettings()"
              class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              难度选择
            </button>
            <button
              @click="toggleSound"
              class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              声音 : {{ soundOn ? '开' : '关' }}
            </button>
            <button
              @click="doHint"
              class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              提示
            </button>
            <button
              @click="undo"
              :disabled="!canUndo"
              class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              撤销
            </button>
            <button
              @click="showHowTo = true"
              class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              ❓
            </button>
          </div>
        </div>

        <!-- 移动端提示 -->
        <div class="text-center text-xs opacity-60 mt-2">
          点击/拖动牌串移动 · 双击自动归位 · 滚轮展开牌堆 · {{ difficultyLabel }}
        </div>
      </main>

      <footer class="max-w-5xl w-full mx-auto mt-3 py-2 text-center text-xs opacity-40">
        <RouterLink to="/" class="hover:opacity-100">← 返回游戏大厅</RouterLink>
      </footer>
    </div>

    <!-- 胜利全屏 -->
    <div
      v-if="state.status === 'won'"
      class="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#017e00] text-white cursor-pointer"
      @click="newGame"
    >
      <div class="text-6xl mb-4">🕷️</div>
      <div class="text-5xl font-extrabold tracking-wide">你赢了</div>
      <div class="mt-3 opacity-70 text-sm">任意点击屏幕开始下一局</div>
    </div>

    <!-- 设置面板 -->
    <SpiderSettingsPanel @apply="applySettings" />

    <!-- 玩法说明 -->
    <HowToPlay v-model="showHowTo" title="蜘蛛纸牌">
      <ol class="list-decimal pl-5 space-y-2 opacity-90">
        <li>两副牌（104 张）铺在 10 列上，目标：按 <strong>K→A 同花色降序</strong>收集完整序列，共 <strong>8 组</strong>全部收完即获胜</li>
        <li><strong>点击一串牌</strong>（同花色且降序连续）选中，再<strong>点击目标列</strong>移动；也可<strong>拖动</strong>；双击自动归位</li>
        <li>目标列顶牌必须比移动串底牌<strong>大 1</strong>；整串移动必须<strong>同花色</strong>；空列可放任意串</li>
        <li>发牌：<strong>点击左下角牌堆</strong>；有空列不能发牌、剩余不足 10 张不能发牌</li>
        <li>牌堆挤压时可用<strong>鼠标滚轮</strong>展开/收缩</li>
        <li>难度：单色/双色/四色 × 简单/一般/困难/随机；计分 500 起步，每步 −1，收一组 +100</li>
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
import { reactive, computed, onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { SpiderEngine } from '../../game/spider/GameEngine'
import type { SpiderState, SpiderConfig, Card } from '../../game/spider/types'
import { DIFFICULTY_OPTIONS, difficultyId } from '../../game/spider/types'
import { useSpiderSettingsStore } from '../../stores/spider-settings'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { loadAutosave, saveAutosave, clearAutosave } from '../../utils/autosave'
import { sound } from '../../utils/sound'
import { toast } from '../../utils/toast'
import type { LeaderboardDimension } from '../../game/base/leaderboard'
import ThemeToggle from '../../components/ThemeToggle.vue'
import SoundToggle from '../../components/SoundToggle.vue'
import HowToPlay from '../../components/HowToPlay.vue'
import SpiderSettingsPanel from './components/SpiderSettingsPanel.vue'
import LeaderboardPanel from './components/LeaderboardPanel.vue'

// ===== 设计尺寸（参考 spidersolitaire.cn：固定设计 + 等比缩放） =====
const PAD_W = 240
const PAD_H = 340
const CARD_W = 232
const CARD_H = 326
const COL_GAP = 40
const STAGE_W = 10 * PAD_W + 9 * COL_GAP // 2760

const settings = useSpiderSettingsStore()

// ===== 排行榜 =====
const LEADERBOARD_GAME_ID = 'spider'
const leaderboard = useLeaderboardStore(LEADERBOARD_GAME_ID)
const showLeaderboard = ref(false)
const showHowTo = ref(false)
const leaderboardDimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: DIFFICULTY_OPTIONS.map((d) => ({
      value: difficultyId(d),
      label: d.label,
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
    difficulty: difficultyId(settings.config),
    size: 10,
    moves: state.moves,
    duration: finishedElapsed.value,
    won: true,
  })
}

// ===== 自动存档 =====
const AUTOSAVE_GAME_ID = 'spider'
const pendingAutosave = loadAutosave<SpiderState>(AUTOSAVE_GAME_ID)
let engine: SpiderEngine = (() => {
  if (pendingAutosave && pendingAutosave.status !== 'won') {
    const e = new SpiderEngine({ suits: pendingAutosave.suits, mode: pendingAutosave.mode })
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

// ===== 舞台缩放 =====
const wrapRef = ref<HTMLElement | null>(null)
const scale = ref(0.3)
const stageH = ref(500)
/** 堆叠露边（设计尺寸；0=自动铺满高度） */
const offsetView = ref(40)
/** 用户滚轮手动设置的露边（0 = 自动） */
const offsetManual = ref(0)

const stageStyle = computed(() => ({
  width: STAGE_W + 'px',
  height: stageH.value + 'px',
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))

function colStyle(ci: number): Record<string, string> {
  const col = state.columns[ci]
  return {
    left: ci * (PAD_W + COL_GAP) + 'px',
    top: '0px',
    width: PAD_W + 'px',
    height: Math.max(PAD_H, col.length * offsetView.value + 40) + 'px',
  }
}

const padStyle = computed(() => ({
  width: PAD_W + 'px',
  height: PAD_H + 'px',
}))

function cardStyle(ci: number, idx: number): Record<string, string> {
  const sel = state.selected
  const inSel = !!sel && sel.col === ci && idx >= state.columns[ci].length - sel.count
  return {
    top: idx * offsetView.value + 14 + 'px',
    left: (PAD_W - CARD_W) / 2 + 'px',
    width: CARD_W + 'px',
    height: CARD_H + 'px',
    zIndex: String(inSel ? 100 + idx : idx + 1),
  }
}

/** 重算 scale 与堆叠露边（深绿牌桌占满屏幕，牌堆顶部舒展） */
function updateScale() {
  const wrap = wrapRef.value
  if (!wrap) return
  const availW = (landscape.value ? window.innerHeight : wrap.clientWidth) - 20
  const minScale = isMobile.value && !landscape.value ? 0.24 : 0.05
  const s = Math.max(minScale, Math.min(1, availW / STAGE_W))
  scale.value = s
  // 可用高度（视口 - 顶栏/信息栏/页脚等固定占用）
  const viewH = landscape.value ? window.innerWidth : window.innerHeight
  const availHpx = viewH - 200
  let maxLen = 0
  for (const col of state.columns) maxLen = Math.max(maxLen, col.length)
  if (offsetManual.value > 0) {
    offsetView.value = offsetManual.value
  } else if (maxLen > 1) {
    // 牌堆舒展铺满舞台设计高（上限 80 防止过度拉开）
    const usable = availHpx / s - PAD_H - 90
    offsetView.value = Math.max(14, Math.min(80, usable / (maxLen - 1)))
  } else {
    offsetView.value = 40
  }
  // 舞台高度 = 内容实际高（避免撑爆外层布局）
  stageH.value = maxLen * offsetView.value + PAD_H + 60
}

let ro: ResizeObserver | null = null
function observeWrap() {
  ro?.disconnect()
  ro = new ResizeObserver(() => updateScale())
  if (wrapRef.value) ro.observe(wrapRef.value)
}

/** 鼠标滚轮展开/收缩牌堆 */
function onWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 3 : -3
  offsetManual.value = Math.max(10, Math.min(110, (offsetManual.value || offsetView.value) + delta))
  updateScale()
}

// ===== 横屏翻转（移动端） =====
const isMobile = ref(false)
const landscape = ref(false)
function updateLayout() {
  isMobile.value = window.innerWidth < 640
  nextTick(updateScale)
}
function toggleLandscape() {
  landscape.value = !landscape.value
  updateScale()
}

// ===== 声音（信息栏按钮） =====
const soundOn = ref(sound.enabled)
function toggleSound() {
  sound.toggle()
  soundOn.value = sound.enabled
}

// ===== 入场/翻开动画（只有列顶牌显示正面，下层为牌背；移动后新顶牌翻面） =====
const flipKeys = ref<Set<string>>(new Set())
let prevTopKeys = new Set<string>()

/** 该牌是否为所在列的顶牌（顶牌显示正面，其余牌背） */
function isTopCard(ci: number, idx: number): boolean {
  return idx === state.columns[ci].length - 1
}

// ===== 难度标签 =====
const difficultyLabel = computed(() => {
  const d = DIFFICULTY_OPTIONS.find((o) => o.suits === state.suits && o.mode === state.mode)
  return d ? d.label : '蜘蛛纸牌'
})

const elapsedText = computed(() => {
  const sec = state.status === 'won' ? finishedElapsed.value : state.startTime === 0 ? 0 : Math.floor((now.value - state.startTime) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
})

const SUIT_SYMBOL = ['♠', '♥', '♦', '♣']
const SUIT_RED = [false, true, true, false]

function suitColor(card: Card): string {
  return SUIT_RED[card.suit] ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
}

function rankLabel(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function cardWrapClass(ci: number, idx: number): string {
  const classes: string[] = []
  const sel = state.selected
  if (sel && sel.col === ci && idx >= state.columns[ci].length - sel.count) {
    classes.push('z-40')
  }
  return classes.join(' ')
}

function colClass(ci: number): string {
  const classes: string[] = []
  if (state.selected && validTargets.value.includes(ci)) {
    classes.push('ring-4 ring-emerald-300/80')
  }
  if (hintCol.value === ci) classes.push('hint-flash')
  if (flashCol.value === ci) classes.push('complete-flash')
  return classes.join(' ')
}

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

// ===== 拖拽状态 =====
const dragging = ref(false)
const dragX = ref(0)
const dragY = ref(0)
const dragOverCol = ref<number | null>(null)
const dragSource = ref<{ col: number; count: number; startX: number; startY: number } | null>(null)
const hintCol = ref<number | null>(null)
const flashCol = ref<number | null>(null)

// ===== 交互 =====
function onCardPointerDown(ci: number, idx: number, e: PointerEvent) {
  if (state.status === 'won') return
  if (e.button === 2) return
  const eng = engine
  if (!eng.getSelected()) {
    eng.selectAt(ci, idx)
  }
  const sel = eng.getSelected()
  if (!sel) return
  syncState()
  dragSource.value = { col: ci, count: sel.count, startX: e.clientX, startY: e.clientY }
  dragging.value = false
  dragOverCol.value = null
}

function onCardClick(ci: number, idx: number) {
  if (state.status === 'won') return
  const eng = engine
  if (eng.getSelected()) {
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
  dragX.value = e.clientX - (CARD_W * scale.value) / 2
  dragY.value = e.clientY - (CARD_H * scale.value) / 2
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
    syncState()
  }
}

function cancelDrag() {
  dragSource.value = null
  dragging.value = false
  dragOverCol.value = null
}

function onColumnAreaClick(ci: number) {
  if (state.status === 'won') return
  const eng = engine
  const col = state.columns[ci]
  if (col.length === 0) {
    if (eng.getSelected()) {
      eng.moveSelected(ci)
      sound.play('move')
      syncState()
      handleProgress()
    }
    return
  }
  const count = eng.selectTop(ci)
  if (count > 0) {
    sound.play('click')
    syncState()
  }
}

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
  const m = engine.findMoves().find((x) => x.col === ci)
  if (m && engine.autoMove(ci, m.count)) {
    sound.play('move')
    syncState()
    handleProgress()
  }
}

function doHint() {
  if (state.status === 'won') return
  const moves = engine.findMoves()
  if (moves.length === 0) {
    toast(state.stock.length > 0 ? '没有可用移动，试试点击牌堆发牌' : '没有可用移动了')
    return
  }
  hintCol.value = moves[0].col
  sound.play('start')
  setTimeout(() => {
    hintCol.value = null
  }, 1500)
}

/** 点击牌堆发牌 */
function deal() {
  if (state.status === 'won') return
  const before = state.completed
  const res = engine.deal()
  if (res === 'empty-col') {
    toast('有空列，不能发牌——先填满空列再发牌')
    return
  }
  if (res === 'insufficient') {
    toast('剩余纸牌不足 10 张，不能发牌')
    return
  }
  if (res === 'ok') {
    sound.play('drop')
    syncState()
    updateScale()
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
  prevTopKeys = new Set()
  syncState()
  finishedElapsed.value = 0
  lastSubmittedScore = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  updateScale()
  sound.play('start')
}

function applySettings(config: SpiderConfig) {
  engine = new SpiderEngine(config)
  prevTopKeys = new Set()
  syncState()
  finishedElapsed.value = 0
  lastSubmittedScore = -1
  clearAutosave(AUTOSAVE_GAME_ID)
  updateScale()
}

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
  state.suits = s.suits
  state.mode = s.mode
  canUndo.value = engine.canUndo()
  // 检测新翻开的顶牌（入场 + 移动后）→ 翻面动画
  const newTops = new Set<string>()
  state.columns.forEach((col, ci) => {
    if (col.length > 0) newTops.add(`${ci}-${col.length - 1}`)
  })
  const fresh: string[] = []
  for (const k of newTops) if (!prevTopKeys.has(k)) fresh.push(k)
  prevTopKeys = newTops
  if (fresh.length > 0) {
    flipKeys.value = new Set(fresh)
    setTimeout(() => {
      flipKeys.value = new Set()
    }, 700)
  }
  const last = engine.getLastCompleted()
  if (last) {
    flashCol.value = last.col
    sound.play('line')
    setTimeout(() => {
      flashCol.value = null
    }, 900)
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

// ===== 生命周期 =====
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateLayout()
  window.addEventListener('resize', updateLayout)
  syncState()
  observeWrap()
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
  ro?.disconnect()
  if (timer) clearInterval(timer)
  window.removeEventListener('resize', updateLayout)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', onPageHide)
})
</script>

<style scoped>
/* 舞台占位框 */
.pad-slot {
  border: 3px solid rgba(255, 255, 255, 0.55);
  border-radius: 18px;
}

/* 牌 3D 结构：默认正面朝上（顶牌）；非顶牌背面朝上 */
.card3d {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.card3d.face-down {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.card-back {
  transform: rotateY(180deg);
  background: linear-gradient(135deg, #1e3a6e, #0f2447);
  border: 7px solid #fff;
  box-shadow: inset 0 0 0 3px #1e3a6e, 0 2px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-back::after {
  content: '🕷️';
  font-size: 56px;
  opacity: 0.45;
}
@keyframes dealFlip {
  from {
    transform: rotateY(180deg);
  }
  to {
    transform: rotateY(0deg);
  }
}
.card3d.flip-in {
  animation: dealFlip 0.45s ease;
}

/* 提示高亮闪烁 */
@keyframes hintFlash {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.6);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.15);
  }
}
.hint-flash {
  animation: hintFlash 0.6s ease-in-out 2;
}
/* 收牌闪光 */
@keyframes completeFlash {
  0% {
    background-color: rgba(255, 255, 255, 0.5);
  }
  100% {
    background-color: transparent;
  }
}
.complete-flash {
  animation: completeFlash 0.9s ease;
}

/* 横屏翻转 */
.landscape-scrim {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: #0f1115;
}
.landscape-rotated {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100vh;
  height: 100vw;
  transform: translate(-50%, -50%) rotate(90deg);
  overflow-y: auto;
  z-index: 60;
}
</style>

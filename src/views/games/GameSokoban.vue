<template>
  <ExtraPuzzleShell title="推箱子" icon="📦">
    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-3 gap-2">
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ state.level + 1 }}/3</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">关卡</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ state.moves }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">移动步数</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ remaining }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">未到位箱子</div>
        </div>
      </div>

      <div class="claude-card p-3 sm:p-5">
        <div
          class="grid gap-1 mx-auto w-full max-w-md aspect-square p-2 rounded-xl bg-bg-light dark:bg-bg-dark"
          :style="{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }"
          role="img"
          aria-label="推箱子棋盘"
        >
          <div
            v-for="index in state.rows * state.cols"
            :key="index - 1"
            class="flex items-center justify-center rounded-md text-lg sm:text-2xl select-none"
            :class="cellClass(index - 1)"
            :aria-label="cellLabel(index - 1)"
          >
            {{ cellIcon(index - 1) }}
          </div>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-2 max-w-[13rem] mx-auto" aria-label="方向控制">
          <span />
          <button class="eg-ghost-btn min-h-11" type="button" aria-label="向上" @click="move('up')">↑</button>
          <span />
          <button class="eg-ghost-btn min-h-11" type="button" aria-label="向左" @click="move('left')">←</button>
          <button class="eg-ghost-btn min-h-11" type="button" aria-label="向下" @click="move('down')">↓</button>
          <button class="eg-ghost-btn min-h-11" type="button" aria-label="向右" @click="move('right')">→</button>
        </div>

        <p class="mt-3 min-h-6 text-center text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">
          {{ state.status === 'won' ? '🎉 本关完成！' : '用方向键或屏幕按钮推动箱子到目标点。' }}
        </p>
        <div class="mt-3 flex flex-wrap justify-center gap-2">
          <button class="eg-ghost-btn" type="button" :disabled="!canUndo" @click="undo">↩️ 撤销</button>
          <button class="eg-ghost-btn" type="button" @click="restart">重玩本关</button>
          <button v-if="state.level < 2" class="eg-primary-btn" type="button" :disabled="state.status !== 'won'" @click="nextLevel">下一关 →</button>
          <span v-else-if="state.status === 'won'" class="eg-primary-btn">🏆 全部通关</span>
        </div>
      </div>
    </section>

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>用方向键、屏幕按钮或键盘方向键移动角色。</li>
        <li>角色只能推动箱子，不能拉箱子；箱子不能互相穿过。</li>
        <li>把所有箱子推到目标点即可进入下一关。走错时可撤销一步。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SokobanEngine, type SokobanDirection } from '../../game/sokoban/GameEngine'
import { useGamePageEvents } from '../../composables/useGamePageEvents'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'

const engine = new SokobanEngine()
const state = ref(engine.getState())
const remaining = computed(() => state.value.targets.filter((target) => !state.value.boxes.includes(target)).length)
const canUndo = computed(() => state.value.moves > 0)
const walls = computed(() => new Set(state.value.walls))
const targets = computed(() => new Set(state.value.targets))
const boxes = computed(() => new Set(state.value.boxes))

function syncState() {
  state.value = engine.getState()
}

function move(direction: SokobanDirection) {
  if (engine.move(direction)) syncState()
}

function undo() {
  if (engine.undo()) syncState()
}

function restart() {
  engine.reset()
  syncState()
}

function nextLevel() {
  if (engine.nextLevel()) syncState()
}

function cellClass(index: number) {
  if (walls.value.has(index)) return 'bg-slate-500 dark:bg-slate-700'
  if (boxes.value.has(index)) return targets.value.has(index)
    ? 'bg-emerald-400 dark:bg-emerald-600'
    : 'bg-amber-200 dark:bg-amber-900/60'
  if (state.value.player === index) return 'bg-sky-100 dark:bg-sky-900/50'
  if (targets.value.has(index)) return 'bg-rose-100 dark:bg-rose-900/40'
  return 'bg-card-light dark:bg-card-dark'
}

function cellIcon(index: number) {
  if (boxes.value.has(index)) return targets.value.has(index) ? '✅' : '📦'
  if (state.value.player === index) return '🧒'
  if (targets.value.has(index)) return '🎯'
  return ''
}

function cellLabel(index: number) {
  if (walls.value.has(index)) return '墙'
  if (boxes.value.has(index)) return targets.value.has(index) ? '已到位的箱子' : '箱子'
  if (state.value.player === index) return '角色'
  return targets.value.has(index) ? '目标点' : '地面'
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('button, input, textarea, select')) return
  const directions: Record<string, SokobanDirection> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  }
  const direction = directions[event.key]
  if (!direction) return
  event.preventDefault()
  move(direction)
}

useGamePageEvents({ keydown: onKeydown })
</script>

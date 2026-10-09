<template>
  <ExtraPuzzleShell title="桥接谜题" icon="🌉">
    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-2 gap-2">
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ state.islands.length }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">岛屿数量</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ satisfiedCount }}/{{ state.islands.length }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">桥数达标</div>
        </div>
      </div>

      <div class="claude-card p-3 sm:p-5">
        <div class="relative mx-auto aspect-square w-full max-w-md rounded-2xl bg-amber-50 dark:bg-amber-950/30">
          <svg class="absolute inset-0 h-full w-full" viewBox="0 0 700 700" aria-hidden="true">
            <line
              v-for="line in bridgeLines"
              :key="line.id"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
              stroke="#E86A5B"
              stroke-width="10"
              stroke-linecap="round"
            />
          </svg>
          <button
            v-for="island in state.islands"
            :key="island.id"
            type="button"
            class="absolute z-10 flex aspect-square max-w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-lg font-extrabold shadow transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-light/40"
            :class="islandClass(island.id)"
            :style="islandStyle(island)"
            :aria-label="`岛屿 ${island.id + 1}，需要 ${island.required} 座桥，当前 ${engine.degree(island.id)} 座`"
            @click="connect(island.id)"
          >
            {{ island.required }}
          </button>
        </div>

        <p class="mt-3 min-h-6 text-center text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">
          {{ state.status === 'won' ? '🎉 所有岛屿已正确连接！' : state.selected === null ? '选择一座岛，再选择同行或同列的岛。' : `已选岛屿 ${state.selected + 1}，选择另一座岛来架桥。` }}
        </p>
        <p class="mb-3 text-center text-xs text-text-muted-light dark:text-text-muted-dark">
          已架 {{ engine.totalBridges() }} 座桥 · 每对岛屿可架 1 或 2 座桥
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <button class="eg-ghost-btn" type="button" @click="clearBridges">清空重连</button>
          <button class="eg-primary-btn" type="button" @click="nextPuzzle">换一关 →</button>
        </div>
      </div>
    </section>

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>岛上的数字表示它必须连接的桥梁总数。</li>
        <li>选择同行或同列、且中间没有其他岛的两座岛来架桥；每对岛最多两座。</li>
        <li>桥不能交叉。所有岛屿桥数达标且互相连通时通关。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { HashiEngine, type HashiIsland } from '../../game/hashi/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'

const engine = new HashiEngine()
const state = ref(engine.getState())
const satisfiedCount = computed(() => state.value.islands.filter((island) => engine.degree(island.id) === island.required).length)
const bridgeLines = computed(() => Object.entries(state.value.bridges).flatMap(([key, count]) => {
  const [a, b] = key.split('-').map(Number)
  const first = state.value.islands.find((island) => island.id === a)!
  const second = state.value.islands.find((island) => island.id === b)!
  const x1 = first.col * 100 + 50
  const y1 = first.row * 100 + 50
  const x2 = second.col * 100 + 50
  const y2 = second.row * 100 + 50
  if (count === 1) return [{ id: key, x1, y1, x2, y2 }]
  const length = Math.hypot(x2 - x1, y2 - y1) || 1
  const ox = (-(y2 - y1) / length) * 8
  const oy = ((x2 - x1) / length) * 8
  return [
    { id: `${key}-a`, x1: x1 + ox, y1: y1 + oy, x2: x2 + ox, y2: y2 + oy },
    { id: `${key}-b`, x1: x1 - ox, y1: y1 - oy, x2: x2 - ox, y2: y2 - oy },
  ]
}))

function islandStyle(island: HashiIsland) {
  return { left: `${((island.col + 0.5) / 7) * 100}%`, top: `${((island.row + 0.5) / 7) * 100}%`, width: '14%' }
}

function islandClass(islandId: number) {
  const island = state.value.islands.find((item) => item.id === islandId)!
  const complete = engine.degree(islandId) === island.required
  if (state.value.selected === islandId) return 'border-pink-500 bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-200'
  return complete
    ? 'border-emerald-500 bg-emerald-500 text-white'
    : 'border-amber-500 bg-card-light text-text-light dark:bg-card-dark dark:text-text-dark'
}

function connect(islandId: number) {
  engine.move(islandId)
  state.value = engine.getState()
}

function clearBridges() {
  engine.loadState({ ...state.value, bridges: {}, selected: null, status: 'playing' })
  state.value = engine.getState()
}

function nextPuzzle() {
  engine.nextPuzzle()
  state.value = engine.getState()
}
</script>

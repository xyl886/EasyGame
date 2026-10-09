<template>
  <ExtraPuzzleShell title="一笔画" icon="✍️">
    <section class="max-w-xl mx-auto space-y-4">
      <div class="claude-card p-3 text-center">
        <span class="text-sm text-text-muted-light dark:text-text-muted-dark">已连接</span>
        <strong class="ml-2 text-accent-light dark:text-accent-dark">{{ state.usedEdges.length }}/{{ state.edges.length }}</strong>
      </div>

      <div class="claude-card p-4 sm:p-6">
        <div class="relative mx-auto aspect-square w-full max-w-md rounded-2xl bg-amber-50 dark:bg-amber-950/30 touch-manipulation">
          <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
            <line
              v-for="(edge, index) in state.edges"
              :key="index"
              :x1="node(edge[0]).x"
              :y1="node(edge[0]).y"
              :x2="node(edge[1]).x"
              :y2="node(edge[1]).y"
              :stroke="used(edge) ? '#E86A5B' : '#D7C9B7'"
              :stroke-width="used(edge) ? 2.3 : 1.2"
              stroke-linecap="round"
            />
          </svg>
          <button
            v-for="point in state.nodes"
            :key="point.id"
            type="button"
            class="absolute z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-md transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-light/40"
            :class="point.id === state.current ? 'bg-pink-500' : 'bg-accent-light dark:bg-accent-dark'"
            :style="{ left: `${point.x}%`, top: `${point.y}%` }"
            :aria-label="`连接点 ${point.id + 1}`"
            :disabled="state.status !== 'playing'"
            @click="selectPoint(point.id)"
          />
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">{{ message }}</p>
          <button type="button" class="eg-primary-btn" @click="reset">↻ 重新开始</button>
        </div>
      </div>
    </section>

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>点击任意圆点开始，再依次点击相邻圆点。</li>
        <li>每条线只能经过一次；连接全部线段即可胜利。</li>
        <li>如果走到没有未画线段的死路，重新开始再试。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { OneStrokeEngine } from '../../game/one-stroke/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'

const engine = new OneStrokeEngine()
const state = ref(engine.getState())
const message = computed(() => {
  if (state.value.status === 'won') return '🎉 一笔连成，全部线段已完成！'
  if (state.value.status === 'stuck') return '走到死路了，重新开始再试一次。'
  return state.value.current === null ? '从任意圆点开始。' : '继续点击与当前圆点相连的线段。'
})

function node(id: number) {
  return state.value.nodes.find((item) => item.id === id)!
}

function used(edge: [number, number]) {
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  return state.value.usedEdges.includes(key(edge[0], edge[1]))
}

function selectPoint(id: number) {
  engine.move(id)
  state.value = engine.getState()
}

function reset() {
  engine.reset()
  state.value = engine.getState()
}
</script>

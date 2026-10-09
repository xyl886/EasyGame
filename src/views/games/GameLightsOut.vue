<template>
  <ExtraPuzzleShell title="点灯谜题" icon="💡">
    <section class="max-w-xl mx-auto space-y-4">
      <div class="grid grid-cols-2 gap-2">
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ state.moves }}</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">点击步数</div>
        </div>
        <div class="claude-card p-3 text-center">
          <div class="text-xl font-extrabold text-accent-light dark:text-accent-dark">{{ litCount }}/25</div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark">点亮格数</div>
        </div>
      </div>

      <div class="claude-card p-3 sm:p-5">
        <div class="grid grid-cols-5 gap-2 aspect-square max-w-md mx-auto" role="group" aria-label="点灯棋盘">
          <button
            v-for="(lit, index) in state.cells"
            :key="index"
            type="button"
            class="rounded-lg transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-light dark:focus-visible:ring-accent-dark"
            :class="lit ? 'bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.55)]' : 'bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark'"
            :aria-label="`第 ${Math.floor(index / state.size) + 1} 行第 ${index % state.size + 1} 列，${lit ? '亮' : '灭'}`"
            :disabled="state.status === 'won'"
            @click="play(index)"
          />
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-text-muted-light dark:text-text-muted-dark" aria-live="polite">
            {{ state.status === 'won' ? '🎉 全部点亮，过关！' : '点一格，它与上下左右的灯会一起翻转。' }}
          </p>
          <button type="button" class="eg-primary-btn" @click="newGame">🔄 换一局</button>
        </div>
      </div>
    </section>

    <template #rules>
      <ol class="list-decimal pl-5 space-y-2">
        <li>点击任意格子，会同时翻转该格和上下左右相邻的灯。</li>
        <li>把棋盘上的灯全部点亮即可通关。</li>
        <li>每局从已解状态打乱，因此总有解。</li>
      </ol>
    </template>
  </ExtraPuzzleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LightsOutEngine } from '../../game/lights-out/GameEngine'
import ExtraPuzzleShell from './components/ExtraPuzzleShell.vue'

const engine = new LightsOutEngine()
const state = ref(engine.getState())
const litCount = computed(() => state.value.cells.filter(Boolean).length)

function play(index: number) {
  if (engine.move(index)) state.value = engine.getState()
}

function newGame() {
  engine.reset()
  state.value = engine.getState()
}
</script>

<template>
  <div data-testid="gomoku-board" class="gomoku-board" :style="boardStyle">
    <button
      v-for="(cell, i) in state.board"
      :key="i"
      type="button"
      class="gomoku-cell"
      :class="{ 'gomoku-cell--win': isWinning(i) }"
      :disabled="!canSelect(i)"
      :aria-label="cellAria(i)"
      @click="$emit('select', i)"
    >
      <span
        v-if="cell"
        class="gomoku-stone"
        :class="cell === 'black' ? 'gomoku-stone--black' : 'gomoku-stone--white'"
        aria-hidden="true"
      ></span>
      <span v-if="state.lastMove === i" class="gomoku-last" aria-hidden="true"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cellCoord, stoneLabel, type GomokuState } from '../../game/gomoku/types'

const props = defineProps<{
  state: GomokuState
  canSelect: (index: number) => boolean
}>()

defineEmits<{ select: [index: number] }>()

const boardStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.state.config.size}, 1fr)`,
}))

function isWinning(index: number): boolean {
  return props.state.winningLine.includes(index)
}

function cellAria(index: number): string {
  const { row, col } = cellCoord(index, props.state.config.size)
  const cell = props.state.board[index]
  return `第 ${row} 行第 ${col} 列${cell ? `，${stoneLabel(cell)}` : ''}`
}
</script>

<style scoped>
.gomoku-board {
  display: grid;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 1rem;
  background-color: #e8dcc8;
  box-shadow:
    inset 0 1px 2px rgb(0 0 0 / 8%),
    var(--shadow-ring);
  padding: 0.375rem;
  touch-action: manipulation;
}

:global(.dark) .gomoku-board {
  background-color: #3a342c;
}

.gomoku-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid rgb(90 70 40 / 14%);
  border-bottom: 1px solid rgb(90 70 40 / 14%);
  aspect-ratio: 1 / 1;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

:global(.dark) .gomoku-cell {
  border-color: rgb(250 249 245 / 8%);
}

.gomoku-cell:disabled {
  cursor: default;
}

.gomoku-cell:not(:disabled):hover {
  background-color: rgb(181 84 58 / 10%);
}

.gomoku-stone {
  width: 78%;
  height: 78%;
  border-radius: 9999px;
  transition: transform 0.12s ease;
}

.gomoku-stone--black {
  background: radial-gradient(circle at 35% 30%, #4a4a47, #141413 70%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 35%);
}

.gomoku-stone--white {
  background: radial-gradient(circle at 35% 30%, #ffffff, #e6ddcd 70%);
  box-shadow:
    inset 0 0 0 1px rgb(90 70 40 / 22%),
    0 1px 2px rgb(0 0 0 / 22%);
}

.gomoku-last {
  position: absolute;
  width: 20%;
  height: 20%;
  border-radius: 9999px;
  background-color: #b5543a;
  box-shadow: 0 0 0 2px rgb(181 84 58 / 25%);
}

.gomoku-cell--win .gomoku-stone {
  box-shadow: 0 0 0 2px #b5543a;
}
</style>

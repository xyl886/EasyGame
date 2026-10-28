<template>
  <div
    data-testid="connect4-board"
    class="c4-board"
    :style="{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }"
  >
    <button
      v-for="col in COLS"
      :key="col"
      type="button"
      class="c4-col"
      :disabled="!canSelect(col - 1)"
      :aria-label="`第 ${col} 列`"
      @click="$emit('select', col - 1)"
    >
      <span
        v-for="row in ROWS"
        :key="row"
        class="c4-slot"
        :class="{ 'c4-slot--win': isWinning(indexOf(row - 1, col - 1)) }"
      >
        <span
          v-if="cellAt(row - 1, col - 1)"
          class="c4-disc"
          :class="[
            cellAt(row - 1, col - 1) === 'red' ? 'c4-disc--red' : 'c4-disc--yellow',
            { 'c4-disc--last': state.lastMove === indexOf(row - 1, col - 1) },
          ]"
          aria-hidden="true"
        ></span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { COLS, ROWS, cellCoord, type Connect4State } from '../../game/connect4/types'

const props = defineProps<{
  state: Connect4State
  canSelect: (col: number) => boolean
}>()

defineEmits<{ select: [col: number] }>()

function indexOf(row: number, col: number): number {
  return row * COLS + col
}

function cellAt(row: number, col: number): Connect4State['board'][number] {
  return props.state.board[indexOf(row, col)]
}

function isWinning(index: number): boolean {
  return props.state.winningLine.includes(index)
}

/** 保持 cellCoord 被用于无障碍提示（行列从 1 开始） */
function cellAria(row: number, col: number): string {
  const coord = cellCoord(row * COLS + col)
  return `第 ${coord.row} 行第 ${coord.col} 列`
}
void cellAria
</script>

<style scoped>
.c4-board {
  display: grid;
  width: 100%;
  aspect-ratio: 7 / 6;
  overflow: hidden;
  border-radius: 1rem;
  background-color: #e8dcc8;
  box-shadow:
    inset 0 1px 2px rgb(0 0 0 / 8%),
    var(--shadow-ring);
  padding: 0.375rem;
  gap: 0.25rem;
  touch-action: manipulation;
}

:global(.dark) .c4-board {
  background-color: #3a342c;
}

.c4-col {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.125rem;
  padding: 0.125rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.c4-col:disabled {
  cursor: default;
}

.c4-col:not(:disabled):hover {
  background-color: rgb(181 84 58 / 10%);
}

.c4-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border-radius: 9999px;
  background-color: rgb(20 20 19 / 6%);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 12%);
}

:global(.dark) .c4-slot {
  background-color: rgb(250 249 245 / 6%);
}

.c4-disc {
  width: 86%;
  height: 86%;
  border-radius: 9999px;
  transition: transform 0.12s ease;
}

.c4-disc--red {
  background: radial-gradient(circle at 35% 30%, #d97757, #a94730 75%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 35%);
}

.c4-disc--yellow {
  background: radial-gradient(circle at 35% 30%, #e8c766, #b9892f 75%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 30%);
}

.c4-disc--last {
  box-shadow:
    0 0 0 2px #b5543a,
    0 1px 2px rgb(0 0 0 / 35%);
}

.c4-slot--win .c4-disc {
  box-shadow: 0 0 0 2px #b5543a;
}
</style>

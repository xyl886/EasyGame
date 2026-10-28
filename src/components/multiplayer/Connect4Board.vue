<template>
  <div
    ref="boardRef"
    data-testid="connect4-board"
    class="c4-board"
    :class="{ 'c4-board--over': state.over, 'c4-board--impact': impacting }"
    :style="{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }"
  >
    <button
      v-for="col in COLS"
      :key="col"
      type="button"
      class="c4-col"
      :disabled="!canSelect(col - 1)"
      :aria-label="`第 ${col} 列`"
      @click="onSelect(col - 1)"
      @mouseenter="onHover(col - 1)"
      @mouseleave="clearHover"
      @focus="onHover(col - 1)"
      @blur="clearHover"
    >
      <span
        v-for="row in ROWS"
        :key="row"
        class="c4-slot"
        :class="{
          'c4-slot--win': isWinning(indexOf(row - 1, col - 1)),
          'c4-slot--target': isTarget(row - 1, col - 1),
        }"
      >
        <span
          v-if="isTarget(row - 1, col - 1) && !cellAt(row - 1, col - 1)"
          class="c4-ghost"
          :class="state.current === 'red' ? 'c4-ghost--red' : 'c4-ghost--yellow'"
          aria-hidden="true"
        ></span>

        <span
          v-if="cellAt(row - 1, col - 1)"
          class="c4-disc"
          :class="[
            cellAt(row - 1, col - 1) === 'red' ? 'c4-disc--red' : 'c4-disc--yellow',
            {
              'c4-disc--last':
                state.lastMove === indexOf(row - 1, col - 1) &&
                fallingIndex !== indexOf(row - 1, col - 1),
              'c4-disc--win': isWinning(indexOf(row - 1, col - 1)),
            },
          ]"
          :style="winStyle(indexOf(row - 1, col - 1))"
          :data-disc-index="indexOf(row - 1, col - 1)"
          aria-hidden="true"
        ></span>

        <span
          v-if="landingIndex === indexOf(row - 1, col - 1)"
          class="c4-ripple"
          aria-hidden="true"
        ></span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { COLS, ROWS, type Connect4State } from '../../game/connect4/types'
import { dropIndex } from '../../game/connect4/GameEngine'
import { sound } from '../../utils/sound'

const props = defineProps<{
  state: Connect4State
  canSelect: (col: number) => boolean
}>()

const emit = defineEmits<{ select: [col: number] }>()

const boardRef = ref<HTMLElement | null>(null)
const hoverCol = ref<number | null>(null)
const landingIndex = ref<number | null>(null)
const fallingIndex = ref<number | null>(null)
const impacting = ref(false)

let previousLastMove: number | null = props.state.lastMove
let previousMoves = props.state.moves
const activeAnimations = new Set<Animation>()
let rippleTimer: ReturnType<typeof setTimeout> | null = null
let impactTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

const FALL_DURATION = 520
const IMPACT_AT = 300

function indexOf(row: number, col: number): number {
  return row * COLS + col
}

function cellAt(row: number, col: number): Connect4State['board'][number] {
  return props.state.board[indexOf(row, col)]
}

function isWinning(index: number): boolean {
  return props.state.winningLine.includes(index)
}

/** 悬停列时，预览这枚棋子最终会落到的位置 */
function isTarget(row: number, col: number): boolean {
  if (hoverCol.value !== col || props.state.over) return false
  if (fallingIndex.value !== null && col === fallingIndex.value % COLS) return false
  if (!props.canSelect(col)) return false
  return dropIndex(props.state.board, col) === indexOf(row, col)
}

function winStyle(index: number): Record<string, string> | undefined {
  if (!isWinning(index)) return undefined
  const order = Math.max(0, props.state.winningLine.indexOf(index))
  return { '--win-delay': `${order * 90}ms` }
}

function onHover(col: number): void {
  if (fallingIndex.value !== null && col === fallingIndex.value % COLS) return
  hoverCol.value = props.canSelect(col) ? col : null
}

function onSelect(col: number): void {
  // 落子后立刻收起悬停预览，避免下一手颜色的虚影和下落中的棋子重叠
  hoverCol.value = null
  emit('select', col)
}

function clearHover(): void {
  hoverCol.value = null
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function triggerRipple(index: number): void {
  landingIndex.value = index
  if (rippleTimer) clearTimeout(rippleTimer)
  rippleTimer = setTimeout(() => {
    landingIndex.value = null
  }, 700)
}

function playImpact(index: number): void {
  if (impactTimer) clearTimeout(impactTimer)
  impactTimer = setTimeout(() => {
    triggerRipple(index)
    sound.play('drop')
    impacting.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      impacting.value = false
    }, 170)
  }, IMPACT_AT)
}

/**
 * 用 Web Animations API 做「真实重力」下落：
 * 先加速坠落到目标格 → 轻微回弹 → 再落定，比固定曲线更有重量感。
 * 距离按实际布局测量，任意屏幕尺寸都从棋盘顶部上方开始。
 */
async function animateDrop(index: number): Promise<void> {
  await nextTick()
  const board = boardRef.value
  const disc = board?.querySelector<HTMLElement>(`[data-disc-index="${index}"]`)
  const slot = disc?.parentElement
  if (!board || !disc || !slot) return

  if (prefersReducedMotion() || typeof disc.animate !== 'function') {
    triggerRipple(index)
    sound.play('drop')
    return
  }

  const boardRect = board.getBoundingClientRect()
  const discRect = disc.getBoundingClientRect()
  const slotRect = slot.getBoundingClientRect()
  const startTop = boardRect.top - slotRect.height * 0.45
  const distance = Math.max(0, discRect.top - startTop)

  fallingIndex.value = index
  disc.style.opacity = '0'
  disc.classList.add('c4-disc--falling')
  const animation = disc.animate(
    [
      {
        transform: `translateY(-${distance}px)`,
        opacity: 0,
        offset: 0,
        easing: 'linear',
      },
      {
        transform: `translateY(-${distance}px)`,
        opacity: 1,
        offset: 0.03,
        easing: 'cubic-bezier(0.5, 0, 0.92, 0.52)',
      },
      {
        transform: 'translateY(0px)',
        opacity: 1,
        offset: 0.58,
        easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
      },
      {
        transform: 'translateY(-9%)',
        opacity: 1,
        offset: 0.7,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      {
        transform: 'translateY(0px)',
        opacity: 1,
        offset: 0.8,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      {
        transform: 'translateY(-3.5%)',
        opacity: 1,
        offset: 0.89,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      { transform: 'translateY(0px)', opacity: 1, offset: 1 },
    ],
    { duration: FALL_DURATION, fill: 'backwards' },
  )

  disc.style.opacity = ''
  activeAnimations.add(animation)
  playImpact(index)

  animation.onfinish = () => {
    fallingIndex.value = null
    disc.style.opacity = ''
    disc.classList.remove('c4-disc--falling')
    activeAnimations.delete(animation)
  }
}

watch(
  () => props.state,
  (state) => {
    const isSingleNewMove =
      state.lastMove !== null &&
      state.lastMove !== previousLastMove &&
      state.moves === previousMoves + 1

    previousLastMove = state.lastMove
    previousMoves = state.moves

    if (isSingleNewMove && state.lastMove !== null) {
      void animateDrop(state.lastMove)
    }
    if (state.over) clearHover()
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  for (const animation of activeAnimations) animation.cancel()
  activeAnimations.clear()
  if (rippleTimer) clearTimeout(rippleTimer)
  if (impactTimer) clearTimeout(impactTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
})
</script>

<style scoped>
.c4-board--impact {
  animation: c4-board-impact 170ms ease-out;
}

.c4-board {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 7 / 6;
  overflow: hidden;
  border-radius: 1.1rem;
  padding: 0.45rem;
  gap: 0.3rem;
  touch-action: manipulation;
  user-select: none;
  background:
    radial-gradient(120% 90% at 12% 0%, rgb(255 255 255 / 30%), transparent 55%),
    linear-gradient(158deg, #eadfcb 0%, #ddcbae 100%);
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 38%),
    inset 0 -3px 8px rgb(90 60 25 / 16%),
    0 1px 2px rgb(0 0 0 / 5%),
    var(--shadow-ring);
}

:global(.dark .c4-board) {
  background:
    radial-gradient(120% 90% at 12% 0%, rgb(255 255 255 / 8%), transparent 55%),
    linear-gradient(158deg, #413a30 0%, #342e26 100%);
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 6%),
    inset 0 -3px 8px rgb(0 0 0 / 35%),
    0 1px 2px rgb(0 0 0 / 30%),
    var(--shadow-ring);
}

.c4-col {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.15rem;
  padding: 0.15rem;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.c4-col:disabled {
  cursor: default;
}

.c4-col:not(:disabled):hover {
  background-color: rgb(181 84 58 / 8%);
}

:global(.dark .c4-col:not(:disabled):hover) {
  background-color: rgb(250 249 245 / 6%);
}

.c4-col:focus-visible {
  outline: 2px solid #b5543a;
  outline-offset: 2px;
}

.c4-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border-radius: 9999px;
  background-color: #c8b28b;
  box-shadow:
    inset 0 4px 7px rgb(70 45 15 / 34%),
    inset 0 -1px 0 rgb(255 255 255 / 32%);
  transition: background-color 0.16s ease;
}

:global(.dark .c4-slot) {
  background-color: #27221c;
  box-shadow:
    inset 0 4px 7px rgb(0 0 0 / 55%),
    inset 0 -1px 0 rgb(255 255 255 / 5%);
}

.c4-slot--target {
  box-shadow:
    inset 0 0 0 2px rgb(181 84 58 / 55%),
    inset 0 3px 5px rgb(70 45 15 / 20%);
}

:global(.dark .c4-slot--target) {
  box-shadow:
    inset 0 0 0 2px rgb(240 199 170 / 65%),
    inset 0 4px 7px rgb(0 0 0 / 45%);
}

.c4-disc {
  position: relative;
  width: 84%;
  height: 84%;
  border-radius: 9999px;
  will-change: transform;
}

.c4-disc--falling {
  position: relative;
  z-index: 3;
}

.c4-disc::before {
  content: '';
  position: absolute;
  inset: 11% 17% auto 15%;
  height: 30%;
  border-radius: 9999px;
  background: linear-gradient(rgb(255 255 255 / 55%), rgb(255 255 255 / 0%));
  opacity: 0.75;
  pointer-events: none;
}

.c4-disc--red {
  background: radial-gradient(circle at 34% 28%, #e58a6b 0%, #c75a3c 48%, #963e28 100%);
  box-shadow:
    inset 0 -2px 4px rgb(0 0 0 / 28%),
    inset 0 2px 2px rgb(255 255 255 / 20%),
    0 2px 3px rgb(0 0 0 / 22%);
}

.c4-disc--yellow {
  background: radial-gradient(circle at 34% 28%, #f0d97e 0%, #d4a940 50%, #9c741f 100%);
  box-shadow:
    inset 0 -2px 4px rgb(0 0 0 / 24%),
    inset 0 2px 2px rgb(255 255 255 / 35%),
    0 2px 3px rgb(0 0 0 / 20%);
}

/* 最后一手：中心小点，红黄棋上都清晰 */
.c4-disc--last::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18%;
  height: 18%;
  border-radius: 9999px;
  transform: translate(-50%, -50%);
  background-color: #faf9f5;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 18%);
}

.c4-disc--yellow.c4-disc--last::after {
  background-color: #3a342c;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 22%);
}

/* 悬停/落点预览 */
.c4-ghost {
  position: absolute;
  width: 84%;
  height: 84%;
  border-radius: 9999px;
  opacity: 0.55;
  pointer-events: none;
  animation: c4-ghost-pulse 1.3s ease-in-out infinite;
}

.c4-ghost--red {
  background: radial-gradient(circle at 34% 28%, #e58a6b 0%, #c75a3c 48%, #963e28 100%);
  box-shadow: 0 0 0 2px rgb(181 84 58 / 55%);
}

.c4-ghost--yellow {
  background: radial-gradient(circle at 34% 28%, #f0d97e 0%, #d4a940 50%, #9c741f 100%);
  box-shadow: 0 0 0 2px rgb(212 169 64 / 65%);
}

/* 落子冲击波 */
.c4-ripple {
  position: absolute;
  width: 72%;
  height: 72%;
  border-radius: 9999px;
  border: 3px solid rgb(181 84 58 / 70%);
  pointer-events: none;
  animation: c4-ripple 640ms cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
}

:global(.dark .c4-ripple) {
  border-color: rgb(240 199 170 / 65%);
}

/* 胜利：四子依次弹一下，然后持续呼吸发光；其余棋子压暗 */
.c4-board--over .c4-disc:not(.c4-disc--win) {
  opacity: 0.5;
  filter: saturate(0.65);
  transition:
    opacity 0.4s ease 0.12s,
    filter 0.4s ease 0.12s;
}

.c4-disc--win {
  outline: 2px solid rgb(250 249 245 / 92%);
  outline-offset: 1px;
  animation:
    c4-win-pop 460ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--win-delay, 0ms) both,
    c4-win-glow 1.6s ease-in-out calc(var(--win-delay, 0ms) + 520ms) infinite;
}

:global(.dark .c4-disc--win) {
  outline-color: rgb(250 249 245 / 85%);
}

@keyframes c4-board-impact {
  0% {
    transform: translateY(0);
  }
  35% {
    transform: translateY(1.5px);
  }
  100% {
    transform: translateY(0);
  }
}

@keyframes c4-ghost-pulse {
  0%,
  100% {
    transform: scale(0.95);
    opacity: 0.45;
  }
  50% {
    transform: scale(1);
    opacity: 0.62;
  }
}

@keyframes c4-ripple {
  0% {
    transform: scale(0.45);
    opacity: 0.85;
  }
  100% {
    transform: scale(1.45);
    opacity: 0;
  }
}

@keyframes c4-win-pop {
  0% {
    transform: scale(1);
  }
  38% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes c4-win-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 0 rgb(226 178 90 / 0%)) brightness(1.04);
  }
  50% {
    filter: drop-shadow(0 0 8px rgb(226 178 90 / 95%)) brightness(1.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .c4-disc--win,
  .c4-ghost,
  .c4-board--impact {
    animation: none;
  }

  .c4-ripple {
    animation-duration: 1ms;
  }

  .c4-board--over .c4-disc:not(.c4-disc--win) {
    transition: none;
  }
}
</style>

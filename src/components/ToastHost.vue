<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="message"
        class="fixed bottom-6 left-1/2 z-[100] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-text-light px-4 py-2.5 text-center text-sm font-medium text-bg-light shadow-lift dark:bg-text-dark dark:text-bg-dark"
        role="status"
        aria-live="polite"
      >
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { message } from '../utils/toast'
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.2, 0, 0, 1),
    transform 0.2s cubic-bezier(0.2, 0, 0, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>

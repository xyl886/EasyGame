<template>
  <div
    class="flex min-h-[60dvh] w-full flex-col items-center justify-center gap-4"
    role="status"
    aria-live="polite"
  >
    <div
      class="flex h-11 w-11 items-center justify-center rounded-xl bg-sand-light text-accent-light shadow-ring dark:bg-sand-dark dark:text-accent-dark"
      aria-hidden="true"
    >
      <AppIcon name="logo" :size="20" />
    </div>
    <p class="text-caption text-text-muted-light dark:text-text-muted-dark">加载中…</p>
  </div>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'
</script>

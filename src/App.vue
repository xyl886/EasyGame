<template>
  <div class="flex min-h-[100dvh] w-full flex-col">
    <router-view v-slot="{ Component }">
      <Suspense>
        <template #default>
          <component :is="Component" class="animate-fade-in" />
        </template>
        <template #fallback>
          <RouteLoading />
        </template>
      </Suspense>
    </router-view>
    <ToastHost />
    <!-- PWA 有新版本时提示手动更新（prompt 模式，不打断对局） -->
    <Transition name="update">
      <div
        v-if="needRefresh"
        class="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-card-light px-4 py-2.5 shadow-lift dark:bg-card-dark"
        role="status"
        aria-live="polite"
      >
        <span class="whitespace-nowrap text-caption text-text-light dark:text-text-dark"
          >有新版本可用</span
        >
        <button
          type="button"
          class="eg-primary-btn !min-h-0 !px-3 !py-1.5 !text-xs"
          @click="onApplyUpdate"
        >
          立即更新
        </button>
        <button
          type="button"
          class="text-caption text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
          @click="needRefresh = false"
        >
          稍后
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useThemeStore } from './stores/theme'
import { sound } from './utils/sound'
import { needRefresh, applySWUpdate } from './utils/pwa'
import RouteLoading from './components/RouteLoading.vue'
import ToastHost from './components/ToastHost.vue'

const themeStore = useThemeStore()

async function onApplyUpdate() {
  await applySWUpdate()
}

/** 全局按钮点击音：捕获阶段监听，任何 button / 链接点击都播 click */
function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (target.closest('button, a, [role="button"]')) {
    sound.play('click')
  }
}

onMounted(() => {
  themeStore.initTheme()
  document.addEventListener('click', onDocClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, true)
})
</script>

<style scoped>
.update-enter-active,
.update-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.2, 0, 0, 1),
    transform 0.2s cubic-bezier(0.2, 0, 0, 1);
}
.update-enter-from,
.update-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>

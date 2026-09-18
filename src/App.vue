<template>
  <div class="min-h-screen w-full flex flex-col">
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
    <div
      v-if="needRefresh"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-claude-md px-4 py-2.5 text-sm"
    >
      <span class="text-text-light dark:text-text-dark">有新版本可用</span>
      <button
        type="button"
        class="rounded-lg bg-accent-light dark:bg-accent-dark text-white px-3 py-1 text-xs font-semibold"
        @click="onApplyUpdate"
      >
        立即更新
      </button>
      <button
        type="button"
        class="text-xs text-text-muted-light dark:text-text-muted-dark"
        @click="needRefresh = false"
      >
        稍后
      </button>
    </div>
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

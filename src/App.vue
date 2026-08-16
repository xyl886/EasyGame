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
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useThemeStore } from './stores/theme'
import { sound } from './utils/sound'
import RouteLoading from './components/RouteLoading.vue'
import ToastHost from './components/ToastHost.vue'

const themeStore = useThemeStore()

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

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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from './stores/theme'
import RouteLoading from './components/RouteLoading.vue'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})
</script>

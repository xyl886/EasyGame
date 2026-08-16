<template>
  <div class="min-h-screen w-full flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-6 animate-fade-in">
      <div class="text-7xl md:text-8xl font-bold tracking-tight bg-gradient-to-br from-accent-light to-accent-hover-light dark:from-accent-dark dark:to-accent-hover-dark bg-clip-text text-transparent select-none">
        404
      </div>
      <div class="space-y-2">
        <h1 class="text-xl md:text-2xl font-semibold text-text-light dark:text-text-dark">
          页面走丢了 🕹️
        </h1>
        <p class="text-sm text-text-muted-light dark:text-text-muted-dark leading-relaxed">
          你访问的页面不存在，可能已被移除或地址有误。<br />
          回到游戏大厅，继续轻松玩、随时乐。
        </p>
      </div>
      <div class="flex items-center justify-center gap-3 pt-2">
        <RouterLink to="/" class="claude-btn-primary">
          <span>🏠</span>
          <span>返回游戏大厅</span>
        </RouterLink>
        <button type="button" class="claude-btn-secondary" @click="goBack">
          <span>↩️</span>
          <span>返回上一页</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  // 有历史记录则回退，否则回首页
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}
</script>

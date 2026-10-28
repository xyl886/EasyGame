<template>
  <div class="eg-shell items-center justify-center">
    <div class="w-full max-w-md space-y-6 text-center animate-fade-in">
      <p class="eg-overline">Error 404</p>
      <div class="space-y-3">
        <h1 class="eg-display text-accent-light dark:text-accent-dark">页面走丢了</h1>
        <p class="eg-caption leading-relaxed">
          你访问的页面不存在，可能已被移除或地址有误。<br />
          回到游戏大厅，继续轻松玩、随时乐。
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <RouterLink to="/" class="eg-primary-btn">
          <AppIcon name="arrow-left" :size="18" />
          <span>返回游戏大厅</span>
        </RouterLink>
        <button type="button" class="eg-ghost-btn" @click="goBack">
          <AppIcon name="undo" :size="18" />
          <span>返回上一页</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'

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

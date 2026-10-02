<template>
  <div class="claude-card p-5 md:p-6 space-y-4 animate-rise-in">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span
          class="w-9 h-9 rounded-xl bg-accent-light/10 dark:bg-accent-dark/10 text-lg flex items-center justify-center"
          >📱</span
        >
        <div>
          <h3 class="font-semibold text-text-light dark:text-text-dark leading-tight">扫码即玩</h3>
          <p class="text-xs text-text-muted-light dark:text-text-muted-dark">手机直达大厅，无需安装</p>
        </div>
      </div>
      <span
        class="text-xs px-2.5 py-1 rounded-full bg-accent-light/10 dark:bg-accent-dark/10 text-accent-light dark:text-accent-dark font-medium border border-accent-light/15 dark:border-accent-dark/20"
      >
        已上线
      </span>
    </div>

    <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div class="flex flex-col items-center gap-2 shrink-0">
        <div
          class="p-2.5 rounded-2xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark shadow-claude"
        >
          <img :src="qrDataUrl" alt="扫码访问" class="w-32 h-32 rounded-lg" />
        </div>
        <span class="text-xs text-text-muted-light dark:text-text-muted-dark">手机扫码直达游戏大厅</span>
      </div>

      <div class="flex-1 space-y-4 w-full text-center sm:text-left">
        <!-- 操作方式 -->
        <div class="space-y-2">
          <h4
            class="text-sm font-medium text-text-light dark:text-text-dark flex items-center justify-center sm:justify-start gap-1.5"
          >
            <span>🎮</span><span>操作方式</span>
          </h4>
          <ul class="text-sm space-y-2.5 text-text-muted-light dark:text-text-muted-dark">
            <li class="flex items-center justify-center sm:justify-start gap-2.5">
              <span class="shrink-0 text-text-light dark:text-text-dark">💻</span>
              <span
                >PC：键盘 <kbd class="eg-kbd">↑ ↓ ← →</kbd> 或 <kbd class="eg-kbd">W A S D</kbd></span
              >
            </li>
            <li class="flex items-center justify-center sm:justify-start gap-2.5">
              <span class="shrink-0 text-text-light dark:text-text-dark">📱</span>
              <span>手机：在棋盘上<strong class="text-text-light dark:text-text-dark">上下左右滑动</strong>手指操作</span>
            </li>
            <li class="flex items-center justify-center sm:justify-start gap-2.5">
              <span class="shrink-0 text-text-light dark:text-text-dark">💾</span>
              <span>最高分自动保存到本地，关闭网页不会丢失</span>
            </li>
            <li class="flex items-center justify-center sm:justify-start gap-2.5">
              <span class="shrink-0 text-text-light dark:text-text-dark">↩️</span>
              <span>支持撤销一步，手滑也不怕</span>
            </li>
          </ul>
        </div>

        <!-- 按钮 -->
        <button @click="shareHome" class="eg-primary-btn w-full sm:w-auto">
          <span>📤</span>
          <span>分享给朋友</span>
        </button>

        <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
          即开即玩、离线可用；部署更新后请刷新页面，已安装 PWA 的用户会提示更新
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import QRCode from 'qrcode'
import { shareOrCopy, shareUrl } from '../utils/share'
import { toast } from '../utils/toast'

const qrDataUrl = ref<string>('')

/** 线上地址：自动取当前部署域名 + 子路径（GitHub Pages / 自定义域名均正确） */
const accessUrl = computed(() => `${location.origin}${location.pathname}`)

onMounted(async () => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(accessUrl.value, {
      width: 256,
      margin: 1,
      color: {
        dark: '#2D3748',
        light: '#ffffff',
      },
    })
  } catch (e) {
    console.warn('生成二维码失败', e)
  }
})

async function shareHome() {
  const result = await shareOrCopy({
    text: '🎮 EasyGame：九款经典益智小游戏（2048、贪吃蛇、俄罗斯方块、数独、扫雷…），即开即玩、离线可用，来一起玩！',
    url: shareUrl('/'),
  })
  toast(result === 'shared' ? '✅ 已分享' : result === 'copied' ? '📋 链接已复制，快发给朋友吧' : '❌ 分享失败')
}
</script>

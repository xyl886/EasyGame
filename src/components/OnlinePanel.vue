<template>
  <div class="claude-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">📱</span>
        <h3 class="font-semibold text-text-light dark:text-text-dark">扫码即玩</h3>
      </div>
      <span class="text-xs px-2 py-1 rounded-full bg-accent-light/10 dark:bg-accent-dark/10 text-accent-light dark:text-accent-dark font-medium">
        🚀 已上线
      </span>
    </div>

    <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div class="p-2 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark shrink-0">
        <img :src="qrDataUrl" alt="扫码访问" class="w-32 h-32" />
      </div>
      <div class="flex-1 space-y-2 w-full text-center sm:text-left">
        <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
          手机扫码直达游戏大厅，即开即玩、离线可用
        </p>
        <button
          @click="copyUrl"
          class="w-full inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 bg-accent-light hover:bg-accent-hover-light dark:bg-accent-dark dark:hover:bg-accent-hover-dark text-white text-sm font-medium shadow-claude transition-all active:scale-[0.98]"
        >
          {{ copied ? '✓ 已复制' : '📋 复制链接' }}
        </button>
        <p class="text-xs opacity-60 text-text-muted-light dark:text-text-muted-dark">
          部署更新后请刷新页面；已安装 PWA 的用户会自动更新
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import QRCode from 'qrcode'
import { PlatformAdapter } from '../adapters/PlatformAdapter'

const qrDataUrl = ref<string>('')
const copied = ref(false)

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

async function copyUrl() {
  const ok = await PlatformAdapter.copyToClipboard(accessUrl.value)
  if (ok) {
    copied.value = true
    PlatformAdapter.toast('线上链接已复制')
    setTimeout(() => (copied.value = false), 1800)
  } else {
    PlatformAdapter.toast('复制失败，请手动复制')
  }
}
</script>

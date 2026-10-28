<template>
  <div
    class="grid gap-5 rounded-2xl bg-card-light p-5 shadow-ring md:grid-cols-[auto_1fr] md:gap-8 md:p-6 dark:bg-card-dark"
  >
    <!-- 二维码 -->
    <div class="flex flex-col items-center gap-3">
      <div class="rounded-2xl bg-bg-light p-3 shadow-ring dark:bg-bg-dark">
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          alt="扫码在手机打开 EasyGame 游戏大厅"
          class="h-32 w-32 rounded-lg"
          width="128"
          height="128"
        />
        <div
          v-else
          class="flex h-32 w-32 flex-col items-center justify-center gap-2 text-center text-caption text-text-faint-light dark:text-text-faint-dark"
          role="img"
          aria-label="二维码生成中"
        >
          <AppIcon name="logo" :size="22" />
          <span>二维码生成中…</span>
        </div>
      </div>
      <p class="eg-caption text-center">手机扫码直达游戏大厅</p>
    </div>

    <!-- 说明与分享 -->
    <div class="flex flex-col justify-between gap-5">
      <div class="space-y-4">
        <div>
          <h3 class="font-display text-title font-medium text-text-light dark:text-text-dark">
            在手机上继续玩
          </h3>
          <p class="eg-caption mt-1">
            电脑上打开的局面会保存在本机，换到手机后从头开始也不会有心理负担。
          </p>
        </div>

        <ul class="space-y-3">
          <li class="flex items-start gap-3">
            <span class="mt-0.5 text-text-faint-light dark:text-text-faint-dark" aria-hidden="true">
              <AppIcon name="arrow-left" :size="17" />
            </span>
            <p class="text-caption leading-relaxed text-text-muted-light dark:text-text-muted-dark">
              电脑：方向键 <kbd class="eg-kbd">↑ ↓ ← →</kbd> 或 <kbd class="eg-kbd">W A S D</kbd>
            </p>
          </li>
          <li class="flex items-start gap-3">
            <span class="mt-0.5 text-text-faint-light dark:text-text-faint-dark" aria-hidden="true">
              <AppIcon name="share" :size="17" />
            </span>
            <p class="text-caption leading-relaxed text-text-muted-light dark:text-text-muted-dark">
              手机：在棋盘上<strong class="font-semibold text-text-light dark:text-text-dark"
                >滑动</strong
              >，或点按屏幕按钮操作
            </p>
          </li>
          <li class="flex items-start gap-3">
            <span class="mt-0.5 text-text-faint-light dark:text-text-faint-dark" aria-hidden="true">
              <AppIcon name="check" :size="17" />
            </span>
            <p class="text-caption leading-relaxed text-text-muted-light dark:text-text-muted-dark">
              最高分、设置与进度自动保存在本机；支持撤销一步，误触也不怕
            </p>
          </li>
        </ul>

        <p
          v-if="isLocalAddress"
          class="rounded-lg bg-warn-light/10 px-3 py-2 text-caption text-warn-light dark:bg-warn-dark/10 dark:text-warn-dark"
          role="note"
        >
          当前是本机开发地址（{{
            hostLabel
          }}），手机扫码无法访问。请使用线上地址，或让手机访问电脑的局域网 IP。
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="eg-primary-btn" @click="shareHome">
          <AppIcon name="share" :size="17" />
          <span>分享给朋友</span>
        </button>
        <p class="eg-hint">部署更新后刷新页面即可；已安装的 PWA 会提示更新。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { shareOrCopy, shareUrl } from '../utils/share'
import { toast } from '../utils/toast'
import AppIcon from './AppIcon.vue'

const qrDataUrl = ref<string>('')

/** 线上地址：自动取当前部署域名 + 子路径（GitHub Pages / 自定义域名均正确） */
const accessUrl = computed(() => `${location.origin}${location.pathname}`)
const isLocalAddress = computed(() =>
  ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(location.hostname),
)
const hostLabel = computed(() => location.host)

onMounted(async () => {
  try {
    // 动态加载：二维码库只在大厅需要时才下载，减小首屏体积
    const { default: QRCode } = await import('qrcode')
    qrDataUrl.value = await QRCode.toDataURL(accessUrl.value, {
      width: 256,
      margin: 1,
      color: { dark: '#141413', light: '#faf9f5' },
    })
  } catch (error) {
    console.warn('生成二维码失败', error)
  }
})

async function shareHome() {
  const result = await shareOrCopy({
    text: '🎮 EasyGame：八款经典益智小游戏（2048、贪吃蛇、俄罗斯方块、数独、扫雷…），即开即玩、离线可用，来一起玩！',
    url: shareUrl('/'),
  })
  toast(
    result === 'shared'
      ? '✅ 已分享'
      : result === 'copied'
        ? '📋 链接已复制，快发给朋友吧'
        : '❌ 分享失败',
  )
}
</script>

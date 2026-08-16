<template>
  <div class="claude-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">📡</span>
        <h3 class="font-semibold text-text-light dark:text-text-dark">局域网访问</h3>
      </div>
      <span class="text-xs px-2 py-1 rounded-full bg-accent-light/10 dark:bg-accent-dark/10 text-accent-light dark:text-accent-dark font-medium">
        服务运行中
      </span>
    </div>

    <div v-if="qrDataUrl" class="flex gap-4 items-center">
      <div class="p-2 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark">
        <img :src="qrDataUrl" alt="扫码访问" class="w-24 h-24" />
      </div>
      <div class="flex-1 space-y-2 min-w-0">
        <div>
          <div class="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">手机扫码直接访问</div>
          <div class="text-sm font-mono font-semibold truncate break-all text-text-light dark:text-text-dark">{{ accessUrl }}</div>
        </div>
        <button
          @click="copyUrl"
          class="w-full inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 bg-accent-light hover:bg-accent-hover-light dark:bg-accent-dark dark:hover:bg-accent-hover-dark text-white text-sm font-medium shadow-claude transition-all active:scale-[0.98]"
        >
          {{ copied ? '✓ 已复制' : '📋 复制地址' }}
        </button>
      </div>
    </div>

    <details class="text-xs text-text-muted-light dark:text-text-muted-dark">
      <summary class="cursor-pointer hover:text-text-light dark:hover:text-text-dark select-none transition-colors">无法访问？查看排查方案</summary>
      <ul class="mt-2 space-y-1 list-disc pl-4">
        <li>确保手机和电脑连接在<strong class="text-text-light dark:text-text-dark">同一个 WiFi / 局域网</strong></li>
        <li>Windows 防火墙弹出提示时，选择<strong class="text-text-light dark:text-text-dark">允许</strong>专用网络访问</li>
        <li>部分公司网络/公共 WiFi 可能隔离设备，此时使用手机热点测试</li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import QRCode from 'qrcode'
import { PlatformAdapter } from '../adapters/PlatformAdapter'

const qrDataUrl = ref<string>('')
const copied = ref(false)

const ip = typeof __LOCAL_IP__ !== 'undefined' ? __LOCAL_IP__ : '127.0.0.1'
const port = typeof __SERVER_PORT__ !== 'undefined' ? __SERVER_PORT__ : 5173
const accessUrl = computed(() => `http://${ip}:${port}/`)

onMounted(async () => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(accessUrl.value, {
      width: 192,
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
    PlatformAdapter.toast('地址已复制')
    setTimeout(() => (copied.value = false), 1800)
  } else {
    PlatformAdapter.toast('复制失败，请手动复制')
  }
}
</script>

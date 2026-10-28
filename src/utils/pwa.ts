/**
 * PWA Service Worker 注册（仅生产构建）
 * registerType=autoUpdate：新版本静默接管，不弹提示、不打断对局；
 * 已安装的 PWA 在下次启动 / 刷新时直接使用新版本。
 */
import { ref } from 'vue'
import { toast } from './toast'

export const offlineReady = ref(false)

export function registerAppSW(): void {
  if (!import.meta.env.PROD) return

  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onOfflineReady() {
        offlineReady.value = true
        toast('✅ 已可离线游玩')
        setTimeout(() => {
          offlineReady.value = false
        }, 2500)
      },
    })
  })
}

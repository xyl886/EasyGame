/**
 * PWA Service Worker 注册（仅生产构建）
 * registerType=prompt：有新版本时提示用户手动刷新，避免对局中被 autoUpdate 打断。
 */
import { ref } from 'vue'
import { toast } from './toast'

export const needRefresh = ref(false)
export const offlineReady = ref(false)

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

export function registerAppSW(): void {
  if (!import.meta.env.PROD) return
  void import('virtual:pwa-register').then(({ registerSW }) => {
    updateSW = registerSW({
      onNeedRefresh() {
        needRefresh.value = true
        toast('🔄 有新版本，点右上角更新或刷新页面')
      },
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

export async function applySWUpdate(): Promise<void> {
  needRefresh.value = false
  await updateSW?.(true)
}

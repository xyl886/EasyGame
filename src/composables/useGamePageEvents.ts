import { onBeforeUnmount, onMounted } from 'vue'

interface GamePageEventHandlers {
  keydown?: (event: KeyboardEvent) => void
  resize?: () => void
  visibilitychange?: () => void
  pagehide?: () => void
}

/** 统一管理游戏页面常用的浏览器事件，避免离页后遗留监听器。 */
export function useGamePageEvents(handlers: GamePageEventHandlers): void {
  onMounted(() => {
    if (handlers.keydown) window.addEventListener('keydown', handlers.keydown)
    if (handlers.resize) window.addEventListener('resize', handlers.resize)
    if (handlers.visibilitychange)
      document.addEventListener('visibilitychange', handlers.visibilitychange)
    if (handlers.pagehide) window.addEventListener('pagehide', handlers.pagehide)
  })

  onBeforeUnmount(() => {
    if (handlers.keydown) window.removeEventListener('keydown', handlers.keydown)
    if (handlers.resize) window.removeEventListener('resize', handlers.resize)
    if (handlers.visibilitychange)
      document.removeEventListener('visibilitychange', handlers.visibilitychange)
    if (handlers.pagehide) window.removeEventListener('pagehide', handlers.pagehide)
  })
}

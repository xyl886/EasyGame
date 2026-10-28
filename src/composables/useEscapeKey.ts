import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Esc 关闭弹层：只在打开时响应，并阻止事件继续冒泡到游戏键盘处理。
 * 各弹层组件挂载一次即可（常驻监听，但关闭状态下不动作）。
 */
export function useEscapeKey(isOpen: () => boolean, onClose: () => void): void {
  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !isOpen()) return
    event.stopPropagation()
    onClose()
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
}

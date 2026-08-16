/**
 * 轻量全局 Toast：模块级响应式消息 + 自动消失
 * 由 ToastHost.vue 渲染，share / 复制等操作反馈使用。
 */
import { ref } from 'vue'

const message = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

export function toast(msg: string, ms = 2200): void {
  message.value = msg
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    message.value = ''
  }, ms)
}

/** ToastHost 读取用 */
export { message }

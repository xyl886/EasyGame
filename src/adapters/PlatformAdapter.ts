/**
 * 平台适配层
 * 封装浏览器/小程序环境差异 API
 */
export const PlatformAdapter = {
  /** 是否在浏览器环境 */
  isBrowser(): boolean {
    return typeof window !== 'undefined'
  },

  /** 是否在微信小程序环境 */
  isWechatMiniProgram(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (globalThis as any).wx !== 'undefined' && typeof (globalThis as any).wx.getSystemInfoSync === 'function'
  },

  /** 复制到剪贴板 */
  async copyToClipboard(text: string): Promise<boolean> {
    if (this.isBrowser() && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // fallback
      }
    }
    // Fallback
    if (this.isBrowser()) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        return true
      } catch {
        return false
      } finally {
        document.body.removeChild(textarea)
      }
    }
    return false
  },

  /** 弹窗提示 */
  toast(message: string): void {
    if (this.isBrowser()) {
      // 使用简易 toast，后续可替换为 UI 库
      const el = document.createElement('div')
      el.textContent = message
      el.style.cssText = `
        position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.75); color: #fff; padding: 10px 20px;
        border-radius: 8px; z-index: 9999; font-size: 14px;
      `
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 1800)
    }
  },
}

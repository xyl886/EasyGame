/**
 * 存储适配层
 * 浏览器环境使用 localStorage，后续迁移小程序时改为 wx.setStorageSync
 * 写入失败（配额满 / 隐私模式）时通过 handler 上报，由 App 注册 toast。
 */
let errorHandler: ((message: string) => void) | null = null

/** 注册存储错误提示（App 启动时调用一次） */
export function setStorageErrorHandler(handler: (message: string) => void): void {
  errorHandler = handler
}

export const StorageAdapter = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.warn('[StorageAdapter] set failed:', key, err)
      errorHandler?.('⚠️ 本地存储写入失败，进度/设置可能无法保存')
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      console.warn('[StorageAdapter] remove failed:', key, err)
    }
  },
}

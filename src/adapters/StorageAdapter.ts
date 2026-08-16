/**
 * 存储适配层
 * 浏览器环境使用 localStorage，后续迁移小程序时改为 wx.setStorageSync
 */
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
    } catch {
      // 忽略存储错误（如隐私模式）
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

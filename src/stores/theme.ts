import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'easygame-theme'

/** 同步浏览器/PWA 的 theme-color，让地址栏、状态栏跟随主题 */
function syncThemeColor(mode: ThemeMode): void {
  const color = mode === 'dark' ? '#141413' : '#f5f4ed'
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', color))
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'light' as ThemeMode,
  }),

  getters: {
    isDark: (state) => state.mode === 'dark',
  },

  actions: {
    initTheme() {
      const saved = StorageAdapter.get<ThemeMode>(THEME_KEY)
      if (saved === 'light' || saved === 'dark') {
        this.mode = saved
      } else {
        // 默认跟随系统
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
        this.mode = prefersDark ? 'dark' : 'light'
      }
      this.applyTheme()
    },

    toggleTheme() {
      this.mode = this.mode === 'light' ? 'dark' : 'light'
      StorageAdapter.set(THEME_KEY, this.mode)
      this.applyTheme()
    },

    applyTheme() {
      const root = document.documentElement
      root.classList.toggle('dark', this.mode === 'dark')
      root.style.colorScheme = this.mode
      syncThemeColor(this.mode)
    },
  },
})

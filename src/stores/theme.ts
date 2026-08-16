import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'easygame-theme'

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
      if (this.mode === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    },
  },
})

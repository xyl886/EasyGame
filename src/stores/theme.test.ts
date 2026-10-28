// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useThemeStore } from './theme'

describe('主题 store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    setActivePinia(createPinia())
  })

  it('无存档时跟随系统（jsdom 默认为浅色）', () => {
    const store = useThemeStore()
    store.initTheme()

    expect(store.mode).toBe('light')
    expect(store.isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('读取存档并应用深色', () => {
    localStorage.setItem('easygame-theme', JSON.stringify('dark'))
    const store = useThemeStore()
    store.initTheme()

    expect(store.mode).toBe('dark')
    expect(store.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('切换主题会持久化', () => {
    const store = useThemeStore()
    store.initTheme()

    store.toggleTheme()
    expect(store.mode).toBe('dark')
    expect(localStorage.getItem('easygame-theme')).toContain('dark')

    store.toggleTheme()
    expect(store.mode).toBe('light')
    expect(localStorage.getItem('easygame-theme')).toContain('light')
  })
})

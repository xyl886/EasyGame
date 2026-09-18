import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { LinkConfig, LinkDifficulty, LinkTheme } from '../game/lianliankan/types'
import { DEFAULT_LINK_CONFIG } from '../game/lianliankan/types'

const CONFIG_KEY = 'easygame-lianliankan-config'

const validDifficulties: LinkDifficulty[] = ['easy', 'normal', 'hard']
const validThemes: LinkTheme[] = ['fruit', 'animal', 'emoji']

function loadConfig(): LinkConfig {
  const saved = StorageAdapter.get<Partial<LinkConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_LINK_CONFIG, ...saved }
  if (!validDifficulties.includes(merged.difficulty)) merged.difficulty = DEFAULT_LINK_CONFIG.difficulty
  if (!validThemes.includes(merged.theme)) merged.theme = DEFAULT_LINK_CONFIG.theme
  return merged
}

export { DIFFICULTY_LABELS, THEME_LABELS, LINK_PRESETS } from '../game/lianliankan/types'

export const useLianliankanSettingsStore = defineStore('lianliankan-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<LinkConfig>) {
      this.config = { ...this.config, ...partial }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },

    openSettings() {
      this.showSettings = true
    },

    closeSettings() {
      this.showSettings = false
    },

    resetToDefault() {
      this.config = { ...DEFAULT_LINK_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

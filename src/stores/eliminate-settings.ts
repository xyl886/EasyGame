import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { EliminateConfig, EliminateDifficulty, EliminateTheme } from '../game/eliminate/types'
import { DEFAULT_ELIMINATE_CONFIG } from '../game/eliminate/types'

const CONFIG_KEY = 'easygame-eliminate-config'

const validDifficulties: EliminateDifficulty[] = ['easy', 'normal', 'hard']
const validThemes: EliminateTheme[] = ['gem', 'candy', 'fruit']

function loadConfig(): EliminateConfig {
  const saved = StorageAdapter.get<Partial<EliminateConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_ELIMINATE_CONFIG, ...saved }
  if (!validDifficulties.includes(merged.difficulty)) merged.difficulty = DEFAULT_ELIMINATE_CONFIG.difficulty
  if (!validThemes.includes(merged.theme)) merged.theme = DEFAULT_ELIMINATE_CONFIG.theme
  return merged
}

export { DIFFICULTY_LABELS, THEME_LABELS, ELIMINATE_PRESETS } from '../game/eliminate/types'

export const useEliminateSettingsStore = defineStore('eliminate-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<EliminateConfig>) {
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
      this.config = { ...DEFAULT_ELIMINATE_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

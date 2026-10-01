import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { Merge1024Config, Merge1024Difficulty, Merge1024Theme } from '../game/merge1024/types'
import { DEFAULT_MERGE1024_CONFIG } from '../game/merge1024/types'

const CONFIG_KEY = 'easygame-merge1024-config'

const validDifficulties: Merge1024Difficulty[] = ['easy', 'normal', 'hard']
const validThemes: Merge1024Theme[] = ['classic', 'candy']

function loadConfig(): Merge1024Config {
  const saved = StorageAdapter.get<Partial<Merge1024Config>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_MERGE1024_CONFIG, ...saved }
  if (!validDifficulties.includes(merged.difficulty)) merged.difficulty = DEFAULT_MERGE1024_CONFIG.difficulty
  if (!validThemes.includes(merged.theme)) merged.theme = DEFAULT_MERGE1024_CONFIG.theme
  return merged
}

export { DIFFICULTY_LABELS, THEME_LABELS, MERGE1024_PRESETS } from '../game/merge1024/types'

export const useMerge1024SettingsStore = defineStore('merge1024-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<Merge1024Config>) {
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
      this.config = { ...DEFAULT_MERGE1024_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

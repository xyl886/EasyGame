import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { KlotskiConfig, KlotskiDifficulty } from '../game/klotski/types'
import {
  DEFAULT_CONFIG,
  SIZE_OPTIONS,
  DIFFICULTY_LABELS,
} from '../game/klotski/types'

const CONFIG_KEY = 'easygame-klotski-config'

const validDifficulties: KlotskiDifficulty[] = ['easy', 'normal', 'hard']

function loadConfig(): KlotskiConfig {
  const saved = StorageAdapter.get<Partial<KlotskiConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_CONFIG, ...saved }
  if (!SIZE_OPTIONS.includes(merged.size as (typeof SIZE_OPTIONS)[number])) {
    merged.size = DEFAULT_CONFIG.size
  }
  if (!validDifficulties.includes(merged.difficulty)) {
    merged.difficulty = DEFAULT_CONFIG.difficulty
  }
  return merged
}

export { SIZE_OPTIONS, DIFFICULTY_LABELS }

export const useKlotskiSettingsStore = defineStore('klotski-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<KlotskiConfig>) {
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
      this.config = { ...DEFAULT_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

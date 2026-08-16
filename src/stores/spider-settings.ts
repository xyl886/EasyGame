import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { SpiderConfig, SpiderDifficulty } from '../game/spider/types'
import { DEFAULT_SPIDER_CONFIG, DIFFICULTY_LABELS } from '../game/spider/types'

const CONFIG_KEY = 'easygame-spider-config'

const validDifficulties: SpiderDifficulty[] = ['one', 'two', 'four']

function loadConfig(): SpiderConfig {
  const saved = StorageAdapter.get<Partial<SpiderConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_SPIDER_CONFIG, ...saved }
  if (!validDifficulties.includes(merged.difficulty)) {
    merged.difficulty = DEFAULT_SPIDER_CONFIG.difficulty
  }
  return merged
}

export { DIFFICULTY_LABELS }

export const useSpiderSettingsStore = defineStore('spider-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<SpiderConfig>) {
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
      this.config = { ...DEFAULT_SPIDER_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { SpiderConfig } from '../game/spider/types'
import { DEFAULT_SPIDER_CONFIG, DIFFICULTY_OPTIONS, MODE_LABELS } from '../game/spider/types'

const CONFIG_KEY = 'easygame-spider-config'

function loadConfig(): SpiderConfig {
  const saved = StorageAdapter.get<Partial<SpiderConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_SPIDER_CONFIG, ...saved }
  // 校验：必须是可选难度组合之一，否则回默认
  const valid = DIFFICULTY_OPTIONS.some(
    (d) => d.suits === merged.suits && d.mode === merged.mode,
  )
  if (!valid) {
    return { ...DEFAULT_SPIDER_CONFIG }
  }
  return merged
}

export { DIFFICULTY_OPTIONS, MODE_LABELS }

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

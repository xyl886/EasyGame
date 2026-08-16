import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { KlotskiConfig, KlotskiDifficulty } from '../game/klotski/types'
import type { ClassicLayoutId } from '../game/klotski-classic/types'
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
    /** 三国版布局（独立持久化） */
    classicLayout: StorageAdapter.get<ClassicLayoutId>('easygame-klotski-classic-layout') ?? 'hengdaolima',
  }),

  actions: {
    setConfig(partial: Partial<KlotskiConfig>) {
      this.config = { ...this.config, ...partial }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },

    /** 设置三国版布局并持久化 */
    setClassicLayout(layout: ClassicLayoutId) {
      this.classicLayout = layout
      StorageAdapter.set('easygame-klotski-classic-layout', layout)
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

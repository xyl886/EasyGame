import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { NumberChainConfig, NumberChainDifficulty, NumberChainMode } from '../game/numberchain/types'
import { DEFAULT_NUMBERCHAIN_CONFIG } from '../game/numberchain/types'

const CONFIG_KEY = 'easygame-numberchain-config'

const validDifficulties: NumberChainDifficulty[] = ['easy', 'normal', 'hard']
const validModes: NumberChainMode[] = ['classic', 'endless']

function loadConfig(): NumberChainConfig {
  const saved = StorageAdapter.get<Partial<NumberChainConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_NUMBERCHAIN_CONFIG, ...saved }
  if (!validDifficulties.includes(merged.difficulty)) merged.difficulty = DEFAULT_NUMBERCHAIN_CONFIG.difficulty
  if (!validModes.includes(merged.mode as NumberChainMode)) merged.mode = DEFAULT_NUMBERCHAIN_CONFIG.mode
  return merged
}

export {
  DIFFICULTY_LABELS,
  START_SIZE,
  MODE_LABELS,
  MAX_SIZE,
  ENDLESS_MAX_SIZE,
  INITIAL_REVEAL_RATIO,
  MIN_REVEAL_COUNT,
} from '../game/numberchain/types'

export const useNumberChainSettingsStore = defineStore('numberchain-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<NumberChainConfig>) {
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
      this.config = { ...DEFAULT_NUMBERCHAIN_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

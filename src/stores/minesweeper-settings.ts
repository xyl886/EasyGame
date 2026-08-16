import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { MineConfig, MineDifficulty } from '../game/minesweeper/types'
import { DEFAULT_MINE_CONFIG, DIFFICULTY_LABELS } from '../game/minesweeper/types'

const CONFIG_KEY = 'easygame-minesweeper-config'

const validDifficulties: MineDifficulty[] = ['beginner', 'intermediate', 'expert']

function loadConfig(): MineConfig {
  const saved = StorageAdapter.get<Partial<MineConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_MINE_CONFIG, ...saved }
  if (!validDifficulties.includes(merged.difficulty)) {
    merged.difficulty = DEFAULT_MINE_CONFIG.difficulty
  }
  return merged
}

export { DIFFICULTY_LABELS }

export const useMinesweeperSettingsStore = defineStore('minesweeper-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<MineConfig>) {
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
      this.config = { ...DEFAULT_MINE_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

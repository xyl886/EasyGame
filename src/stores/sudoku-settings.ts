import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { SudokuConfig, SudokuDifficulty } from '../game/sudoku/types'
import { DEFAULT_SUDOKU_CONFIG, DIFFICULTY_LABELS, SIZES } from '../game/sudoku/types'

const CONFIG_KEY = 'easygame-sudoku-config'

const validDifficulties: SudokuDifficulty[] = ['easy', 'normal', 'hard']

function loadConfig(): SudokuConfig {
  const saved = StorageAdapter.get<Partial<SudokuConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_SUDOKU_CONFIG, ...saved }
  if (!SIZES.some((s) => s.size === merged.size)) {
    merged.size = DEFAULT_SUDOKU_CONFIG.size
  }
  if (!validDifficulties.includes(merged.difficulty)) {
    merged.difficulty = DEFAULT_SUDOKU_CONFIG.difficulty
  }
  return merged
}

export { DIFFICULTY_LABELS, SIZES }

export const useSudokuSettingsStore = defineStore('sudoku-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<SudokuConfig>) {
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
      this.config = { ...DEFAULT_SUDOKU_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

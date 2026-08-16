import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { TetrisConfig } from '../game/tetris/types'
import {
  DEFAULT_CONFIG,
  SPEED_OPTIONS,
  TARGET_LINES_OPTIONS,
  PREVIEW_COUNT_OPTIONS,
  clampSpeed,
  clampTargetLines,
  clampPreviewCount,
} from '../game/tetris/types'

const CONFIG_KEY = 'easygame-tetris-config'

function loadConfig(): TetrisConfig {
  const saved = StorageAdapter.get<Partial<TetrisConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_CONFIG, ...saved }
  // 守护边界：防止旧版本保存了已废弃值
  merged.speed = clampSpeed(merged.speed)
  merged.targetLines = clampTargetLines(merged.targetLines)
  merged.previewCount = clampPreviewCount(merged.previewCount)
  if (typeof merged.hardDrop !== 'boolean') merged.hardDrop = DEFAULT_CONFIG.hardDrop
  if (typeof merged.ghostPiece !== 'boolean') merged.ghostPiece = DEFAULT_CONFIG.ghostPiece
  if (typeof merged.holdPiece !== 'boolean') merged.holdPiece = DEFAULT_CONFIG.holdPiece
  return merged
}

export {
  SPEED_OPTIONS,
  TARGET_LINES_OPTIONS,
  PREVIEW_COUNT_OPTIONS,
}

export const useTetrisSettingsStore = defineStore('tetris-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<TetrisConfig>) {
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

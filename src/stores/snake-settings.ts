import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { SnakeConfig, SpeedTier } from '../game/snake/types'
import {
  DEFAULT_CONFIG,
  SIZE_OPTIONS,
  OBSTACLE_OPTIONS,
  WIN_LENGTH_OPTIONS,
  SPEED_OPTIONS,
} from '../game/snake/types'

const CONFIG_KEY = 'easygame-snake-config'

const validDifficulties: SpeedTier[] = ['slow', 'medium', 'fast']

function loadConfig(): SnakeConfig {
  const saved = StorageAdapter.get<Partial<SnakeConfig>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_CONFIG, ...saved }
  // 守护边界：防止旧版本保存了已废弃值
  if (!SIZE_OPTIONS.includes(merged.size)) {
    merged.size = DEFAULT_CONFIG.size
  }
  if (!validDifficulties.includes(merged.speed)) {
    merged.speed = DEFAULT_CONFIG.speed
  }
  if (!OBSTACLE_OPTIONS.includes(merged.obstacleCount)) {
    merged.obstacleCount = DEFAULT_CONFIG.obstacleCount
  }
  const validWinLengths = WIN_LENGTH_OPTIONS.map((o) => o.value)
  if (!validWinLengths.includes(merged.winLength)) {
    merged.winLength = DEFAULT_CONFIG.winLength
  }
  return merged
}

export {
  SIZE_OPTIONS,
  OBSTACLE_OPTIONS,
  WIN_LENGTH_OPTIONS,
  SPEED_OPTIONS,
}

export const useSnakeSettingsStore = defineStore('snake-settings', {
  state: () => ({
    config: loadConfig(),
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<SnakeConfig>) {
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

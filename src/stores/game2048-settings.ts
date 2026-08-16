import { defineStore } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import type { Game2048Config, Difficulty, Skin } from '../game/2048/types'
import { DEFAULT_CONFIG, SKIN_OPTIONS } from '../game/2048/types'

const CONFIG_KEY = 'easygame-2048-config'

export const SIZE_OPTIONS = [4, 5, 6, 7]
export const WIN_VALUE_OPTIONS = [
  { value: 512, label: '512 · 速通' },
  { value: 1024, label: '1024 · 入门' },
  { value: 2048, label: '2048 · 经典' },
  { value: 4096, label: '4096 · 挑战' },
  { value: 8192, label: '8192 · 大师' },
  { value: 0, label: '∞ 无尽模式' },
]
export const INITIAL_TILES_OPTIONS = [2, 3, 4]
export const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string; desc: string }> = [
  { value: 'easy', label: '简单', desc: '95% 生成 2' },
  { value: 'normal', label: '普通', desc: '90% 生成 2' },
  { value: 'hard', label: '困难', desc: '75% 生成 2' },
  { value: 'nightmare', label: '噩梦', desc: '50% 生成 4' },
]
export const SKIN_OPTIONS_EXPORT = SKIN_OPTIONS

function loadConfig(): Game2048Config {
  const saved = StorageAdapter.get<Partial<Game2048Config>>(CONFIG_KEY) ?? {}
  const merged = { ...DEFAULT_CONFIG, ...saved }
  // 一致 clamp：防止旧版本保存了 3/8 等已废弃尺寸，造成 settings 显示与引擎不一致
  if (!SIZE_OPTIONS.includes(merged.size)) {
    merged.size = DEFAULT_CONFIG.size
  }
  if (!INITIAL_TILES_OPTIONS.includes(merged.initialTiles)) {
    merged.initialTiles = DEFAULT_CONFIG.initialTiles
  }
  const validDifficulties: Difficulty[] = ['easy', 'normal', 'hard', 'nightmare']
  if (!validDifficulties.includes(merged.difficulty)) {
    merged.difficulty = DEFAULT_CONFIG.difficulty
  }
  const validSkins: Skin[] = ['classic', 'cake']
  if (!validSkins.includes(merged.skin)) {
    merged.skin = DEFAULT_CONFIG.skin
  }
  return merged
}

export const useGame2048SettingsStore = defineStore('game2048-settings', {
  state: () => ({
    config: loadConfig(),
    /** 是否显示设置面板 */
    showSettings: false,
  }),

  actions: {
    setConfig(partial: Partial<Game2048Config>) {
      this.config = { ...this.config, ...partial }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },

    openSettings() {
      this.showSettings = true
    },

    closeSettings() {
      this.showSettings = false
    },

    /** 恢复默认设置 */
    resetToDefault() {
      this.config = { ...DEFAULT_CONFIG }
      StorageAdapter.set(CONFIG_KEY, this.config)
    },
  },
})

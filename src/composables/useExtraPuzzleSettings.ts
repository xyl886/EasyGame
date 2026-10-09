import { shallowReactive } from 'vue'
import { StorageAdapter } from '../adapters/StorageAdapter'

export type ExtraPuzzleSettingValue = number | string
export type ExtraPuzzleConfig = Record<string, ExtraPuzzleSettingValue>

const PREFIX = 'easygame-extra-settings'

/** 为轻量游戏提供统一的本地设置读写与默认值恢复。 */
export function useExtraPuzzleSettings<Config extends ExtraPuzzleConfig>(
  gameId: string,
  defaults: Config,
  normalize: (config: Config) => Config = (config) => config,
) {
  const key = `${PREFIX}-${gameId}`
  const saved = StorageAdapter.get<Partial<Config>>(key) ?? {}
  const state = shallowReactive({
    config: normalize({ ...defaults, ...saved } as Config),
    showSettings: false,
  })

  function setConfig(config: Partial<Config>) {
    state.config = normalize({ ...state.config, ...config })
    StorageAdapter.set(key, state.config)
  }

  return {
    state,
    setConfig,
    openSettings: () => { state.showSettings = true },
    closeSettings: () => { state.showSettings = false },
    resetToDefault: () => setConfig(defaults),
  }
}

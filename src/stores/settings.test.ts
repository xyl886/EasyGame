// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { StorageAdapter } from '../adapters/StorageAdapter'
import { useGame2048SettingsStore } from './game2048-settings'
import { useSnakeSettingsStore } from './snake-settings'
import { useTetrisSettingsStore } from './tetris-settings'
import { useSudokuSettingsStore } from './sudoku-settings'
import { useMinesweeperSettingsStore } from './minesweeper-settings'
import { useLianliankanSettingsStore } from './lianliankan-settings'
import { useEliminateSettingsStore } from './eliminate-settings'
import { useKlotskiSettingsStore } from './klotski-settings'
import { DEFAULT_CONFIG as DEFAULT_2048 } from '../game/2048/types'
import { DEFAULT_CONFIG as DEFAULT_SNAKE } from '../game/snake/types'
import { DEFAULT_CONFIG as DEFAULT_KLOTSKI } from '../game/klotski/types'

const cases = [
  { name: '2048', useStore: useGame2048SettingsStore, key: 'easygame-2048-config' },
  { name: 'snake', useStore: useSnakeSettingsStore, key: 'easygame-snake-config' },
  { name: 'tetris', useStore: useTetrisSettingsStore, key: 'easygame-tetris-config' },
  { name: 'sudoku', useStore: useSudokuSettingsStore, key: 'easygame-sudoku-config' },
  {
    name: 'minesweeper',
    useStore: useMinesweeperSettingsStore,
    key: 'easygame-minesweeper-config',
  },
  {
    name: 'lianliankan',
    useStore: useLianliankanSettingsStore,
    key: 'easygame-lianliankan-config',
  },
  { name: 'eliminate', useStore: useEliminateSettingsStore, key: 'easygame-eliminate-config' },
  { name: 'klotski', useStore: useKlotskiSettingsStore, key: 'easygame-klotski-config' },
] as const

describe.each(cases)('$name 设置 store', ({ useStore, key }) => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('默认值、开关与持久化', () => {
    const store = useStore()
    const defaults = { ...store.config }

    expect(store.showSettings).toBe(false)
    store.openSettings()
    expect(store.showSettings).toBe(true)
    store.closeSettings()
    expect(store.showSettings).toBe(false)

    store.setConfig({})
    expect(StorageAdapter.get(key)).toEqual(store.config)

    store.resetToDefault()
    expect(store.config).toEqual(defaults)
    expect(StorageAdapter.get(key)).toEqual(defaults)
  })
})

describe('设置边界守护', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('2048 会丢弃已废弃的尺寸/难度/皮肤/初始方块', () => {
    StorageAdapter.set('easygame-2048-config', {
      size: 3,
      difficulty: 'unknown',
      skin: 'unknown',
      initialTiles: 9,
    })
    setActivePinia(createPinia())
    const store = useGame2048SettingsStore()

    expect(store.config).toEqual(DEFAULT_2048)
  })

  it('贪吃蛇会丢弃非法尺寸/速度/障碍/目标长度', () => {
    StorageAdapter.set('easygame-snake-config', {
      size: 7,
      speed: 'bullet',
      obstacleCount: 99,
      winLength: 99,
    })
    setActivePinia(createPinia())
    const store = useSnakeSettingsStore()

    expect(store.config).toEqual(DEFAULT_SNAKE)
  })

  it('华容道会丢弃非法尺寸/难度，并迁移旧布局字段', () => {
    StorageAdapter.set('easygame-klotski-config', { size: 9, difficulty: 'unknown' })
    StorageAdapter.set('easygame-klotski-classic-layout', 'hengdaolima')
    setActivePinia(createPinia())
    const store = useKlotskiSettingsStore()

    expect(store.config).toEqual(DEFAULT_KLOTSKI)
    expect(store.classicLayout).toBe('横刀立马')

    store.setClassicLayout('横刀立马2')
    expect(store.classicLayout).toBe('横刀立马2')
    expect(StorageAdapter.get('easygame-klotski-classic-layout')).toBe('横刀立马2')
  })
})

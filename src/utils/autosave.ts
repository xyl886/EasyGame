/**
 * 游戏自动存档工具
 *
 * 用途：玩家误触返回 / 切后台 / 刷新导致离开游戏页时，自动保存当前局面，
 * 返回页面后可一键继续上次进度（配合各游戏引擎的 loadState 使用）。
 *
 * 存储：经 StorageAdapter 写 localStorage，key 按游戏独立（easygame-autosave-{gameId}）。
 */
import { StorageAdapter } from '../adapters/StorageAdapter'

const PREFIX = 'easygame-autosave'

export function autosaveKey(gameId: string): string {
  return `${PREFIX}-${gameId}`
}

export function saveAutosave(gameId: string, state: unknown): void {
  StorageAdapter.set(autosaveKey(gameId), state)
}

export function loadAutosave<T>(gameId: string): T | null {
  return StorageAdapter.get<T>(autosaveKey(gameId))
}

export function clearAutosave(gameId: string): void {
  StorageAdapter.remove(autosaveKey(gameId))
}

/**
 * 节流保存器：tick 型游戏（贪吃蛇/俄罗斯方块）每帧都写 localStorage 太频繁，
 * 用最小间隔合并写入；页面隐藏/离开/卸载时调用 flush() 立即落盘。
 */
export function throttledSaver(fn: () => void, minInterval = 800) {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const run = () => {
    timer = null
    last = Date.now()
    fn()
  }

  return {
    /** 节流触发：间隔内只排一次写入 */
    save() {
      const now = Date.now()
      if (now - last >= minInterval) run()
      else if (!timer) timer = setTimeout(run, minInterval - (now - last))
    },
    /** 立即写入（隐藏/离开/卸载时兜底） */
    flush() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      run()
    },
    dispose() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageAdapter, setStorageErrorHandler } from './StorageAdapter'

describe('StorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageErrorHandler(() => {})
  })

  it('set / get / remove 往返', () => {
    StorageAdapter.set('k', { a: 1 })
    expect(StorageAdapter.get<{ a: number }>('k')).toEqual({ a: 1 })
    StorageAdapter.remove('k')
    expect(StorageAdapter.get('k')).toBeNull()
  })

  it('损坏 JSON 返回 null', () => {
    localStorage.setItem('bad', '{not-json')
    expect(StorageAdapter.get('bad')).toBeNull()
  })

  it('写入失败时调用 errorHandler', () => {
    const handler = vi.fn()
    setStorageErrorHandler(handler)
    const spy = vi.spyOn(StorageAdapter, 'set').mockImplementation(function (
      this: typeof StorageAdapter,
      key: string,
    ) {
      // 直接走失败路径
      try {
        throw new DOMException('QuotaExceededError')
      } catch (err) {
        console.warn('[StorageAdapter] set failed:', key, err)
        handler('⚠️ 本地存储写入失败，进度/设置可能无法保存')
      }
    })
    StorageAdapter.set('x', 1)
    expect(handler).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})

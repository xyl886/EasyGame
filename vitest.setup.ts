// Node 环境下的 localStorage 桩：引擎/适配器单测用
const store = new Map<string, string>()

const localStorageShim: Storage = {
  getItem(key: string) {
    return store.has(key) ? store.get(key)! : null
  },
  setItem(key: string, value: string) {
    store.set(key, String(value))
  },
  removeItem(key: string) {
    store.delete(key)
  },
  clear() {
    store.clear()
  },
  key(index: number) {
    return [...store.keys()][index] ?? null
  },
  get length() {
    return store.size
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageShim,
  writable: true,
  configurable: true,
})

// jsdom 缺少的浏览器 API 桩：组件测试只关心逻辑，不关心真实布局/媒体查询
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  }

  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserverStub })
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  if (!window.scrollTo) {
    window.scrollTo = (() => {}) as typeof window.scrollTo
  }
}

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useEscapeKey } from './useEscapeKey'

function mountHarness(initialOpen = false) {
  const state = { open: ref(initialOpen), onClose: vi.fn() }

  const Harness = defineComponent({
    setup() {
      useEscapeKey(
        () => state.open.value,
        () => state.onClose(),
      )
      return () => h('div', 'harness')
    },
  })

  const wrapper = mount(Harness)
  return { wrapper, state }
}

describe('useEscapeKey', () => {
  it('打开时按 Esc 触发关闭，其他键不触发', () => {
    const { state } = mountHarness(true)
    state.open.value = true

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(state.onClose).not.toHaveBeenCalled()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(state.onClose).toHaveBeenCalledTimes(1)
  })

  it('关闭状态下不响应 Esc', () => {
    const { state } = mountHarness(false)
    state.open.value = false

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(state.onClose).not.toHaveBeenCalled()
  })

  it('组件卸载后移除监听', () => {
    const { wrapper, state } = mountHarness(true)
    state.open.value = true

    wrapper.unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(state.onClose).not.toHaveBeenCalled()
  })
})

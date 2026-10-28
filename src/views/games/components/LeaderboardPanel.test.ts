// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import LeaderboardPanel from './LeaderboardPanel.vue'
import { useLeaderboardStore } from '../../../stores/leaderboard'
import type { LeaderboardDimension } from '../../../game/base/leaderboard'

const dimensions: LeaderboardDimension[] = [
  {
    key: 'difficulty',
    label: '难度',
    values: [{ value: 'normal', label: '普通' }],
  },
  {
    key: 'size',
    label: '尺寸',
    values: [
      { value: 4, label: '4×4' },
      { value: 5, label: '5×5' },
    ],
  },
]

function mountPanel() {
  return mount(LeaderboardPanel, {
    props: {
      modelValue: true,
      gameId: '2048',
      gameName: '2048',
      dimensions,
      sizeSuffix: '×',
    },
  })
}

describe('LeaderboardPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('移动端以底部抽屉呈现，并带 dialog 语义', () => {
    const wrapper = mountPanel()
    const overlay = wrapper.find('.eg-modal-overlay')

    expect(overlay.exists()).toBe(true)
    expect(overlay.classes()).toContain('eg-sheet')

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('2048 · 最高分榜')
  })

  it('尺寸用维度标签展示（5×5 而不是 5×）', () => {
    const store = useLeaderboardStore('2048')
    store.addEntry({ score: 100, size: 5, difficulty: 'normal', won: true })

    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('5×5')
    expect(wrapper.text()).toContain('通关')
  })

  it('筛选 chip 使用 44px 触控高度', () => {
    const wrapper = mountPanel()
    const chips = wrapper.findAll('.eg-opt')

    expect(chips.length).toBeGreaterThan(0)
    for (const chip of chips) {
      expect(chip.classes()).toContain('!min-h-11')
    }
  })

  it('按 Esc、点遮罩、点关闭按钮都会关闭并通知父组件', async () => {
    const wrapper = mountPanel()
    const overlay = wrapper.find('.eg-modal-overlay')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])

    await overlay.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(2)

    await wrapper.find('[aria-label="关闭排行榜"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(3)
  })
})

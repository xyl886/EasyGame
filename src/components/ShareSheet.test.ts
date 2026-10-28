// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ShareSheet from './ShareSheet.vue'
import type { ShareCardData } from '../utils/shareCard'

const renderShareCard = vi.fn(async () => new Blob(['fake-png'], { type: 'image/png' }))
const downloadBlob = vi.fn()

vi.mock('../utils/shareCard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/shareCard')>()
  return {
    ...actual,
    renderShareCard: () => renderShareCard(),
    downloadBlob: (...args: unknown[]) => downloadBlob(...args),
  }
})

const toast = vi.fn()
vi.mock('../utils/toast', () => ({ toast: (...args: unknown[]) => toast(...args) }))

const card: ShareCardData = {
  gameId: '2048',
  gameName: '2048',
  title: '2048 分',
  subtitle: '4×4 · 普通',
  stats: [{ label: '最高分', value: '4096' }],
  route: '/game/2048',
}

function mountSheet() {
  return mount(ShareSheet, {
    props: { modelValue: true, card },
    attachTo: document.body,
  })
}

describe('ShareSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-card'),
      revokeObjectURL: vi.fn(),
    })
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => undefined) },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('打开后生成成绩卡并展示操作按钮', async () => {
    const wrapper = mountSheet()
    await nextTick()
    await vi.waitFor(() => expect(renderShareCard).toHaveBeenCalled())

    expect(wrapper.find('[data-testid="share-sheet"]').exists()).toBe(true)
    expect(wrapper.find('img[alt="成绩分享卡片"]').attributes('src')).toBe('blob:mock-card')
    expect(wrapper.text()).toContain('保存图片')
    expect(wrapper.text()).toContain('复制文案')
    expect(wrapper.text()).toContain('复制链接')
    expect(wrapper.text()).toContain('长按图片保存')
  })

  it('Esc 关闭并通知父组件', async () => {
    const wrapper = mountSheet()
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('复制文案会写入带成绩与链接的文本', async () => {
    const wrapper = mountSheet()
    await nextTick()
    await vi.waitFor(() => expect(renderShareCard).toHaveBeenCalled())

    const copyBtn = wrapper.findAll('button').find((btn) => btn.text().includes('复制文案'))
    await copyBtn?.trigger('click')
    await nextTick()

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('EasyGame 的2048'),
    )
  })

  it('保存图片会下载 PNG', async () => {
    const wrapper = mountSheet()
    await nextTick()
    await vi.waitFor(() => expect(renderShareCard).toHaveBeenCalled())

    const saveBtn = wrapper.findAll('button').find((btn) => btn.text().includes('保存图片'))
    await saveBtn?.trigger('click')
    expect(downloadBlob).toHaveBeenCalled()
  })
})

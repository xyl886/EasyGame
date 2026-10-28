// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Connect4Board from './Connect4Board.vue'
import type { Connect4State } from '../../game/connect4/types'
import { createInitialState } from '../../game/connect4/GameEngine'

const always = () => true

function baseState(overrides: Partial<Connect4State> = {}): Connect4State {
  return { ...createInitialState(), ...overrides }
}

describe('Connect4Board', () => {
  it('渲染 7 列 × 6 行，点击列发出 select 事件', async () => {
    const wrapper = mount(Connect4Board, {
      props: { state: baseState(), canSelect: always },
    })
    const columns = wrapper.findAll('.c4-col')
    expect(columns).toHaveLength(7)
    expect(wrapper.findAll('.c4-slot')).toHaveLength(42)

    await columns[3].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([3])
  })

  it('不可落子时按钮禁用且不显示悬停预览', async () => {
    const wrapper = mount(Connect4Board, {
      props: { state: baseState(), canSelect: () => false },
    })
    expect(wrapper.find('.c4-col').attributes('disabled')).toBeDefined()

    await wrapper.find('.c4-col').trigger('mouseenter')
    expect(wrapper.find('.c4-ghost').exists()).toBe(false)
  })

  it('悬停可落子列时，在最底部空格显示当前玩家颜色的预览', async () => {
    const wrapper = mount(Connect4Board, {
      props: { state: baseState(), canSelect: always },
    })
    const firstColumn = wrapper.findAll('.c4-col')[0]
    await firstColumn.trigger('mouseenter')

    const ghost = wrapper.find('.c4-ghost')
    expect(ghost.exists()).toBe(true)
    expect(ghost.classes()).toContain('c4-ghost--red')
    // 空棋盘：预览落在该列最后一行
    const slots = firstColumn.findAll('.c4-slot')
    expect(slots[5].find('.c4-ghost').exists()).toBe(true)
  })

  it('最后一手用中心点标记，获胜四子有胜利样式', () => {
    const board = createInitialState().board.slice()
    for (const index of [35, 36, 37, 38]) board[index] = 'red'
    const wrapper = mount(Connect4Board, {
      props: {
        state: baseState({
          board,
          current: 'yellow',
          lastMove: 38,
          winningLine: [35, 36, 37, 38],
          moves: 4,
          over: true,
          winner: 'red',
        }),
        canSelect: () => false,
      },
    })

    expect(wrapper.findAll('.c4-disc--last')).toHaveLength(1)
    expect(wrapper.findAll('.c4-disc--win')).toHaveLength(4)
    expect(wrapper.find('.c4-board--over').exists()).toBe(true)
    // 胜利显示器依次延迟
    expect(wrapper.findAll('.c4-disc--win').map((disc) => disc.attributes('style'))).toEqual([
      expect.stringContaining('--win-delay: 0ms'),
      expect.stringContaining('--win-delay: 90ms'),
      expect.stringContaining('--win-delay: 180ms'),
      expect.stringContaining('--win-delay: 270ms'),
    ])
  })
})

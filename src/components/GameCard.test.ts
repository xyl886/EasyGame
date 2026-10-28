// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import GameCard from './GameCard.vue'
import type { LobbyGame } from '../stores/game'

const game: LobbyGame = {
  id: '2048',
  name: '2048',
  description: '合并相同数字，挑战合成 2048！',
  glyph: '2048',
  route: '/game/2048',
}

async function mountCard(index = 0) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/game/2048', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  return mount(GameCard, {
    props: { game, index },
    global: { plugins: [router] },
  })
}

describe('GameCard', () => {
  it('渲染链接、名称、描述与字形', async () => {
    const wrapper = await mountCard()

    expect(wrapper.attributes('href')).toContain('/game/2048')
    expect(wrapper.text()).toContain('2048')
    expect(wrapper.text()).toContain(game.description)
    expect(wrapper.find('.font-display').text()).toBe('2048')
  })

  it('按序号循环三档暖色封面', async () => {
    const first = await mountCard(0)
    const second = await mountCard(1)
    const third = await mountCard(2)

    const coverClass = (wrapper: Awaited<ReturnType<typeof mountCard>>) =>
      wrapper.find('.h-16').classes().join(' ')

    expect(coverClass(first)).toContain('bg-sand-light')
    expect(coverClass(second)).toContain('bg-accent-soft-light')
    expect(coverClass(third)).toContain('bg-bg-light')
    expect(coverClass(first)).not.toBe(coverClass(second))
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import Home from './Home.vue'
import { gameRegistry } from '../game/registry'

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      ...gameRegistry.map((g) => ({ path: g.route, component: { template: '<div />' } })),
      { path: '/multiplayer/gomoku', component: { template: '<div />' } },
      { path: '/multiplayer/connect4', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()

  return mount(Home, {
    global: {
      plugins: [router, createPinia()],
      stubs: {
        OnlinePanel: true,
        ThemeToggle: true,
        SoundToggle: true,
      },
    },
  })
}

describe('Home（大厅）', () => {
  it('只展示 8 款大厅游戏，不包含隐藏关卡三国华容道', async () => {
    const wrapper = await mountHome()

    const cards = wrapper.findAll('a[href*="/game/"]')
    expect(cards).toHaveLength(8)
    expect(wrapper.text()).toContain('共 8 款')
    expect(wrapper.text()).not.toContain('三国华容道')
  })

  it('展示已上线名单与 meta 信息', async () => {
    const wrapper = await mountHome()
    const text = wrapper.text()

    expect(text).toContain('已上线：')
    for (const name of [
      '2048',
      '俄罗斯方块',
      '扫雷',
      '数独',
      '贪吃蛇',
      '华容道',
      '连连看',
      '消消乐',
    ]) {
      expect(text).toContain(name)
    }
    expect(text).toContain('8 款游戏')
    expect(text).toContain('离线可玩')
    expect(text).toContain('无需账号')
    expect(text).toContain('联机对战')
    expect(text).toContain('五子棋')
    expect(text).toContain('四子棋')
    expect(text).toContain('我的段位')
  })
})

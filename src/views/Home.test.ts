// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import Home from './Home.vue'
import { gameRegistry } from '../game/registry'
import type { PublicRoomInfo } from '../net/roomDirectory'

const directoryMock = vi.hoisted(() => ({
  rooms: [] as Array<{
    code: string
    gameId: 'gomoku' | 'connect4'
    status: 'waiting' | 'playing'
    players: number
    createdAt: number
    updatedAt: number
  }>,
  status: 'connected' as 'connected' | 'error' | 'connecting',
  close: vi.fn(),
}))

vi.mock('../net/roomDirectory', () => ({
  openRoomDirectory: async (events: {
    onRooms: (rooms: unknown[]) => void
    onStatus: (status: string) => void
  }) => {
    events.onStatus(directoryMock.status)
    events.onRooms(directoryMock.rooms)
    return { close: directoryMock.close }
  },
}))

const gomokuRoom: PublicRoomInfo = {
  code: 'ABCD23',
  gameId: 'gomoku',
  status: 'waiting',
  players: 1,
  createdAt: 1_000,
  updatedAt: 2_000,
}

const connect4Room: PublicRoomInfo = {
  code: 'WXYZ45',
  gameId: 'connect4',
  status: 'playing',
  players: 2,
  createdAt: 1_000,
  updatedAt: 2_000,
}

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

  const wrapper = mount(Home, {
    global: {
      plugins: [router, createPinia()],
      stubs: {
        OnlinePanel: true,
        ThemeToggle: true,
        SoundToggle: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  localStorage.clear()
  directoryMock.rooms = []
  directoryMock.status = 'connected'
  directoryMock.close.mockClear()
})

describe('Home（大厅）', () => {
  it('只展示 8 款大厅游戏，不包含隐藏关卡三国华容道', async () => {
    const wrapper = await mountHome()

    const cards = wrapper.findAll('#lobby a[href*="/game/"]')
    expect(cards).toHaveLength(8)
    expect(wrapper.text()).toContain('共 8 款')
    expect(wrapper.text()).not.toContain('三国华容道')
  })

  it('Hero 精简，公开房间默认显示空状态', async () => {
    const wrapper = await mountHome()
    const text = wrapper.text()

    expect(text).toContain('经典益智')
    expect(text).toContain('无需下载')
    expect(text).not.toContain('已上线：')
    expect(text).not.toContain('随机开一局')

    expect(text).toContain('公开房间')
    expect(text).toContain('暂无公开房间')
    expect(text).toContain('联机对战')
    expect(text).toContain('五子棋')
    expect(text).toContain('四子棋')
  })

  it('展示目录里的公开房间，并按状态给出申请/观战入口', async () => {
    directoryMock.rooms = [gomokuRoom, connect4Room]
    const wrapper = await mountHome()

    const cards = wrapper.findAll('[data-testid="public-room"]')
    expect(cards).toHaveLength(2)

    const text = wrapper.text()
    expect(text).toContain('ABCD23')
    expect(text).toContain('WXYZ45')
    expect(text).toContain('等待对手')
    expect(text).toContain('对局中')

    const apply = wrapper.find('a[href*="/multiplayer/gomoku?room=ABCD23&request=1"]')
    expect(apply.exists()).toBe(true)
    expect(apply.text()).toContain('申请加入')

    const watch = wrapper.find('a[href*="/multiplayer/connect4?room=WXYZ45"]')
    expect(watch.exists()).toBe(true)
    expect(watch.text()).toContain('观战')
  })

  it('目录不可用时显示兜底入口', async () => {
    directoryMock.status = 'error'
    const wrapper = await mountHome()
    expect(wrapper.text()).toContain('房间服务暂时不可用')
    expect(wrapper.text()).toContain('重试')
  })
})

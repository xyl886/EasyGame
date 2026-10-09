import { describe, expect, it } from 'vitest'
import { gameRegistry, lobbyGames } from './registry'

describe('游戏注册表', () => {
  it('为全部游戏提供唯一 id、路径、路由名和懒加载组件', () => {
    expect(gameRegistry).toHaveLength(16)
    expect(new Set(gameRegistry.map((game) => game.id)).size).toBe(gameRegistry.length)
    expect(new Set(gameRegistry.map((game) => game.route)).size).toBe(gameRegistry.length)
    expect(new Set(gameRegistry.map((game) => game.routeName)).size).toBe(gameRegistry.length)

    for (const game of gameRegistry) {
      expect(game.route).toMatch(/^\/game\//)
      expect(game.component).toBeTypeOf('function')
    }
  })

  it('大厅展示 15 款游戏，经典华容道仍保留独立路由', () => {
    expect(lobbyGames).toHaveLength(15)
    expect(lobbyGames.every((game) => game.inLobby)).toBe(true)
    expect(gameRegistry.find((game) => game.id === 'klotski-classic')?.inLobby).toBe(false)
  })
})

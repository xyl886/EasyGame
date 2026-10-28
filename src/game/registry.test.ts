import { describe, expect, it } from 'vitest'
import { gameRegistry } from './registry'

describe('游戏注册表', () => {
  it('为全部游戏提供唯一 id、路径、路由名和懒加载组件', () => {
    expect(gameRegistry).toHaveLength(9)
    expect(new Set(gameRegistry.map((game) => game.id)).size).toBe(gameRegistry.length)
    expect(new Set(gameRegistry.map((game) => game.route)).size).toBe(gameRegistry.length)
    expect(new Set(gameRegistry.map((game) => game.routeName)).size).toBe(gameRegistry.length)

    for (const game of gameRegistry) {
      expect(game.route).toBe(`/game/${game.id}`)
      const pascal = game.id
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
      expect(game.routeName).toBe(`Game${pascal}`)
      expect(game.component).toBeTypeOf('function')
    }
  })

  it('大厅展示 8 款经典游戏，三国华容道保留独立隐藏路由', () => {
    const lobby = gameRegistry.filter((game) => !game.hidden)
    expect(lobby.map((game) => game.id)).toEqual([
      '2048',
      'tetris',
      'minesweeper',
      'sudoku',
      'snake',
      'klotski',
      'lianliankan',
      'eliminate',
    ])
    expect(gameRegistry.find((game) => game.id === 'klotski-classic')?.hidden).toBe(true)
  })
})

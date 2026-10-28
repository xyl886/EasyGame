import { defineStore } from 'pinia'
import { gameRegistry, type LobbyGame } from '../game/registry'

export type { GameMeta, LobbyGame } from '../game/registry'

/** 大厅游戏列表：从注册表派生，保持只读语义（不在此处修改游戏元数据）。 */
export const useGameStore = defineStore('game', {
  state: () => ({
    games: gameRegistry
      .filter((game) => !game.hidden)
      .map((game): LobbyGame => ({
        id: game.id,
        name: game.name,
        description: game.description,
        glyph: game.glyph,
        route: game.route,
      })),
  }),
})

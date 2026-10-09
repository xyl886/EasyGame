import { defineStore } from 'pinia'
import { lobbyGames, type GameMeta } from '../game/registry'

export type { GameMeta } from '../game/registry'

export const useGameStore = defineStore('game', {
  state: () => ({
    games: lobbyGames.map((game) => ({ ...game })) as GameMeta[],
  }),
})

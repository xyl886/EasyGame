import type { RouteComponent, RouteRecordSingleView } from 'vue-router'

export type GameCategory = 'puzzle' | 'casual' | 'match' | 'board'

export interface GameMeta {
  id: string
  name: string
  description: string
  icon: string
  accent: string
  route: string
  category: GameCategory
  status: 'available' | 'coming-soon'
  inLobby: boolean
}

export interface GameRegistryEntry extends GameMeta {
  routeName: string
  component: RouteRecordSingleView['component']
}

function lazyView(loader: () => Promise<{ default: RouteComponent }>): RouteRecordSingleView['component'] {
  return async () => (await loader()).default
}

/** 大厅元数据和游戏路由共用同一份注册表。 */
export const gameRegistry: GameRegistryEntry[] = [
  {
    id: '2048', name: '2048', description: '合并相同数字，挑战合成 2048！', icon: '🎯',
    accent: 'from-amber-400 to-orange-500', route: '/game/2048', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'Game2048', component: lazyView(() => import('../views/games/Game2048.vue')),
  },
  {
    id: 'tetris', name: '俄罗斯方块', description: '经典消除游戏，7 种方块与 SRS 旋转。', icon: '🧱',
    accent: 'from-cyan-400 to-blue-500', route: '/game/tetris', category: 'match', status: 'available',
    inLobby: true, routeName: 'GameTetris', component: lazyView(() => import('../views/games/GameTetris.vue')),
  },
  {
    id: 'minesweeper', name: '扫雷', description: '经典益智游戏，点击翻格避开所有地雷。', icon: '💣',
    accent: 'from-gray-500 to-gray-700', route: '/game/minesweeper', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameMinesweeper', component: lazyView(() => import('../views/games/GameMinesweeper.vue')),
  },
  {
    id: 'sudoku', name: '数独', description: '9×9 数字挑战，每行每列每宫不重复。', icon: '🔢',
    accent: 'from-emerald-400 to-green-600', route: '/game/sudoku', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameSudoku', component: lazyView(() => import('../views/games/GameSudoku.vue')),
  },
  {
    id: 'snake', name: '贪吃蛇', description: '经典像素风，包含多种速度与棋盘设置。', icon: '🐍',
    accent: 'from-lime-400 to-green-500', route: '/game/snake', category: 'casual', status: 'available',
    inLobby: true, routeName: 'GameSnake', component: lazyView(() => import('../views/games/GameSnake.vue')),
  },
  {
    id: 'klotski', name: '华容道', description: '数字滑块挑战，把数字按顺序排好。', icon: '🧩',
    accent: 'from-rose-400 to-pink-600', route: '/game/klotski', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameKlotski', component: lazyView(() => import('../views/games/GameKlotski.vue')),
  },
  {
    id: 'lianliankan', name: '连连看', description: '相同图案最多拐两弯即可配对消除。', icon: '🔗',
    accent: 'from-indigo-400 to-violet-600', route: '/game/lianliankan', category: 'match', status: 'available',
    inLobby: true, routeName: 'GameLianliankan', component: lazyView(() => import('../views/games/GameLianliankan.vue')),
  },
  {
    id: 'eliminate', name: '消消乐', description: '交换相邻图案，三连及以上即可消除。', icon: '✨',
    accent: 'from-pink-400 to-rose-600', route: '/game/eliminate', category: 'match', status: 'available',
    inLobby: true, routeName: 'GameEliminate', component: lazyView(() => import('../views/games/GameEliminate.vue')),
  },
  {
    id: 'numberchain', name: '数字连连', description: '从 1 按顺序连到最大数，挑战最快纪录。', icon: '🔢',
    accent: 'from-sky-400 to-cyan-600', route: '/game/numberchain', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameNumberChain', component: lazyView(() => import('../views/games/GameNumberChain.vue')),
  },
  {
    id: 'klotski-classic', name: '三国华容道', description: '移动棋子，为曹操开辟出口。', icon: '🏮',
    accent: 'from-red-400 to-rose-700', route: '/game/klotski-classic', category: 'puzzle', status: 'available',
    inLobby: false, routeName: 'GameKlotskiClassic', component: lazyView(() => import('../views/games/GameKlotskiClassic.vue')),
  },
  {
    id: 'memory-match', name: '记忆翻牌', description: '翻开卡片，记住位置并找出所有配对。', icon: '🧠',
    accent: 'from-amber-400 to-orange-500', route: '/game/memory-match', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameMemoryMatch', component: lazyView(() => import('../views/games/GameMemoryMatch.vue')),
  },
  {
    id: 'lights-out', name: '点灯谜题', description: '每次点击会翻转这一格及相邻灯光。', icon: '💡',
    accent: 'from-yellow-400 to-amber-600', route: '/game/lights-out', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameLightsOut', component: lazyView(() => import('../views/games/GameLightsOut.vue')),
  },
  {
    id: 'one-stroke', name: '一笔画', description: '每条线只走一次，一笔完成整幅图形。', icon: '✍️',
    accent: 'from-rose-400 to-pink-600', route: '/game/one-stroke', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameOneStroke', component: lazyView(() => import('../views/games/GameOneStroke.vue')),
  },
  {
    id: 'sokoban', name: '推箱子', description: '把箱子推到目标位置，完成三道关卡。', icon: '📦',
    accent: 'from-orange-400 to-amber-600', route: '/game/sokoban', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameSokoban', component: lazyView(() => import('../views/games/GameSokoban.vue')),
  },
  {
    id: 'nonogram', name: '数织', description: '根据行列数字涂格，还原隐藏图案。', icon: '🧩',
    accent: 'from-violet-400 to-indigo-600', route: '/game/nonogram', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameNonogram', component: lazyView(() => import('../views/games/GameNonogram.vue')),
  },
  {
    id: 'hashi', name: '桥接谜题', description: '按岛屿数字架桥，让所有岛屿连通。', icon: '🌉',
    accent: 'from-teal-400 to-cyan-600', route: '/game/hashi', category: 'puzzle', status: 'available',
    inLobby: true, routeName: 'GameHashi', component: lazyView(() => import('../views/games/GameHashi.vue')),
  },
]

export const lobbyGames: GameMeta[] = gameRegistry
  .filter((game) => game.inLobby)
  .map((game) => ({
    id: game.id,
    name: game.name,
    description: game.description,
    icon: game.icon,
    accent: game.accent,
    route: game.route,
    category: game.category,
    status: game.status,
    inLobby: game.inLobby,
  }))

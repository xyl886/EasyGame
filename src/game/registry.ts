import type { RouteComponent, RouteRecordSingleView } from 'vue-router'

/** 游戏元数据：大厅卡片与路由共用这一份数据源。 */
export interface GameMeta {
  id: string
  name: string
  description: string
  glyph: string
  /** 不进大厅、但有独立路由的隐藏游戏（如三国华容道） */
  hidden?: boolean
}

export interface GameRegistryEntry extends GameMeta {
  route: string
  routeName: string
  component: RouteRecordSingleView['component']
}

/** 大厅卡片只需要展示字段与跳转路径。 */
export type LobbyGame = GameMeta & { route: string }

type GameDefinition = GameMeta & { view: () => Promise<{ default: RouteComponent }> }

function lazyView(
  loader: () => Promise<{ default: RouteComponent }>,
): RouteRecordSingleView['component'] {
  return async () => (await loader()).default
}

/** id → 路由名：2048 → Game2048，lianliankan → GameLianliankan */
function routeNameOf(id: string): string {
  const pascal = id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `Game${pascal}`
}

/**
 * 游戏注册表（唯一数据源）。
 * 新增一款游戏：在 `game/{id}/` 实现引擎、在 `views/games/` 加视图，然后只在这里追加一条。
 * 路由路径与路由名由 id 派生，不用手写。
 */
const gameDefinitions: GameDefinition[] = [
  {
    id: '2048',
    name: '2048',
    description: '合并相同数字，挑战合成 2048！',
    glyph: '2048',
    view: () => import('../views/games/Game2048.vue'),
  },
  {
    id: 'tetris',
    name: '俄罗斯方块',
    description: '经典消除游戏，7 种方块与 SRS 旋转。',
    glyph: '方',
    view: () => import('../views/games/GameTetris.vue'),
  },
  {
    id: 'minesweeper',
    name: '扫雷',
    description: '经典益智游戏，点击翻格避开所有地雷。',
    glyph: '雷',
    view: () => import('../views/games/GameMinesweeper.vue'),
  },
  {
    id: 'sudoku',
    name: '数独',
    description: '9×9 数字挑战，每行每列每宫不重复。',
    glyph: '数',
    view: () => import('../views/games/GameSudoku.vue'),
  },
  {
    id: 'snake',
    name: '贪吃蛇',
    description: '经典像素风，包含多种速度与棋盘设置。',
    glyph: '蛇',
    view: () => import('../views/games/GameSnake.vue'),
  },
  {
    id: 'klotski',
    name: '华容道',
    description: '数字滑块挑战，把数字按顺序排好。',
    glyph: '华',
    view: () => import('../views/games/GameKlotski.vue'),
  },
  {
    id: 'lianliankan',
    name: '连连看',
    description: '相同图案最多拐两弯即可配对消除。',
    glyph: '连',
    view: () => import('../views/games/GameLianliankan.vue'),
  },
  {
    id: 'eliminate',
    name: '消消乐',
    description: '交换相邻图案，三连及以上即可消除。',
    glyph: '消',
    view: () => import('../views/games/GameEliminate.vue'),
  },
  {
    id: 'klotski-classic',
    name: '三国华容道',
    description: '移动棋子，为曹操开辟出口。',
    glyph: '曹',
    hidden: true,
    view: () => import('../views/games/GameKlotskiClassic.vue'),
  },
]

export const gameRegistry: GameRegistryEntry[] = gameDefinitions.map(({ view, ...meta }) => ({
  ...meta,
  route: `/game/${meta.id}`,
  routeName: routeNameOf(meta.id),
  component: lazyView(view),
}))

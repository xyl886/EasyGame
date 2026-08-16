import { defineStore } from 'pinia'

export interface GameMeta {
  id: string
  name: string
  description: string
  icon: string
  accent: string
  route: string
  status: 'available' | 'coming-soon'
}

export const useGameStore = defineStore('game', {
  state: () => ({
    games: [
      {
        id: '2048',
        name: '2048',
        description: '合并相同数字，挑战合成 2048！',
        icon: '🎯',
        accent: 'from-amber-400 to-orange-500',
        route: '/game/2048',
        status: 'available',
      },
      {
        id: 'tetris',
        name: '俄罗斯方块',
        description: '经典消除游戏，7 种 Tetromino + Bag-7 随机 + SRS 旋转 + Hold/鬼影预览',
        icon: '🧱',
        accent: 'from-cyan-400 to-blue-500',
        route: '/game/tetris',
        status: 'available',
      },
      {
        id: 'minesweeper',
        name: '扫雷',
        description: '经典益智游戏，敬请期待',
        icon: '💣',
        accent: 'from-gray-500 to-gray-700',
        route: '#',
        status: 'coming-soon',
      },
      {
        id: 'sudoku',
        name: '数独',
        description: '9x9 数字挑战，每行每列每宫不重复',
        icon: '🔢',
        accent: 'from-emerald-400 to-green-600',
        route: '/game/sudoku',
        status: 'available',
      },
      {
        id: 'snake',
        name: '贪吃蛇',
        description: '怀旧像素风，速度档位/穿墙/障碍/多食物四变体',
        icon: '🐍',
        accent: 'from-lime-400 to-green-500',
        route: '/game/snake',
        status: 'available',
      },
      {
        id: 'klotski',
        name: '华容道',
        description: '数字滑块挑战，把数字按顺序排好',
        icon: '🧩',
        accent: 'from-rose-400 to-pink-600',
        route: '/game/klotski',
        status: 'available',
      },
    ] as GameMeta[],
  }),
})

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
        description: '经典益智游戏，点击翻格避开所有地雷',
        icon: '💣',
        accent: 'from-gray-500 to-gray-700',
        route: '/game/minesweeper',
        status: 'available',
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
      {
        id: 'lianliankan',
        name: '连连看',
        description: '经典消除配对，最多拐两弯相连即可消除',
        icon: '🔗',
        accent: 'from-indigo-400 to-violet-600',
        route: '/game/lianliankan',
        status: 'available',
      },
      {
        id: 'eliminate',
        name: '消消乐',
        description: '交换相邻图案，三连及以上消除，挑战高分',
        icon: '✨',
        accent: 'from-pink-400 to-rose-600',
        route: '/game/eliminate',
        status: 'available',
      },
      {
        id: 'numberchain',
        name: '数字连连',
        description: '从 ① 按顺序连到最大数，眼疾手快冲纪录',
        icon: '🔢',
        accent: 'from-sky-400 to-cyan-600',
        route: '/game/numberchain',
        status: 'available',
      },
    ] as GameMeta[],
  }),
})

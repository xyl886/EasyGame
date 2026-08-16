import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: 'EasyGame · 游戏大厅' },
  },
  {
    path: '/game/2048',
    name: 'Game2048',
    component: () => import('../views/games/Game2048.vue'),
    meta: { title: '2048 · EasyGame' },
  },
  {
    path: '/game/snake',
    name: 'GameSnake',
    component: () => import('../views/games/GameSnake.vue'),
    meta: { title: '贪吃蛇 · EasyGame' },
  },
  {
    path: '/game/tetris',
    name: 'GameTetris',
    component: () => import('../views/games/GameTetris.vue'),
    meta: { title: '俄罗斯方块 · EasyGame' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
})

export default router

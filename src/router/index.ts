import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { gameRegistry } from '../game/registry'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: 'EasyGame · 游戏大厅' },
  },
  ...gameRegistry.map((game) => ({
    path: game.route,
    name: game.routeName,
    component: game.component,
    meta: { title: `${game.name} · EasyGame` },
  })),
  {
    path: '/multiplayer/gomoku',
    name: 'MultiplayerGomoku',
    component: () => import('../views/multiplayer/MultiplayerGomoku.vue'),
    meta: { title: '五子棋联机 · EasyGame' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '404 · EasyGame' },
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

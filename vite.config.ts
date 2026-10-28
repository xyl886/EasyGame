import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/peerjs') ? 'peerjs' : undefined),
      },
    },
  },
  plugins: [
    vue(),
    VitePWA({
      workbox: {
        // peerjs 仅联机时按需加载，不进入离线预缓存
        globIgnores: ['assets/peerjs-*'],
      },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'EasyGame · 益智小游戏集合',
        short_name: 'EasyGame',
        description:
          '轻量级经典益智小游戏集合：2048、俄罗斯方块、扫雷、数独、贪吃蛇、华容道、连连看、消消乐，另含三国华容道，即开即玩、离线可用。',
        theme_color: '#F7F3EE',
        background_color: '#F7F3EE',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        lang: 'zh-CN',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})

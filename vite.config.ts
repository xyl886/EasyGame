import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import os from 'os'

// 获取本机局域网 IPv4 地址
function getLocalIPv4(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue
    for (const alias of iface) {
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address
      }
    }
  }
  return '127.0.0.1'
}

const localIP = getLocalIPv4()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  define: {
    __LOCAL_IP__: JSON.stringify(localIP),
    __SERVER_PORT__: 5173,
  },
})

# 🎮 EasyGame

**轻量级益智小游戏集合** —— 即开即玩、无需安装、全家同乐。

基于 Vue 3 + Vite + TailwindCSS 构建的纯前端 Web 应用，首期包含 2048、贪吃蛇、俄罗斯方块三款经典益智游戏，支持 PC / 手机浏览器，同一 WiFi 局域网内扫码即玩。

> 项目代号：EasyGame-MVP | 版本：v0.1.0

---

## ✨ 功能特性

- 🎯 **三款经典游戏**：2048、贪吃蛇（Snake）、俄罗斯方块（Tetris）
- 📱 **局域网即开即玩**：启动后自动注入本机局域网 IP，手机扫码（二维码）即可加入
- 🎨 **主题切换**：深色 / 浅色主题一键切换
- 🏆 **排行榜**：本地成绩排行，挑战自我
- ⚙️ **自定义设置**：每款游戏独立参数面板（如 2048 网格尺寸、贪吃蛇速度、俄罗斯方块难度等）
- 💾 **本地持久化**：设置与排行榜自动保存（localStorage 适配器，可扩展）
- 🧩 **可扩展架构**：游戏引擎与视图解耦，新增游戏只需实现 `BaseGame` 接口

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Vue 3](https://vuejs.org/)（Composition API） |
| 构建 | [Vite 5](https://vitejs.dev/) |
| 样式 | [TailwindCSS 3](https://tailwindcss.com/) |
| 状态管理 | [Pinia](https://pinia.vuejs.org/) |
| 路由 | [Vue Router 4](https://router.vuejs.org/) |
| 语言 | TypeScript |
| 其他 | qrcode（局域网扫码）、os（局域网 IP 探测） |

## 🚀 快速开始

```bash
# 安装依赖（使用 pnpm，也可以用 npm / yarn）
pnpm install

# 启动开发服务器（默认 http://localhost:5173）
pnpm dev

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

### 📡 局域网访问

开发服务器已配置监听 `0.0.0.0:5173`，启动后：

1. 终端会打印本机局域网 IP
2. 打开页面左上角/侧边的 **局域网面板（LanPanel）**，会显示当前局域网访问地址 + 二维码
3. 同一 WiFi 下的手机/平板扫码即可访问

## 📁 目录结构

```
EasyGame/
├── public/                  # 静态资源
│   └── favicon.svg
├── src/
│   ├── adapters/            # 平台 / 存储适配器（可替换实现）
│   │   ├── PlatformAdapter.ts
│   │   └── StorageAdapter.ts
│   ├── assets/styles/       # 全局样式
│   ├── components/          # 通用组件
│   │   ├── GameCard.vue     # 游戏入口卡片
│   │   ├── LanPanel.vue     # 局域网访问面板
│   │   └── ThemeToggle.vue  # 主题切换
│   ├── game/                # 游戏引擎（纯逻辑，与视图解耦）
│   │   ├── base/            # BaseGame 抽象基类 + 排行榜
│   │   ├── 2048/
│   │   ├── snake/
│   │   └── tetris/
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态（游戏、设置、主题、排行榜）
│   ├── views/               # 页面视图
│   │   ├── Home.vue
│   │   └── games/           # 各游戏页面 + 通用面板组件
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts           # 含局域网 IP 自动注入
├── tailwind.config.ts
└── package.json
```

## 🧩 如何新增一款游戏

1. 在 `src/game/{游戏名}/` 下实现游戏引擎，继承 `src/game/base/BaseGame.ts`
2. 在 `src/views/games/` 下创建对应游戏视图组件
3. 在 `src/router/index.ts` 注册路由
4. 在首页（`Home.vue`）添加游戏入口卡片

## 🗺️ 路线图

- [x] MVP：2048 上线，支持 PC / 手机 / 局域网访问
- [ ] 扩展 4~6 款经典益智小游戏
- [ ] PWA 离线使用
- [ ] 平滑迁移至微信小程序，双端同步

## 📄 许可证

[MIT](LICENSE) © 2026 xyl886

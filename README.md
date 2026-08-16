# 🎮 EasyGame

**轻量级益智小游戏集合** —— 即开即玩、无需安装、全家同乐。

基于 Vue 3 + Vite + TailwindCSS 构建的纯前端 Web 应用，内置 **六款经典益智游戏**，支持 PC / 手机浏览器，扫码即玩、离线可用。

> 🕹️ **在线体验**：https://xyl886.github.io/EasyGame/

---

## ✨ 功能特性

- 🎯 **六款经典游戏**：2048、贪吃蛇（Snake）、俄罗斯方块（Tetris）、华容道（数字滑块 + 三国经典版）、数独、扫雷
- 📱 **扫码即玩**：首页「扫码即玩」面板生成线上地址二维码，手机扫码直达游戏大厅
- 📲 **PWA 离线可用**：可安装到桌面（添加到主屏幕），断网也能玩
- 🔊 **游戏音效**：Web Audio 合成音效（合并 / 吃食物 / 消行 / 通关等），顶栏一键开关
- 📤 **成绩分享**：Web Share API 分享成绩，自动降级为复制链接
- 🎨 **主题切换**：深色 / 浅色主题一键切换
- 🏆 **排行榜**：本地成绩排行，挑战自我
- ⚙️ **自定义设置**：每款游戏独立参数面板（如 2048 网格尺寸、贪吃蛇速度、俄罗斯方块难度等）
- 💾 **本地持久化**：设置与排行榜自动保存（localStorage 适配器，可扩展）
- 🔄 **自动存档**：误退 / 刷新 / 切后台后回到游戏，一键继续上次进度
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
| 其他 | qrcode（扫码）、Workbox（PWA 离线缓存） |

## 🚀 快速开始

```bash
# 安装依赖（使用 pnpm，也可以用 npm / yarn）
pnpm install

# 启动开发服务器（默认 http://localhost:5173，已监听 0.0.0.0）
pnpm dev

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

## 📱 访问与部署

- **手机访问线上**：直接访问 [在线地址](https://xyl886.github.io/EasyGame/)，或首页「扫码即玩」面板扫码直达
- **手机访问本地开发**：`pnpm dev` 已监听 `0.0.0.0:5173`，同一 WiFi 下手机访问 `http://局域网IP:5173/`（需放行 Windows 防火墙 5173 端口）
- **GitHub Pages 自动部署**：已配置 GitHub Actions（`.github/workflows/deploy.yml`），推送 `main` 分支即自动构建发布（`--base=/EasyGame/` 子路径部署）
- **其他静态托管**：`pnpm build` 后将 `dist/` 目录上传至任意静态托管（Nginx / Vercel / Netlify 等）即可

## 📁 目录结构

```
EasyGame/
├── public/                      # 静态资源
│   └── favicon.svg
├── src/
│   ├── adapters/                # 平台 / 存储适配器（可替换实现）
│   │   ├── PlatformAdapter.ts
│   │   └── StorageAdapter.ts
│   ├── assets/styles/           # 全局样式
│   ├── components/              # 通用组件
│   │   ├── GameCard.vue         # 游戏入口卡片
│   │   ├── OnlinePanel.vue      # 扫码即玩 + 操作方式合并面板
│   │   ├── HowToPlay.vue        # 玩法说明弹层
│   │   ├── LeaderboardPanel.vue # 排行榜面板
│   │   ├── SoundToggle.vue      # 音效开关
│   │   ├── ThemeToggle.vue      # 主题切换
│   │   ├── RouteLoading.vue     # 路由加载态
│   │   └── ToastHost.vue        # 轻提示容器
│   ├── game/                    # 游戏引擎（纯逻辑，与视图解耦）
│   │   ├── base/                # BaseGame 抽象基类 + 排行榜
│   │   ├── 2048/
│   │   ├── snake/
│   │   ├── tetris/
│   │   ├── klotski/
│   │   ├── klotski-classic/
│   │   ├── sudoku/
│   │   └── minesweeper/
│   ├── router/                  # 路由配置
│   ├── stores/                  # Pinia 状态（游戏、各游戏设置、主题、排行榜）
│   ├── utils/                   # 音效 / 分享 / 存档 / 提示等工具
│   ├── views/                   # 页面视图
│   │   ├── Home.vue             # 游戏大厅
│   │   ├── NotFound.vue         # 404
│   │   └── games/               # 各游戏页面
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts               # 含 PWA 配置
├── tailwind.config.ts
└── package.json
```

## 🧩 如何新增一款游戏

1. 在 `src/game/{游戏名}/` 下实现游戏引擎，继承 `src/game/base/BaseGame.ts`
2. 在 `src/views/games/` 下创建对应游戏视图组件
3. 在 `src/router/index.ts` 注册路由
4. 在游戏大厅数据源（`src/stores/game.ts`）添加游戏入口

## 🗺️ 路线图

- [x] MVP：2048 / 贪吃蛇 / 俄罗斯方块（含设置、排行榜、撤销、自动存档、音效、分享）
- [x] PWA 离线使用（离线缓存 + 添加到桌面）
- [x] 第四款游戏：华容道（数字滑块 3×3~5×5 + 三国经典版：40 种经典布局附最少步数与自动演示、随机开局、方向按钮，设置内一键切换）
- [x] 第五款游戏：数独（4×4 / 6×6 / 9×9 三尺寸 × 三难度，唯一解题面；候选笔记、错误计数、一键校验、智能提示、完成动画）
- [x] 第六款游戏：扫雷（初/中/高三档经典难度，首击安全、旗子标记、Chord 快速展开、键盘操作）
- [ ] 平滑迁移至微信小程序，双端同步

## 📄 许可证

[MIT](LICENSE) © 2026 xyl886

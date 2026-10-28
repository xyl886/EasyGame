# 🎮 EasyGame

**轻量级益智小游戏集合** —— 即开即玩、无需安装、全家同乐。

基于 Vue 3 + Vite + TailwindCSS 构建的纯前端 Web 应用，内置 **8 款经典益智游戏**，另含隐藏关卡「三国华容道」经典滑块，支持 PC / 手机浏览器，扫码即玩、离线可用。

> 🕹️ **在线体验**：https://xyl886.github.io/EasyGame/

---

## ✨ 功能特性

- 🎯 **8 款游戏**：2048、俄罗斯方块、扫雷、数独、贪吃蛇、华容道、连连看、消消乐
- 🏮 **隐藏关卡**：三国华容道（40 种经典布局 + 最少步数 + 自动演示，从「华容道 → 设置 → 三国版」进入）
- 🌐 **联机对战**：五子棋 / 四子棋支持 P2P 房号邀请（PeerJS 公共信令 + WebRTC 直连），支持预设快捷语、观战、断线自动重连与本机段位（仅本机记录）；不需要账号，不经过服务器保存
- 📱 **扫码即玩**：首页「扫码即玩」面板生成线上地址二维码，手机扫码直达游戏大厅
- 📲 **PWA 离线可用**：可安装到桌面（添加到主屏幕），断网也能玩
- 🔊 **游戏音效**：Web Audio 合成音效（合并 / 吃食物 / 消行 / 通关等），顶栏一键开关
- 📤 **成绩分享**：把本局成绩生成分享卡片（保存图片 / 系统分享 / 复制文案 / 复制链接），带二维码与挑战链接；Web Share 不支持时自动降级
- 🎨 **主题切换**：深色 / 浅色主题一键切换
- 🏆 **排行榜**：本地成绩排行，挑战自我
- ⚙️ **自定义设置**：每款游戏独立参数面板（如 2048 网格尺寸、贪吃蛇速度、俄罗斯方块难度等）
- 💾 **本地持久化**：设置与排行榜自动保存（localStorage 适配器，可扩展）
- 🔄 **自动存档**：误退 / 刷新 / 切后台后回到游戏，一键继续上次进度
- 🧩 **可扩展架构**：游戏引擎与视图解耦，新增游戏只需实现 `BaseGame` 接口并在注册表追加一条

## 🛠️ 技术栈

| 层级     | 技术                                           |
| -------- | ---------------------------------------------- |
| 框架     | [Vue 3](https://vuejs.org/)（Composition API） |
| 构建     | [Vite 5](https://vitejs.dev/)                  |
| 样式     | [TailwindCSS 3](https://tailwindcss.com/)      |
| 状态管理 | [Pinia](https://pinia.vuejs.org/)              |
| 路由     | [Vue Router 4](https://router.vuejs.org/)      |
| 语言     | TypeScript                                     |
| 其他     | qrcode（扫码）、Workbox（PWA 离线缓存）        |

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

# 单元测试（游戏引擎 / 生成器 / 存储适配器）
pnpm test

# 覆盖率
pnpm test:coverage

# 代码检查 / 类型检查 / 格式检查
pnpm lint
pnpm typecheck
pnpm format:check
```

## 📱 访问与部署

- **手机访问线上**：直接访问 [在线地址](https://xyl886.github.io/EasyGame/)，或首页「扫码即玩」面板扫码直达
- **手机访问本地开发**：`pnpm dev` 已监听 `0.0.0.0:5173`，同一 WiFi 下手机访问 `http://局域网IP:5173/`（需放行 Windows 防火墙 5173 端口）
- **GitHub Pages 自动部署**：已配置 GitHub Actions（`.github/workflows/deploy.yml`），推送 `main` 分支即自动构建发布（`--base=/EasyGame/` 子路径部署）
- **其他静态托管**：`pnpm build` 后将 `dist/` 目录上传至任意静态托管（Nginx / Vercel / Netlify 等）即可；若部署在子路径，构建时需加 `--base=/子路径/`

## 📁 目录结构

```
EasyGame/
├── public/                      # 静态资源
│   └── favicon.svg
├── src/
│   ├── adapters/                # 平台 / 存储适配器（可替换实现）
│   │   ├── PlatformAdapter.ts
│   │   └── StorageAdapter.ts
│   ├── assets/styles/           # 全局样式（Tailwind 入口 + eg-* 组件类）
│   ├── components/              # 通用组件
│   │   ├── GameCard.vue         # 游戏入口卡片
│   │   ├── OnlinePanel.vue      # 扫码即玩 + 操作方式面板
│   │   ├── HowToPlay.vue        # 玩法说明弹层
│   │   ├── SoundToggle.vue      # 音效开关
│   │   ├── ThemeToggle.vue      # 主题切换
│   │   ├── RouteLoading.vue     # 路由加载态
│   │   └── ToastHost.vue        # 轻提示容器
│   ├── game/                    # 游戏引擎（纯逻辑，与视图解耦）
│   │   ├── registry.ts          # 游戏目录与路由单一数据源
│   │   ├── base/                # BaseGame 抽象接口 + 排行榜 + 存档校验
│   │   ├── regression/          # 跨游戏引擎契约测试
│   │   ├── 2048/
│   │   ├── snake/
│   │   ├── tetris/
│   │   ├── klotski/
│   │   ├── klotski-classic/     # 三国华容道（隐藏入口）
│   │   ├── gomoku/              # 五子棋引擎
│   │   ├── connect4/            # 四子棋引擎
│   │   ├── multiplayer/         # 联机适配器与本机段位
│   │   ├── sudoku/
│   │   ├── minesweeper/
│   │   ├── lianliankan/
│   │   └── eliminate/
│   ├── composables/             # 游戏页面共享生命周期行为
│   ├── router/                  # 路由配置（从注册表派生）
│   ├── stores/                  # Pinia 状态（游戏、各游戏设置、主题、排行榜）
│   ├── utils/                   # 音效 / 分享 / 存档 / 提示等工具
│   ├── views/                   # 页面视图
│   │   ├── Home.vue             # 游戏大厅
│   │   ├── NotFound.vue         # 404
│   │   └── games/               # 8 个 Game*.vue + components/（排行榜 / 设置 / 计分）
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
3. 在 `src/game/registry.ts` 的 `gameDefinitions` 中追加一条元数据与懒加载视图；**路由路径与路由名会由 id 自动派生**，大厅与路由都会自动更新

## 🗺️ 路线图

- [x] MVP：2048 / 贪吃蛇 / 俄罗斯方块（含设置、排行榜、撤销、自动存档、音效、分享）
- [x] PWA 离线使用（离线缓存 + 添加到桌面）
- [x] 华容道（数字滑块 3×3~5×5）
- [x] 三国华容道经典滑块（40 种布局 + 最少步数与自动演示，隐藏入口）
- [x] 联机五子棋 / 四子棋（PeerJS P2P 房号邀请 + 快捷语 + 观战 + 断线重连 + 本机段位）
- [x] 数独（4×4 / 6×6 / 9×9 三尺寸 × 三难度，唯一解题面；候选笔记、错误计数、一键校验、智能提示）
- [x] 扫雷（初/中/高三档经典难度，首击安全、旗子标记、Chord 快速展开、键盘操作）
- [x] 连连看（≤2 弯经典路径算法，水果/动物/表情三主题，提示/洗牌/连线动画）
- [x] 消消乐（交换消除 + 重力下落 + 连锁连击计分，有限步数内达标即通关）
- [x] 游戏目录元数据与路由统一注册；自动存档采用带版本封套并校验状态结构
- [x] 收敛为 8 款精品：移除数字连连与 6 款未上线的扩展益智游戏，集中打磨经典阵容

### 后续迭代计划

1. **体验缺陷修复**：贪吃蛇 / 俄罗斯方块切后台与打开弹层时自动暂停；弹层遮罩点击与 Esc 关闭；移动端触控尺寸与对比度。
2. **UI 精修**：按设计系统统一 token（排版 / 色彩 / 动效 / 状态覆盖），修复暗色与浅色主题一致性。
3. **回归保障**：为 8 款游戏补齐撤销 / 存档恢复 / 计时边界用例，并加入组件测试与 e2e 冒烟。
4. **新形态探索**：在经典阵容稳定后评估 3D（three.js）与本地双人 / 每日挑战等轻联机玩法。

## 📄 许可证

[MIT](LICENSE) © 2026 xyl886

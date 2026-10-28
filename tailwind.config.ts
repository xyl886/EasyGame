import type { Config } from 'tailwindcss'

/**
 * EasyGame 设计系统（基于 Open Design「Claude」设计系统 + craft 规范）
 *
 * 核心纪律：
 * - 中性色占 70~90%，只保留一个品牌强调色（terracotta），语义色仅用于状态；
 * - 所有灰阶都带黄棕底色，不出现冷蓝灰；
 * - 用 1px ring 阴影表达层级，不用重投影；
 * - 标题用衬线体（display），控件用无衬线（sans）；
 * - 阴影 / 焦点环走 CSS 变量，暗色主题下自动切换。
 */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 页面与表面
        'bg-light': '#f5f4ed',
        'bg-dark': '#141413',
        'card-light': '#faf9f5',
        'card-dark': '#1f1f1d',
        'sand-light': '#e8e6dc',
        'sand-dark': '#2a2a27',
        // 文字（暖色中性，无冷蓝灰）
        'text-light': '#141413',
        'text-dark': '#faf9f5',
        'text-soft-light': '#3d3d3a',
        'text-soft-dark': '#e8e6dc',
        'text-muted-light': '#5e5d59',
        'text-muted-dark': '#b0aea5',
        'text-faint-light': '#6e6d66',
        'text-faint-dark': '#87867f',
        // 边框
        'border-light': '#e8e6dc',
        'border-dark': '#30302e',
        'border-subtle-light': '#f0eee6',
        'border-subtle-dark': '#2a2a27',
        // 唯一强调色：陶土红
        'accent-light': '#b5543a',
        'accent-dark': '#d97757',
        'accent-hover-light': '#a94730',
        'accent-hover-dark': '#e8875f',
        'accent-soft-light': 'rgba(181, 84, 58, 0.10)',
        'accent-soft-dark': 'rgba(217, 119, 87, 0.16)',
        // 语义色
        'focus-light': '#3898ec',
        'focus-dark': '#6cb0f0',
        'success-light': '#2f7d4f',
        'success-dark': '#7cc79a',
        'danger-light': '#b53333',
        'danger-dark': '#e58a8a',
        'warn-light': '#8a5a00',
        'warn-dark': '#e3b341',
        // 2048 方块色（游戏内容，沿用经典配色）
        'tile-2': '#EEE4DA',
        'tile-4': '#EDE0C8',
        'tile-8': '#F2B179',
        'tile-16': '#F59563',
        'tile-32': '#F67C5F',
        'tile-64': '#F65E3B',
        'tile-128': '#EDCF72',
        'tile-256': '#EDCC61',
        'tile-512': '#EDC850',
        'tile-1024': '#EDC53F',
        'tile-2048': '#EDC22E',
        'tile-4096': '#A0682F',
        'tile-8192': '#7C4DFF',
      },
      fontFamily: {
        display: ['Georgia', '"Times New Roman"', '"Songti SC"', 'STSong', 'serif'],
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'Roboto',
          'sans-serif',
        ],
        mono: ['ui-monospace', '"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        overline: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.14em' }],
        caption: ['0.8125rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.6' }],
        lead: ['1.125rem', { lineHeight: '1.65' }],
        title: ['1.5rem', { lineHeight: '1.2' }],
        heading: ['clamp(1.75rem, 3.2vw, 2.5rem)', { lineHeight: '1.15' }],
        display: ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        // 全部走 CSS 变量，浅/深色主题自动切换
        ring: 'var(--shadow-ring)',
        'ring-strong': 'var(--shadow-ring-strong)',
        lift: 'var(--shadow-lift)',
        'lift-strong': 'var(--shadow-lift-strong)',
        inset: 'var(--shadow-inset)',
        focus: 'var(--shadow-focus)',
        // 兼容旧类名（逐步由 ring / lift 取代）
        claude: 'var(--shadow-ring)',
        'claude-md': 'var(--shadow-ring)',
        'claude-lg': 'var(--shadow-lift)',
        'card-lift': 'var(--shadow-lift-strong)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      animation: {
        'tile-pop': 'tilePop 0.15s ease-out',
        'tile-merge': 'tileMerge 0.15s ease-out',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.2, 0, 0, 1)',
        'rise-in': 'riseIn 0.4s cubic-bezier(0.2, 0, 0, 1) both',
        'soft-pulse': 'softPulse 2.4s ease-in-out infinite',
      },
      keyframes: {
        tilePop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        tileMerge: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.7' },
        },
      },
      maxWidth: {
        shell: '68rem', // 1088px ≈ 1200 容器（含内边距）
      },
    },
  },
  plugins: [],
} satisfies Config

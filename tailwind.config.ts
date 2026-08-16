import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Claude 风格：暖米白 / 深海军 / 陶土红
        'bg-light': '#F7F3EE',
        'text-light': '#2D3748',
        'text-muted-light': '#6B7280',
        'card-light': '#FFFFFF',
        'border-light': '#E8E2D9',
        'accent-light': '#E86A5B',
        'accent-hover-light': '#D45A4B',
        'bg-dark': '#0F1115',
        'text-dark': '#E8E4DE',
        'text-muted-dark': '#9CA3AF',
        'card-dark': '#1A1D24',
        'border-dark': '#2A2E37',
        'accent-dark': '#F07A6B',
        'accent-hover-dark': '#FF8A7B',
        // 2048 方块色（保留原色系，微调饱和度）
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
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'claude': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.02)',
        'claude-md': '0 4px 12px -2px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'claude-lg': '0 12px 28px -4px rgba(0,0,0,0.08), 0 6px 10px -6px rgba(0,0,0,0.04)',
      },
      animation: {
        'tile-pop': 'tilePop 0.15s ease-out',
        'tile-merge': 'tileMerge 0.15s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
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
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config

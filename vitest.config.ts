import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/game/**/*.ts',
        'src/utils/**/*.ts',
        'src/stores/**/*.ts',
        'src/adapters/**/*.ts',
      ],
      exclude: ['**/*.test.ts', 'src/game/**/types.ts'],
      // 覆盖率基线下限（当前实测约 67%），只允许往上，防止测试被悄悄删掉
      thresholds: {
        statements: 62,
        branches: 75,
        functions: 62,
        lines: 62,
      },
    },
  },
})

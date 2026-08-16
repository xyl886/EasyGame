<template>
  <transition name="panel">
    <div
      v-if="settings.showSettings"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="settings.closeSettings()"
    >
      <!-- 遮罩 -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <!-- 面板 -->
      <div class="relative w-full max-w-md rounded-2xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude-lg p-5 space-y-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span>⚙️</span>
            <span>数独设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- 尺寸 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">棋盘尺寸</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="s in SIZES"
              :key="s.size"
              @click="localConfig.size = s.size"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.size === s.size
                ? 'bg-emerald-400 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-emerald-400/50'"
            >
              {{ s.label }}
            </button>
          </div>
          <p class="text-xs opacity-60">4×4 入门 · 6×6 中阶 · 9×9 标准</p>
        </div>

        <!-- 难度 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">难度（挖空格数）</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.difficulty === opt.value
                ? 'bg-emerald-400 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-emerald-400/50'"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs opacity-60">所有题面均为唯一解</p>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="settings.closeSettings()"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-emerald-400/50 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white text-sm font-bold shadow-claude-md transition-all active:scale-95"
          >
            应用并重新开始
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useSudokuSettingsStore, DIFFICULTY_LABELS, SIZES } from '../../../stores/sudoku-settings'
import type { SudokuConfig, SudokuDifficulty } from '../../../game/sudoku/types'

const settings = useSudokuSettingsStore()

const DIFFICULTY_OPTIONS: Array<{ value: SudokuDifficulty; label: string }> = (
  ['easy', 'normal', 'hard'] as SudokuDifficulty[]
).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))

const localConfig = reactive<SudokuConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: SudokuConfig]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease;
}
.panel-enter-active > div:last-child,
.panel-leave-active > div:last-child {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
.panel-enter-from > div:last-child,
.panel-leave-to > div:last-child {
  transform: scale(0.9) translateY(10px);
}
</style>

<template>
  <transition name="eg-panel">
    <div
      v-if="settings.showSettings"
      class="eg-modal-overlay"
      @click.self="settings.closeSettings()"
    >
      <!-- 遮罩 -->
      <div class="eg-modal-mask"></div>

      <!-- 面板 -->
      <div class="eg-modal-card" role="dialog" aria-modal="true" aria-label="游戏设置">
        <div class="eg-modal-head">
          <h3 class="eg-modal-title">
            <span>数独设置</span>
          </h3>
          <button aria-label="关闭设置" @click="settings.closeSettings()" class="eg-modal-close">
            <AppIcon name="close" :size="18" />
          </button>
        </div>

        <!-- 尺寸 -->
        <div class="space-y-2">
          <label class="eg-field-label">棋盘尺寸</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="s in SIZES"
              :key="s.size"
              @click="localConfig.size = s.size"
              class="eg-opt"
              :class="localConfig.size === s.size ? 'eg-opt-on' : ''"
            >
              {{ s.label }}
            </button>
          </div>
          <p class="eg-hint">4×4 入门 · 6×6 中阶 · 9×9 标准</p>
        </div>

        <!-- 难度 -->
        <div class="space-y-2">
          <label class="eg-field-label">难度（挖空格数）</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="eg-opt"
              :class="localConfig.difficulty === opt.value ? 'eg-opt-on' : ''"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="eg-hint">所有题面均为唯一解</p>
        </div>

        <!-- 底部按钮 -->
        <div class="eg-modal-actions">
          <button @click="resetDefault" class="eg-ghost-btn">恢复默认</button>
          <button @click="apply" class="eg-primary-btn">应用并重新开始</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useSudokuSettingsStore, DIFFICULTY_LABELS, SIZES } from '../../../stores/sudoku-settings'
import { DEFAULT_SUDOKU_CONFIG } from '../../../game/sudoku/types'
import type { SudokuConfig, SudokuDifficulty } from '../../../game/sudoku/types'
import { useEscapeKey } from '../../../composables/useEscapeKey'
import AppIcon from '../../../components/AppIcon.vue'

const settings = useSudokuSettingsStore()

useEscapeKey(
  () => settings.showSettings,
  () => settings.closeSettings(),
)

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

function resetDefault() {
  Object.assign(localConfig, DEFAULT_SUDOKU_CONFIG)
}
</script>

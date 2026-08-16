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
      <div class="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude-lg p-5 space-y-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span>⚙️</span>
            <span>俄罗斯方块设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- 初始速度 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">初始速度</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in SPEED_OPTIONS"
              :key="opt.value"
              @click="localConfig.speed = opt.value"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.speed === opt.value
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs opacity-60">每消除 10 行升 1 级，下落速度自动加快</p>
        </div>

        <!-- 胜利目标 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">胜利目标</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in TARGET_LINES_OPTIONS"
              :key="opt.value"
              @click="localConfig.targetLines = opt.value"
              class="py-2 px-2 rounded-lg text-xs font-medium transition-all active:scale-95 border"
              :class="localConfig.targetLines === opt.value
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs opacity-60">消除目标行数即获胜，0 为无尽模式</p>
        </div>

        <!-- 预览数量 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">预览下一块数量</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="n in PREVIEW_COUNT_OPTIONS"
              :key="n"
              @click="localConfig.previewCount = n"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.previewCount === n
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <!-- 鬼影预览 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">鬼影落点预览</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.ghostPiece = false"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="!localConfig.ghostPiece
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              隐藏
            </button>
            <button
              @click="localConfig.ghostPiece = true"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.ghostPiece
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              显示落点轮廓
            </button>
          </div>
        </div>

        <!-- Hold 槽 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">Hold 暂存槽</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.holdPiece = false"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="!localConfig.holdPiece
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              关闭
            </button>
            <button
              @click="localConfig.holdPiece = true"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.holdPiece
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              启用（每块仅一次）
            </button>
          </div>
        </div>

        <!-- 硬降 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">空格行为</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.hardDrop = false"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="!localConfig.hardDrop
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              软降（+1 分/格）
            </button>
            <button
              @click="localConfig.hardDrop = true"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.hardDrop
                ? 'bg-cyan-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-cyan-400/50'"
            >
              硬降（直接落底 +2 分/格）
            </button>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="resetDefault"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-cyan-400/50 transition-all active:scale-95"
          >
            恢复默认
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-500 text-gray-900 text-sm font-bold shadow-claude-md transition-all active:scale-95"
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
import { useTetrisSettingsStore, SPEED_OPTIONS, TARGET_LINES_OPTIONS, PREVIEW_COUNT_OPTIONS } from '../../../stores/tetris-settings'
import { DEFAULT_CONFIG } from '../../../game/tetris/types'
import type { TetrisConfig } from '../../../game/tetris/types'

const settings = useTetrisSettingsStore()

const localConfig = reactive<TetrisConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: TetrisConfig]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
}

function resetDefault() {
  Object.assign(localConfig, DEFAULT_CONFIG)
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
  transform: scale(0.92) translateY(10px);
}
</style>

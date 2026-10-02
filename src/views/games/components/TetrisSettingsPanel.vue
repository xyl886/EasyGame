<template>
  <transition name="panel">
    <div
      v-if="settings.showSettings"
      class="eg-modal-overlay"
      @click.self="settings.closeSettings()"
    >
      <!-- 遮罩 -->
      <div class="eg-modal-mask"></div>

      <!-- 面板 -->
      <div class="eg-modal-card">
        <div class="eg-modal-head">
          <h3 class="eg-modal-title">
            <span>⚙️</span>
            <span>俄罗斯方块设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="eg-modal-close"
          >
            ✕
          </button>
        </div>

        <!-- 初始速度 -->
        <div class="space-y-2">
          <label class="eg-field-label">初始速度</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in SPEED_OPTIONS"
              :key="opt.value"
              @click="localConfig.speed = opt.value"
              class="eg-opt"
              :class="localConfig.speed === opt.value
                 ? 'eg-opt-on' : ''"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="eg-hint">每消除 10 行升 1 级，下落速度自动加快</p>
        </div>

        <!-- 胜利目标 -->
        <div class="space-y-2">
          <label class="eg-field-label">胜利目标</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in TARGET_LINES_OPTIONS"
              :key="opt.value"
              @click="localConfig.targetLines = opt.value"
              class="eg-opt text-xs"
              :class="localConfig.targetLines === opt.value
                 ? 'eg-opt-on' : ''"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="eg-hint">消除目标行数即获胜，0 为无尽模式</p>
        </div>

        <!-- 预览数量 -->
        <div class="space-y-2">
          <label class="eg-field-label">预览下一块数量</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="n in PREVIEW_COUNT_OPTIONS"
              :key="n"
              @click="localConfig.previewCount = n"
              class="eg-opt"
              :class="localConfig.previewCount === n
                 ? 'eg-opt-on' : ''"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <!-- 鬼影预览 -->
        <div class="space-y-2">
          <label class="eg-field-label">鬼影落点预览</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.ghostPiece = false"
              class="eg-opt"
              :class="!localConfig.ghostPiece
                 ? 'eg-opt-on' : ''"
            >
              隐藏
            </button>
            <button
              @click="localConfig.ghostPiece = true"
              class="eg-opt"
              :class="localConfig.ghostPiece
                 ? 'eg-opt-on' : ''"
            >
              显示落点轮廓
            </button>
          </div>
        </div>

        <!-- Hold 槽 -->
        <div class="space-y-2">
          <label class="eg-field-label">Hold 暂存槽</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.holdPiece = false"
              class="eg-opt"
              :class="!localConfig.holdPiece
                 ? 'eg-opt-on' : ''"
            >
              关闭
            </button>
            <button
              @click="localConfig.holdPiece = true"
              class="eg-opt"
              :class="localConfig.holdPiece
                 ? 'eg-opt-on' : ''"
            >
              启用（每块仅一次）
            </button>
          </div>
        </div>

        <!-- 硬降 -->
        <div class="space-y-2">
          <label class="eg-field-label">空格行为</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.hardDrop = false"
              class="eg-opt"
              :class="!localConfig.hardDrop
                 ? 'eg-opt-on' : ''"
            >
              软降（+1 分/格）
            </button>
            <button
              @click="localConfig.hardDrop = true"
              class="eg-opt"
              :class="localConfig.hardDrop
                 ? 'eg-opt-on' : ''"
            >
              硬降（直接落底 +2 分/格）
            </button>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="eg-modal-actions">
          <button
            @click="resetDefault"
            class="eg-ghost-btn"
          >
            恢复默认
          </button>
          <button
            @click="apply"
            class="eg-primary-btn"
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
  transform: scale(0.9) translateY(10px);
}
</style>

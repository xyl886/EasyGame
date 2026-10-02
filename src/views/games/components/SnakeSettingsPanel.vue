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
            <span>贪吃蛇设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="eg-modal-close"
          >
            ✕
          </button>
        </div>

        <!-- 棋盘尺寸 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="eg-field-label">棋盘尺寸</label>
            <span class="eg-hint">{{ localConfig.size }}×{{ localConfig.size }}</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="s in SIZE_OPTIONS"
              :key="s"
              @click="localConfig.size = s"
              class="eg-opt"
              :class="localConfig.size === s
                 ? 'eg-opt-on' : ''"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <!-- 速度档位 -->
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
        </div>

        <!-- 穿墙模式 -->
        <div class="space-y-2">
          <label class="eg-field-label">穿墙模式</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.wallThrough = false"
              class="eg-opt"
              :class="!localConfig.wallThrough
                 ? 'eg-opt-on' : ''"
            >
              撞墙死
            </button>
            <button
              @click="localConfig.wallThrough = true"
              class="eg-opt"
              :class="localConfig.wallThrough
                 ? 'eg-opt-on' : ''"
            >
              穿墙绕到对面
            </button>
          </div>
        </div>

        <!-- 多食物模式 -->
        <div class="space-y-2">
          <label class="eg-field-label">食物模式</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.multiFood = false"
              class="eg-opt"
              :class="!localConfig.multiFood
                 ? 'eg-opt-on' : ''"
            >
              单食物（经典）
            </button>
            <button
              @click="localConfig.multiFood = true"
              class="eg-opt"
              :class="localConfig.multiFood
                 ? 'eg-opt-on' : ''"
            >
              多食物（同时 3 个）
            </button>
          </div>
          <p class="eg-hint">食物有 10% 概率为金色 bonus，+5 分</p>
        </div>

        <!-- 障碍物数量 -->
        <div class="space-y-2">
          <label class="eg-field-label">障碍物数量</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="n in OBSTACLE_OPTIONS"
              :key="n"
              @click="localConfig.obstacleCount = n"
              class="eg-opt"
              :class="localConfig.obstacleCount === n
                 ? 'eg-opt-on' : ''"
            >
              {{ n === 0 ? '无' : n }}
            </button>
          </div>
        </div>

        <!-- 胜利长度 -->
        <div class="space-y-2">
          <label class="eg-field-label">胜利长度</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in WIN_LENGTH_OPTIONS"
              :key="opt.value"
              @click="localConfig.winLength = opt.value"
              class="eg-opt text-xs"
              :class="localConfig.winLength === opt.value
                 ? 'eg-opt-on' : ''"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="eg-hint">蛇身达到目标长度即获胜，0 为无尽模式</p>
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
import { useSnakeSettingsStore, SIZE_OPTIONS, OBSTACLE_OPTIONS, WIN_LENGTH_OPTIONS, SPEED_OPTIONS } from '../../../stores/snake-settings'
import { DEFAULT_CONFIG } from '../../../game/snake/types'
import type { SnakeConfig } from '../../../game/snake/types'

const settings = useSnakeSettingsStore()

const localConfig = reactive<SnakeConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: SnakeConfig]
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

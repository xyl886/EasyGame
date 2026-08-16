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
            <span>贪吃蛇设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- 棋盘尺寸 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold">棋盘尺寸</label>
            <span class="text-xs opacity-60">{{ localConfig.size }}×{{ localConfig.size }}</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="s in SIZE_OPTIONS"
              :key="s"
              @click="localConfig.size = s"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.size === s
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <!-- 速度档位 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">初始速度</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in SPEED_OPTIONS"
              :key="opt.value"
              @click="localConfig.speed = opt.value"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.speed === opt.value
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 穿墙模式 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">穿墙模式</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.wallThrough = false"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="!localConfig.wallThrough
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              撞墙死
            </button>
            <button
              @click="localConfig.wallThrough = true"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.wallThrough
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              穿墙绕到对面
            </button>
          </div>
        </div>

        <!-- 多食物模式 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">食物模式</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="localConfig.multiFood = false"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="!localConfig.multiFood
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              单食物（经典）
            </button>
            <button
              @click="localConfig.multiFood = true"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.multiFood
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              多食物（同时 3 个）
            </button>
          </div>
          <p class="text-xs opacity-60">食物有 10% 概率为金色 bonus，+5 分</p>
        </div>

        <!-- 障碍物数量 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">障碍物数量</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="n in OBSTACLE_OPTIONS"
              :key="n"
              @click="localConfig.obstacleCount = n"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.obstacleCount === n
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              {{ n === 0 ? '无' : n }}
            </button>
          </div>
        </div>

        <!-- 胜利长度 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">胜利长度</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in WIN_LENGTH_OPTIONS"
              :key="opt.value"
              @click="localConfig.winLength = opt.value"
              class="py-2 px-2 rounded-lg text-xs font-medium transition-all active:scale-95 border"
              :class="localConfig.winLength === opt.value
                ? 'bg-lime-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-lime-400/50'"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs opacity-60">蛇身达到目标长度即获胜，0 为无尽模式</p>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="resetDefault"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-lime-400/50 transition-all active:scale-95"
          >
            恢复默认
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-gray-900 text-sm font-bold shadow-claude-md transition-all active:scale-95"
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

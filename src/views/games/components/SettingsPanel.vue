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
            <span>游戏设置</span>
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
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              {{ s }}×{{ s }}
            </button>
          </div>
        </div>

        <!-- 胜利目标 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">胜利目标</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in WIN_VALUE_OPTIONS"
              :key="opt.value"
              @click="localConfig.winValue = opt.value"
              class="py-2 px-2 rounded-lg text-xs font-medium transition-all active:scale-95 leading-tight border"
              :class="localConfig.winValue === opt.value
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 初始方块数 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">初始方块数</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="n in INITIAL_TILES_OPTIONS"
              :key="n"
              @click="localConfig.initialTiles = n"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.initialTiles === n
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              {{ n }} 个
            </button>
          </div>
        </div>

        <!-- 难度 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">难度（新方块数值概率）</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="py-2 px-3 rounded-lg text-sm transition-all active:scale-95 text-left border"
              :class="localConfig.difficulty === opt.value
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              <div class="font-semibold">{{ opt.label }}</div>
              <div class="text-[10px] opacity-70">{{ opt.desc }}</div>
            </button>
          </div>
        </div>

        <!-- 皮肤 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">皮肤</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in SKIN_OPTIONS"
              :key="opt.value"
              @click="localConfig.skin = opt.value"
              class="py-2 px-3 rounded-lg text-sm transition-all active:scale-95 text-left border"
              :class="localConfig.skin === opt.value
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              <div class="font-semibold">{{ opt.label }}</div>
              <div class="text-[10px] opacity-70">{{ opt.hint }}</div>
            </button>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="resetDefault"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40 transition-all active:scale-95"
          >
            恢复默认
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-accent-light dark:bg-accent-dark hover:bg-accent-hover-light dark:hover:bg-accent-hover-dark text-white text-sm font-bold shadow-claude-md transition-all active:scale-95"
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
import { useGame2048SettingsStore, SIZE_OPTIONS, WIN_VALUE_OPTIONS, INITIAL_TILES_OPTIONS, DIFFICULTY_OPTIONS, SKIN_OPTIONS_EXPORT } from '../../../stores/game2048-settings'
import { DEFAULT_CONFIG } from '../../../game/2048/types'
import type { Game2048Config } from '../../../game/2048/types'

const SKIN_OPTIONS = SKIN_OPTIONS_EXPORT

const settings = useGame2048SettingsStore()

// 本地草稿，确认后才应用
const localConfig = reactive<Game2048Config>({ ...settings.config })

// 每次打开时同步最新
watch(() => settings.showSettings, (open) => {
  if (open) {
    Object.assign(localConfig, settings.config)
  }
})

const emit = defineEmits<{
  apply: [config: Game2048Config]
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

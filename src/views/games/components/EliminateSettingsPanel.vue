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
            <span>消消乐设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- 难度 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">难度</label>
          <div class="space-y-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 border text-left flex items-center justify-between"
              :class="localConfig.difficulty === opt.value
                ? 'bg-pink-500 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-pink-500/50'"
            >
              <span>{{ opt.label }}</span>
              <span class="text-xs opacity-70">{{ opt.rows }}×{{ opt.cols }} · 目标 {{ opt.targetScore }} 分 · {{ opt.moves }} 步</span>
            </button>
          </div>
        </div>

        <!-- 主题 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">图案主题</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="(label, value) in THEME_LABELS"
              :key="value"
              @click="localConfig.theme = value"
              class="py-2 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 border text-center"
              :class="localConfig.theme === value
                ? 'bg-pink-500 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-pink-500/50'"
            >
              {{ THEME_ICON[value] }} {{ label }}
            </button>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="resetDefault"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-pink-500/50 transition-all active:scale-95"
          >
            ↺ 恢复默认
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold shadow-claude-md transition-all active:scale-95"
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
import { useEliminateSettingsStore, DIFFICULTY_LABELS, THEME_LABELS, ELIMINATE_PRESETS } from '../../../stores/eliminate-settings'
import { DEFAULT_ELIMINATE_CONFIG } from '../../../game/eliminate/types'
import type { EliminateConfig, EliminateDifficulty, EliminateTheme } from '../../../game/eliminate/types'

const settings = useEliminateSettingsStore()

const THEME_ICON: Record<EliminateTheme, string> = {
  gem: '💎',
  candy: '🍬',
  fruit: '🍎',
}

const DIFFICULTY_OPTIONS = (['easy', 'normal', 'hard'] as EliminateDifficulty[]).map((d) => ({
  value: d,
  label: DIFFICULTY_LABELS[d],
  ...ELIMINATE_PRESETS[d],
}))

const localConfig = reactive<EliminateConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: EliminateConfig]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
}

/** 恢复默认：重置本地配置为默认值（面板保持打开，可再点应用） */
function resetDefault() {
  Object.assign(localConfig, DEFAULT_ELIMINATE_CONFIG)
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

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
            <span>连连看设置</span>
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
                ? 'bg-indigo-500 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-indigo-500/50'"
            >
              <span>{{ opt.label }}</span>
              <span class="text-xs opacity-70">{{ opt.rows }}×{{ opt.cols }} · {{ opt.symbolCount }} 种图案</span>
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
                ? 'bg-indigo-500 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-indigo-500/50'"
            >
              {{ THEME_ICON[value] }} {{ label }}
            </button>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="resetDefault"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-indigo-500/50 transition-all active:scale-95"
          >
            ↺ 恢复默认
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold shadow-claude-md transition-all active:scale-95"
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
import { useLianliankanSettingsStore, DIFFICULTY_LABELS, THEME_LABELS, LINK_PRESETS } from '../../../stores/lianliankan-settings'
import { DEFAULT_LINK_CONFIG } from '../../../game/lianliankan/types'
import type { LinkConfig, LinkDifficulty, LinkTheme } from '../../../game/lianliankan/types'

const settings = useLianliankanSettingsStore()

const THEME_ICON: Record<LinkTheme, string> = {
  fruit: '🍇',
  animal: '🐼',
  emoji: '😀',
}

const DIFFICULTY_OPTIONS = (['easy', 'normal', 'hard'] as LinkDifficulty[]).map((d) => ({
  value: d,
  label: DIFFICULTY_LABELS[d],
  ...LINK_PRESETS[d],
}))

const localConfig = reactive<LinkConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: LinkConfig]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
}

/** 恢复默认：重置本地配置为默认值（面板保持打开，可再点应用） */
function resetDefault() {
  Object.assign(localConfig, DEFAULT_LINK_CONFIG)
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

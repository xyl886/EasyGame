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
            <span>1024 消消乐设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="eg-modal-close"
          >
            ✕
          </button>
        </div>

        <!-- 难度 -->
        <div class="space-y-2">
          <label class="eg-field-label">难度</label>
          <div class="space-y-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="eg-opt w-full text-left flex items-center justify-between"
              :class="localConfig.difficulty === opt.value
                 ? 'eg-opt-on' : ''"
            >
              <span>{{ opt.label }}</span>
              <span class="text-xs opacity-70">{{ opt.rows }}×{{ opt.cols }} · 目标 {{ opt.target }} · 每关 {{ opt.moves }} 步</span>
            </button>
          </div>
        </div>

        <!-- 主题 -->
        <div class="space-y-2">
          <label class="eg-field-label">数字皮肤</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="(label, value) in THEME_LABELS"
              :key="value"
              @click="localConfig.theme = value"
              class="eg-opt text-center"
              :class="localConfig.theme === value
                 ? 'eg-opt-on' : ''"
            >
              {{ value === 'classic' ? '🧮' : '🍬' }} {{ label }}
            </button>
          </div>
        </div>

        <!-- 玩法要点 -->
        <div class="text-xs leading-relaxed opacity-70 text-text-muted-light dark:text-text-muted-dark bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2.5">
          <p class="font-semibold opacity-90 mb-1">🎯 规则速记</p>
          <p>连线上下左右相邻的<b>相同数字</b>（≥2 格），松手求和成一个新数字（2+2+2=6）；腾出的格子由上方数字下落、顶部补新。合成目标数字即可过关，连锁自动触发。</p>
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
import { useMerge1024SettingsStore, DIFFICULTY_LABELS, THEME_LABELS, MERGE1024_PRESETS } from '../../../stores/merge1024-settings'
import { DEFAULT_MERGE1024_CONFIG } from '../../../game/merge1024/types'
import type { Merge1024Config, Merge1024Difficulty } from '../../../game/merge1024/types'

const settings = useMerge1024SettingsStore()

const DIFFICULTY_OPTIONS = (['easy', 'normal', 'hard'] as Merge1024Difficulty[]).map((d) => ({
  value: d,
  label: DIFFICULTY_LABELS[d],
  ...MERGE1024_PRESETS[d],
}))

const localConfig = reactive<Merge1024Config>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: Merge1024Config]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
}

/** 恢复默认：重置本地配置为默认值（面板保持打开，可再点应用） */
function resetDefault() {
  Object.assign(localConfig, DEFAULT_MERGE1024_CONFIG)
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

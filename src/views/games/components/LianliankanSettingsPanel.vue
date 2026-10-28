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
            <span>连连看设置</span>
          </h3>
          <button aria-label="关闭设置" @click="settings.closeSettings()" class="eg-modal-close">
            <AppIcon name="close" :size="18" />
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
              :class="localConfig.difficulty === opt.value ? 'eg-opt-on' : ''"
            >
              <span>{{ opt.label }}</span>
              <span class="text-xs text-text-muted-light dark:text-text-muted-dark"
                >{{ opt.rows }}×{{ opt.cols }} · {{ opt.symbolCount }} 种图案</span
              >
            </button>
          </div>
        </div>

        <!-- 主题 -->
        <div class="space-y-2">
          <label class="eg-field-label">图案主题</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="(label, value) in THEME_LABELS"
              :key="value"
              @click="localConfig.theme = value"
              class="eg-opt text-center"
              :class="localConfig.theme === value ? 'eg-opt-on' : ''"
            >
              {{ THEME_ICON[value] }} {{ label }}
            </button>
          </div>
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
import {
  useLianliankanSettingsStore,
  DIFFICULTY_LABELS,
  THEME_LABELS,
  LINK_PRESETS,
} from '../../../stores/lianliankan-settings'
import { DEFAULT_LINK_CONFIG } from '../../../game/lianliankan/types'
import type { LinkConfig, LinkDifficulty, LinkTheme } from '../../../game/lianliankan/types'
import { useEscapeKey } from '../../../composables/useEscapeKey'
import AppIcon from '../../../components/AppIcon.vue'

const settings = useLianliankanSettingsStore()

useEscapeKey(
  () => settings.showSettings,
  () => settings.closeSettings(),
)

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

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
            <span>扫雷设置</span>
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
              <span class="text-xs opacity-70"
                >{{ opt.rows }}×{{ opt.cols }} · {{ opt.mines }} 雷</span
              >
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
  useMinesweeperSettingsStore,
  DIFFICULTY_LABELS,
} from '../../../stores/minesweeper-settings'
import { MINE_PRESETS, DEFAULT_MINE_CONFIG } from '../../../game/minesweeper/types'
import type { MineConfig, MineDifficulty } from '../../../game/minesweeper/types'
import { useEscapeKey } from '../../../composables/useEscapeKey'
import AppIcon from '../../../components/AppIcon.vue'

const settings = useMinesweeperSettingsStore()

useEscapeKey(
  () => settings.showSettings,
  () => settings.closeSettings(),
)

const DIFFICULTY_OPTIONS = (['beginner', 'intermediate', 'expert'] as MineDifficulty[]).map(
  (d) => ({
    value: d,
    label: DIFFICULTY_LABELS[d],
    ...MINE_PRESETS[d],
  }),
)

const localConfig = reactive<MineConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: MineConfig]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
}

function resetDefault() {
  Object.assign(localConfig, DEFAULT_MINE_CONFIG)
}
</script>

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
            <span>游戏设置</span>
          </h3>
          <button aria-label="关闭设置" @click="settings.closeSettings()" class="eg-modal-close">
            <AppIcon name="close" :size="18" />
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
              :class="localConfig.size === s ? 'eg-opt-on' : ''"
            >
              {{ s }}×{{ s }}
            </button>
          </div>
        </div>

        <!-- 胜利目标 -->
        <div class="space-y-2">
          <label class="eg-field-label">胜利目标</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in WIN_VALUE_OPTIONS"
              :key="opt.value"
              @click="localConfig.winValue = opt.value"
              class="eg-opt text-xs leading-tight"
              :class="localConfig.winValue === opt.value ? 'eg-opt-on' : ''"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 初始方块数 -->
        <div class="space-y-2">
          <label class="eg-field-label">初始方块数</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="n in INITIAL_TILES_OPTIONS"
              :key="n"
              @click="localConfig.initialTiles = n"
              class="eg-opt"
              :class="localConfig.initialTiles === n ? 'eg-opt-on' : ''"
            >
              {{ n }} 个
            </button>
          </div>
        </div>

        <!-- 难度 -->
        <div class="space-y-2">
          <label class="eg-field-label">难度（新方块数值概率）</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="eg-opt text-left"
              :class="localConfig.difficulty === opt.value ? 'eg-opt-on' : ''"
            >
              <div class="font-semibold">{{ opt.label }}</div>
              <div class="text-[10px] opacity-70">{{ opt.desc }}</div>
            </button>
          </div>
        </div>

        <!-- 皮肤 -->
        <div class="space-y-2">
          <label class="eg-field-label">皮肤</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in SKIN_OPTIONS"
              :key="opt.value"
              @click="localConfig.skin = opt.value"
              class="eg-opt text-left"
              :class="localConfig.skin === opt.value ? 'eg-opt-on' : ''"
            >
              <div class="font-semibold">{{ opt.label }}</div>
              <div class="text-[10px] opacity-70">{{ opt.hint }}</div>
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
  useGame2048SettingsStore,
  SIZE_OPTIONS,
  WIN_VALUE_OPTIONS,
  INITIAL_TILES_OPTIONS,
  DIFFICULTY_OPTIONS,
  SKIN_OPTIONS_EXPORT,
} from '../../../stores/game2048-settings'
import { DEFAULT_CONFIG } from '../../../game/2048/types'
import type { Game2048Config } from '../../../game/2048/types'
import { useEscapeKey } from '../../../composables/useEscapeKey'
import AppIcon from '../../../components/AppIcon.vue'

const SKIN_OPTIONS = SKIN_OPTIONS_EXPORT

const settings = useGame2048SettingsStore()

useEscapeKey(
  () => settings.showSettings,
  () => settings.closeSettings(),
)

// 本地草稿，确认后才应用
const localConfig = reactive<Game2048Config>({ ...settings.config })

// 每次打开时同步最新
watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

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

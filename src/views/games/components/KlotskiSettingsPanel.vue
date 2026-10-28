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
            <span>华容道设置</span>
          </h3>
          <button aria-label="关闭设置" @click="settings.closeSettings()" class="eg-modal-close">
            <AppIcon name="close" :size="18" />
          </button>
        </div>

        <!-- 玩法切换 -->
        <div class="space-y-2">
          <label class="eg-field-label">玩法</label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="eg-opt eg-opt-on">数字版</button>
            <button type="button" class="eg-opt" @click="goClassic">三国版</button>
          </div>
          <p class="eg-hint">三国版为经典滑块：曹操 2×2 + 关羽 + 五虎将 + 小兵，4×5 棋盘</p>
        </div>

        <!-- 棋盘尺寸 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="eg-field-label">棋盘尺寸</label>
            <span class="eg-hint"
              >{{ localConfig.size }}×{{ localConfig.size }} · 共
              {{ localConfig.size * localConfig.size - 1 }} 个数字</span
            >
          </div>
          <div class="grid grid-cols-3 gap-2">
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
          <p class="eg-hint">3×3 入门 · 4×4 经典 · 5×5 挑战</p>
        </div>

        <!-- 难度（打乱强度） -->
        <div class="space-y-2">
          <label class="eg-field-label">难度（打乱强度）</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="eg-opt"
              :class="localConfig.difficulty === opt.value ? 'eg-opt-on' : ''"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="eg-hint">难度越高，初始乱序程度越大</p>
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
import { useRouter } from 'vue-router'
import {
  useKlotskiSettingsStore,
  SIZE_OPTIONS,
  DIFFICULTY_LABELS,
} from '../../../stores/klotski-settings'
import { DEFAULT_CONFIG } from '../../../game/klotski/types'
import type { KlotskiConfig, KlotskiDifficulty } from '../../../game/klotski/types'
import { useEscapeKey } from '../../../composables/useEscapeKey'
import AppIcon from '../../../components/AppIcon.vue'

const settings = useKlotskiSettingsStore()
const router = useRouter()

/** 切换到三国版（独立路由，不在大厅展示） */
function goClassic() {
  settings.closeSettings()
  router.push('/game/klotski-classic')
}

useEscapeKey(
  () => settings.showSettings,
  () => settings.closeSettings(),
)

const DIFFICULTY_OPTIONS: Array<{ value: KlotskiDifficulty; label: string }> = (
  ['easy', 'normal', 'hard'] as KlotskiDifficulty[]
).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))

const localConfig = reactive<KlotskiConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: KlotskiConfig]
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

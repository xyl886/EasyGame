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
      <div class="eg-modal-card" role="dialog" aria-modal="true" aria-label="三国华容道设置">
        <div class="eg-modal-head">
          <h3 class="eg-modal-title"></h3>
          <button @click="settings.closeSettings()" class="eg-modal-close" aria-label="关闭设置">
            <AppIcon name="close" :size="18" />
          </button>
        </div>

        <!-- 玩法切换 -->
        <div class="space-y-2">
          <label class="eg-field-label">玩法</label>
          <div class="grid grid-cols-2 gap-2">
            <button @click="goDigital" class="eg-opt">数字版</button>
            <button class="eg-opt eg-opt-on">三国版</button>
          </div>
        </div>

        <!-- 经典布局 -->
        <div class="space-y-2">
          <label class="eg-field-label">经典布局（40 残局）</label>
          <div class="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            <button
              v-for="opt in LAYOUT_OPTIONS"
              :key="opt.value"
              @click="localLayout = opt.value"
              class="eg-opt !py-1.5 text-xs flex items-center justify-between gap-1"
              :class="localLayout === opt.value ? 'eg-opt-on' : ''"
            >
              <span class="truncate">{{ opt.label }}</span>
              <span class="shrink-0 text-text-muted-light dark:text-text-muted-dark">{{
                opt.minSteps > 0 ? opt.minSteps + '步' : '无解'
              }}</span>
            </button>
          </div>
          <p class="eg-hint">每个经典布局附带最少步数，游戏页可一键「自动演示」解法</p>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useKlotskiSettingsStore } from '../../../stores/klotski-settings'
import { LEVELS } from '../../../game/klotski-classic/levels'
import type { ClassicConfig, ClassicLayoutId } from '../../../game/klotski-classic/types'
import { useEscapeKey } from '../../../composables/useEscapeKey'
import AppIcon from '../../../components/AppIcon.vue'

const settings = useKlotskiSettingsStore()

useEscapeKey(
  () => settings.showSettings,
  () => settings.closeSettings(),
)
const router = useRouter()

const LAYOUT_OPTIONS: Array<{ value: ClassicLayoutId; label: string; minSteps: number }> = [
  ...LEVELS.map((l) => ({ value: l.id, label: l.name, minSteps: l.minSteps })),
  { value: 'random', label: '随机开局', minSteps: 0 },
]

const localLayout = ref<ClassicLayoutId>(settings.classicLayout)

const emit = defineEmits<{
  apply: [config: ClassicConfig]
}>()

function apply() {
  settings.setClassicLayout(localLayout.value)
  settings.closeSettings()
  emit('apply', { layout: localLayout.value })
}

function resetDefault() {
  localLayout.value = '横刀立马'
}

/** 切回数字版 */
function goDigital() {
  settings.closeSettings()
  router.push('/game/klotski')
}
</script>

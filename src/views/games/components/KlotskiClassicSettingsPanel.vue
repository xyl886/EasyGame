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
            <span>三国华容道设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- 玩法切换 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">玩法</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="goDigital"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-amber-400/50"
            >
              🔢 数字版
            </button>
            <button
              class="py-2 rounded-lg text-sm font-medium transition-all border bg-amber-400 text-gray-900 border-transparent shadow-claude"
            >
              🧩 三国版
            </button>
          </div>
        </div>

        <!-- 经典布局 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">经典布局（40 残局）</label>
          <div class="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            <button
              v-for="opt in LAYOUT_OPTIONS"
              :key="opt.value"
              @click="localLayout = opt.value"
              class="px-2 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border flex items-center justify-between gap-1"
              :class="localLayout === opt.value
                ? 'bg-amber-400 text-gray-900 border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-amber-400/50'"
            >
              <span class="truncate">{{ opt.label }}</span>
              <span class="shrink-0 opacity-60">{{ opt.minSteps > 0 ? opt.minSteps + '步' : '无解' }}</span>
            </button>
          </div>
          <p class="text-xs opacity-60">每个经典布局附带最少步数，游戏页可一键「自动演示」解法</p>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="settings.closeSettings()"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-amber-400/50 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 text-sm font-bold shadow-claude-md transition-all active:scale-95"
          >
            应用并重新开始
          </button>
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

const settings = useKlotskiSettingsStore()
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

/** 切回数字版 */
function goDigital() {
  settings.closeSettings()
  router.push('/game/klotski')
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

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
            <span>华容道设置</span>
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
              class="py-2 rounded-lg text-sm font-medium transition-all border bg-rose-400 text-white border-transparent shadow-claude"
            >
              🔢 数字版
            </button>
            <button
              @click="goClassic"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-rose-400/50"
            >
              🧩 三国版
            </button>
          </div>
          <p class="text-xs opacity-60">三国版为经典滑块：曹操 2×2 + 关羽 + 五虎将 + 小兵，4×5 棋盘</p>
        </div>

        <!-- 棋盘尺寸 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold">棋盘尺寸</label>
            <span class="text-xs opacity-60">{{ localConfig.size }}×{{ localConfig.size }} · 共 {{ localConfig.size * localConfig.size - 1 }} 个数字</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="s in SIZE_OPTIONS"
              :key="s"
              @click="localConfig.size = s"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.size === s
                ? 'bg-rose-400 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-rose-400/50'"
            >
              {{ s }}×{{ s }}
            </button>
          </div>
          <p class="text-xs opacity-60">3×3 入门 · 4×4 经典 · 5×5 挑战</p>
        </div>

        <!-- 难度（打乱强度） -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">难度（打乱强度）</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="py-2 rounded-lg text-sm font-medium transition-all active:scale-95 border"
              :class="localConfig.difficulty === opt.value
                ? 'bg-rose-400 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-rose-400/50'"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs opacity-60">难度越高，初始乱序程度越大</p>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="resetDefault"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-rose-400/50 transition-all active:scale-95"
          >
            恢复默认
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-rose-400 hover:bg-rose-500 text-white text-sm font-bold shadow-claude-md transition-all active:scale-95"
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
import { useRouter } from 'vue-router'
import { useKlotskiSettingsStore, SIZE_OPTIONS, DIFFICULTY_LABELS } from '../../../stores/klotski-settings'
import { DEFAULT_CONFIG } from '../../../game/klotski/types'
import type { KlotskiConfig, KlotskiDifficulty } from '../../../game/klotski/types'

const settings = useKlotskiSettingsStore()
const router = useRouter()

/** 切换到三国版 */
function goClassic() {
  settings.closeSettings()
  router.push('/game/klotski-classic')
}

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

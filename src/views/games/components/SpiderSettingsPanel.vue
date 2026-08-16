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
      <div class="relative w-full max-w-md rounded-2xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude-lg p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span>⚙️</span>
            <span>难度选择</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- 难度分组：单色 / 双色 / 四色 -->
        <div class="space-y-3">
          <div v-for="group in GROUPS" :key="group.suits" class="space-y-1.5">
            <div class="text-sm font-semibold flex items-center gap-1.5">
              {{ group.name }}
              <span class="text-xs" v-html="group.symbols"></span>
            </div>
            <div class="grid gap-1.5" :style="{ gridTemplateColumns: `repeat(${group.options.length}, 1fr)` }">
              <button
                v-for="opt in group.options"
                :key="opt.mode"
                @click="pick(group.suits, opt.mode)"
                class="py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 border"
                :class="isActive(group.suits, opt.mode)
                  ? 'bg-purple-500 text-white border-transparent shadow-claude'
                  : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-purple-400/50'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <p class="text-xs opacity-60">难度区分基于洗牌方式，随机难度更容易产生僵局</p>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-2 border-t border-border-light dark:border-border-dark">
          <button
            @click="settings.closeSettings()"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-purple-400/50 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold shadow-claude-md transition-all active:scale-95"
          >
            应用并重新开始
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useSpiderSettingsStore, DIFFICULTY_OPTIONS, MODE_LABELS } from '../../../stores/spider-settings'
import type { SpiderConfig, SpiderMode } from '../../../game/spider/types'

const settings = useSpiderSettingsStore()

interface GroupOpt {
  mode: SpiderMode
  label: string
}
const GROUPS: Array<{ suits: 1 | 2 | 4; name: string; symbols: string; options: GroupOpt[] }> = [
  { suits: 1, name: '单色', symbols: '<span class="text-black dark:text-white">♠</span>', options: [] },
  { suits: 2, name: '双色', symbols: '<span class="text-red-500">♥</span> <span class="text-black dark:text-white">♠</span>', options: [] },
  { suits: 4, name: '四色', symbols: '<span class="text-red-500">♦</span> <span class="text-black dark:text-white">♣</span><span class="text-red-500"> ♥</span> <span class="text-black dark:text-white">♠</span>', options: [] },
]
for (const g of GROUPS) {
  g.options = DIFFICULTY_OPTIONS.filter((d) => d.suits === g.suits).map((d) => ({
    mode: d.mode,
    label: MODE_LABELS[d.mode],
  }))
}

const localConfig = reactive<SpiderConfig>({ ...settings.config })

function isActive(suits: number, mode: SpiderMode): boolean {
  return localConfig.suits === suits && localConfig.mode === mode
}

function pick(suits: 1 | 2 | 4, mode: SpiderMode) {
  localConfig.suits = suits
  localConfig.mode = mode
}

const emit = defineEmits<{
  apply: [config: SpiderConfig]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
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

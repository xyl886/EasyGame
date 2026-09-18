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
            <span>数字连连设置</span>
          </h3>
          <button
            @click="settings.closeSettings()"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- 模式 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">游戏模式</label>
          <div class="space-y-2">
            <button
              v-for="opt in MODE_OPTIONS"
              :key="opt.value"
              @click="localConfig.mode = opt.value"
              class="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 border text-left flex items-center justify-between gap-3"
              :class="localConfig.mode === opt.value
                ? 'bg-sky-500 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-sky-500/50'"
            >
              <span class="flex flex-col">
                <span>{{ opt.label }}</span>
                <span class="text-[11px] opacity-70 font-normal">{{ opt.desc }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- 难度 -->
        <div class="space-y-2">
          <label class="text-sm font-semibold block">难度（决定开局显示多少个数字）</label>
          <div class="space-y-2">
            <button
              v-for="opt in DIFFICULTY_OPTIONS"
              :key="opt.value"
              @click="localConfig.difficulty = opt.value"
              class="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 border text-left flex items-center justify-between"
              :class="localConfig.difficulty === opt.value
                ? 'bg-sky-500 text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-sky-500/50'"
            >
              <span>{{ opt.label }}</span>
              <span class="text-xs opacity-70">{{ opt.desc }}</span>
            </button>
          </div>
          <p class="text-xs opacity-60 leading-relaxed">
            开局只显示一部分数字，其余是空白格。规则是「连到哪就显示到哪」：
            你连上哪个格子它才亮出来，下一个数藏在哪得自己拖过去试。
          </p>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
          <button
            @click="resetDefault"
            class="flex-1 py-2.5 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-sm font-medium text-text-light dark:text-text-dark hover:border-sky-500/50 transition-all active:scale-95"
          >
            ↺ 恢复默认
          </button>
          <button
            @click="apply"
            class="flex-[2] py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-claude-md transition-all active:scale-95"
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
import { useNumberChainSettingsStore, DIFFICULTY_LABELS, MODE_LABELS, INITIAL_REVEAL_RATIO, MIN_REVEAL_COUNT } from '../../../stores/numberchain-settings'
import { DEFAULT_NUMBERCHAIN_CONFIG } from '../../../game/numberchain/types'
import type { NumberChainConfig, NumberChainDifficulty, NumberChainMode } from '../../../game/numberchain/types'

const settings = useNumberChainSettingsStore()

const DIFFICULTY_OPTIONS = (['easy', 'normal', 'hard'] as NumberChainDifficulty[]).map((d) => ({
  value: d,
  label: DIFFICULTY_LABELS[d],
  desc: `开局显示约 ${Math.round(INITIAL_REVEAL_RATIO[d] * 100)}%（至少 ${MIN_REVEAL_COUNT[d]} 个）`,
}))

const MODE_OPTIONS: Array<{ value: NumberChainMode; label: string; desc: string }> = [
  { value: 'classic', label: `🎯 ${MODE_LABELS.classic}`, desc: '逐关推进，棋盘最大 8×8 = 64 个数字' },
  { value: 'endless', label: `♾️ ${MODE_LABELS.endless}`, desc: '棋盘不封顶，一路连下去；想结束时点「结束」结算' },
]

const localConfig = reactive<NumberChainConfig>({ ...settings.config })

watch(
  () => settings.showSettings,
  (open) => {
    if (open) {
      Object.assign(localConfig, settings.config)
    }
  },
)

const emit = defineEmits<{
  apply: [config: NumberChainConfig]
}>()

function apply() {
  settings.setConfig({ ...localConfig })
  settings.closeSettings()
  emit('apply', { ...localConfig })
}

/** 恢复默认：重置本地配置为默认值（面板保持打开，可再点应用） */
function resetDefault() {
  Object.assign(localConfig, DEFAULT_NUMBERCHAIN_CONFIG)
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

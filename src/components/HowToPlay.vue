<template>
  <transition name="eg-panel">
    <div v-if="modelValue" class="eg-modal-overlay" @click.self="close">
      <!-- 装饰遮罩：pointer-events 已由样式关闭，点击空白处命中 overlay -->
      <div class="eg-modal-mask"></div>

      <div
        class="eg-modal-card-plain max-h-[80dvh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
      >
        <div class="eg-modal-head mb-4">
          <h3 id="howto-title" class="eg-modal-title">{{ title }} · 玩法</h3>
          <button type="button" class="eg-modal-close" aria-label="关闭玩法说明" @click="close">
            <AppIcon name="close" :size="18" />
          </button>
        </div>
        <div
          class="space-y-3 text-[0.9375rem] leading-relaxed text-text-soft-light dark:text-text-soft-dark"
        >
          <slot />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { useEscapeKey } from '../composables/useEscapeKey'

const props = defineProps<{
  modelValue: boolean
  title: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}

useEscapeKey(() => props.modelValue, close)
</script>

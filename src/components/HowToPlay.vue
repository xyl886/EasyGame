<template>
  <transition name="panel">
    <div
      v-if="modelValue"
      class="eg-modal-overlay"
      @click.self="close"
    >
      <!-- 遮罩 -->
      <div class="eg-modal-mask"></div>

      <!-- 面板 -->
      <div class="eg-modal-card-plain max-h-[80vh]">
        <div class="eg-modal-head mb-4">
          <h3 class="eg-modal-title">
            <span>🎮</span>
            <span>{{ title }} · 玩法</span>
          </h3>
          <button
            @click="close"
            class="eg-modal-close"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div class="space-y-3 text-sm text-text-light dark:text-text-dark leading-relaxed">
          <slot />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
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

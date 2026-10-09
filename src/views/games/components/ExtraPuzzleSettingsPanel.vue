<template>
  <transition name="panel">
    <div v-if="modelValue" class="eg-modal-overlay" @click.self="close">
      <div class="eg-modal-mask" />
      <div class="eg-modal-card" role="dialog" aria-modal="true" :aria-label="title">
        <div class="eg-modal-head">
          <h3 class="eg-modal-title"><span>⚙️</span><span>{{ title }}</span></h3>
          <button class="eg-modal-close" type="button" aria-label="关闭设置" @click="close">✕</button>
        </div>

        <div v-for="field in fields" :key="field.key" class="space-y-2">
          <label class="eg-field-label">{{ field.label }}</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="option in field.options"
              :key="String(option.value)"
              type="button"
              class="eg-opt"
              :aria-pressed="draft[field.key] === option.value"
              :class="draft[field.key] === option.value ? 'eg-opt-on' : ''"
              @click="draft[field.key] = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="eg-modal-actions">
          <button type="button" class="eg-ghost-btn" @click="reset">恢复默认</button>
          <button type="button" class="eg-primary-btn" @click="apply">应用设置</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ExtraPuzzleConfig, ExtraPuzzleSettingValue } from '../../../composables/useExtraPuzzleSettings'

interface SettingField {
  key: string
  label: string
  options: Array<{ value: ExtraPuzzleSettingValue; label: string }>
}

const props = defineProps<{
  modelValue: boolean
  title: string
  config: ExtraPuzzleConfig
  defaults: ExtraPuzzleConfig
  fields: SettingField[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  apply: [config: ExtraPuzzleConfig]
}>()

const draft = ref<ExtraPuzzleConfig>({ ...props.config })

watch(() => props.modelValue, (visible) => {
  if (visible) draft.value = { ...props.config }
})

function close() {
  emit('update:modelValue', false)
}

function apply() {
  emit('apply', { ...draft.value })
  close()
}

function reset() {
  draft.value = { ...props.defaults }
  apply()
}
</script>

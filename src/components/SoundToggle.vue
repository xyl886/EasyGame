<template>
  <button
    @click="toggle"
    class="eg-icon-btn"
    :aria-label="enabled ? '关闭音效' : '开启音效'"
  >
    <span class="text-lg leading-none">{{ enabled ? '🔊' : '🔇' }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { sound } from '../utils/sound'

// 镜像 sound.enabled 到响应式 ref，保证点击后图标立即刷新
const enabled = ref(sound.enabled)

function toggle() {
  sound.toggle()
  enabled.value = sound.enabled
}
</script>

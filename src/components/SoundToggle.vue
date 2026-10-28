<template>
  <button
    type="button"
    class="eg-icon-btn"
    :aria-label="enabled ? '关闭游戏音效' : '开启游戏音效'"
    :aria-pressed="enabled"
    :title="enabled ? '关闭游戏音效' : '开启游戏音效'"
    @click="toggle"
  >
    <AppIcon :name="enabled ? 'volume-on' : 'volume-off'" :size="18" />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { sound } from '../utils/sound'
import AppIcon from './AppIcon.vue'

// 镜像 sound.enabled 到响应式 ref，保证点击后图标立即刷新
const enabled = ref(sound.enabled)

function toggle() {
  const next = sound.toggle()
  enabled.value = next
  // 开启音效时补一声反馈（关闭时的点击音由全局点击音自然收尾）
  if (next) sound.play('click')
}
</script>

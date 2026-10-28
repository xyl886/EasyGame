<template>
  <Transition name="eg-panel">
    <div v-if="modelValue" class="eg-modal-overlay" @click.self="close">
      <div class="eg-modal-mask"></div>

      <div
        class="eg-modal-card relative z-10 !max-w-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        data-testid="share-sheet"
      >
        <div class="eg-modal-head">
          <h3 id="share-title" class="eg-modal-title">分享成绩</h3>
          <button type="button" class="eg-modal-close" aria-label="关闭分享" @click="close">
            <AppIcon name="close" :size="18" />
          </button>
        </div>

        <div class="mt-4">
          <div
            class="relative mx-auto aspect-[3/4] w-full max-w-[19rem] overflow-hidden rounded-xl bg-sand-light shadow-ring dark:bg-sand-dark"
          >
            <div
              v-if="busy"
              class="absolute inset-0 flex items-center justify-center text-caption text-text-muted-light dark:text-text-muted-dark"
            >
              正在生成成绩卡片…
            </div>
            <img
              v-else-if="imageUrl"
              :src="imageUrl"
              alt="成绩分享卡片"
              class="h-full w-full object-contain"
            />
            <div
              v-else
              class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
            >
              <AppIcon name="share" :size="28" />
              <p class="text-caption text-text-muted-light dark:text-text-muted-dark">
                图片生成失败，但仍可复制成绩文案或链接分享
              </p>
            </div>
          </div>

          <p class="mt-3 text-center text-caption text-text-faint-light dark:text-text-faint-dark">
            图片可直接发到群里；手机上也可以长按图片保存到相册。
          </p>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button v-if="canNativeShare" type="button" class="eg-primary-btn" @click="nativeShare">
            <AppIcon name="share" :size="17" /> 系统分享
          </button>
          <button type="button" class="eg-secondary-btn" :disabled="!blob" @click="saveImage">
            <AppIcon name="check" :size="17" /> 保存图片
          </button>
          <button type="button" class="eg-secondary-btn" @click="copyText">
            <AppIcon name="pencil" :size="17" /> 复制文案
          </button>
          <button type="button" class="eg-ghost-btn" @click="copyLink">
            <AppIcon name="share" :size="17" /> 复制链接
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { useEscapeKey } from '../composables/useEscapeKey'
import { toast } from '../utils/toast'
import { PlatformAdapter } from '../adapters/PlatformAdapter'
import {
  downloadBlob,
  fileNameFor,
  renderShareCard,
  shareLinkFor,
  shareTextFor,
  shareTitleFor,
  type ShareCardData,
} from '../utils/shareCard'

const props = defineProps<{
  modelValue: boolean
  card: ShareCardData | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

type ShareDataLike = { title?: string; text?: string; url?: string; files?: File[] }

const busy = ref(false)
const error = ref(false)
const blob = ref<Blob | null>(null)
const imageUrl = ref('')

const canNativeShare = computed(() => {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareDataLike) => boolean
    share?: (data?: ShareDataLike) => Promise<void>
  }
  return typeof nav.share === 'function' && typeof nav.canShare === 'function'
})

function close(): void {
  emit('update:modelValue', false)
}

useEscapeKey(() => props.modelValue, close)

function revoke(): void {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = ''
  }
}

async function generate(): Promise<void> {
  revoke()
  blob.value = null
  error.value = false
  if (!props.card) return

  busy.value = true
  try {
    const result = await renderShareCard(props.card)
    blob.value = result
    imageUrl.value = URL.createObjectURL(result)
  } catch {
    error.value = true
  } finally {
    busy.value = false
  }
}

watch(
  () => [props.modelValue, props.card] as const,
  ([open]) => {
    if (open) void generate()
    else revoke()
  },
  { immediate: true },
)

onBeforeUnmount(revoke)

async function nativeShare(): Promise<void> {
  if (!props.card) return
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareDataLike) => boolean
    share?: (data?: ShareDataLike) => Promise<void>
  }
  const title = shareTitleFor(props.card)
  const text = shareTextFor(props.card)
  const url = shareLinkFor(props.card)

  try {
    if (blob.value) {
      const file = new File([blob.value], fileNameFor(props.card), { type: 'image/png' })
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title, text })
        return
      }
    }
    if (nav.share) await nav.share({ title, text, url })
  } catch (err) {
    if ((err as DOMException)?.name !== 'AbortError') toast('系统分享不可用，请保存图片或复制文案')
  }
}

function saveImage(): void {
  if (!blob.value || !props.card) return
  downloadBlob(blob.value, fileNameFor(props.card))
  toast('图片已保存')
}

async function copyText(): Promise<void> {
  if (!props.card) return
  const text = shareTextFor(props.card)
  try {
    await navigator.clipboard.writeText(text)
    toast('成绩文案已复制')
    return
  } catch {
    // fall through to legacy copy
  }
  const ok = await PlatformAdapter.copyToClipboard(text)
  toast(ok ? '成绩文案已复制' : '复制失败，请长按图片保存')
}

async function copyLink(): Promise<void> {
  if (!props.card) return
  const link = shareLinkFor(props.card)
  try {
    await navigator.clipboard.writeText(link)
    toast('链接已复制')
    return
  } catch {
    const ok = await PlatformAdapter.copyToClipboard(link)
    toast(ok ? '链接已复制' : '复制失败')
  }
}
</script>

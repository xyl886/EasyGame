<template>
  <transition name="eg-panel">
    <div v-if="modelValue" class="eg-modal-overlay eg-sheet" @click.self="close">
      <div class="eg-modal-mask"></div>

      <div
        class="eg-modal-card-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
      >
        <div
          class="eg-sheet-handle mx-auto mt-2 mb-1 hidden h-1 w-10 shrink-0 rounded-full bg-border-light dark:bg-border-dark"
          aria-hidden="true"
        ></div>

        <!-- 头部 -->
        <div
          class="eg-modal-head border-b border-border-subtle-light p-5 pb-3 dark:border-border-subtle-dark"
        >
          <h3 id="leaderboard-title" class="eg-modal-title">{{ gameName }} · 最高分榜</h3>
          <button type="button" class="eg-modal-close" aria-label="关闭排行榜" @click="close">
            <AppIcon name="close" :size="18" />
          </button>
        </div>

        <!-- 玩家名 + 排序切换 -->
        <div
          class="space-y-3 border-b border-border-subtle-light px-5 py-3 dark:border-border-subtle-dark"
        >
          <div class="flex items-center gap-2">
            <span class="shrink-0 text-caption text-text-faint-light dark:text-text-faint-dark"
              >玩家</span
            >
            <input
              v-if="editingName"
              ref="nameInputRef"
              v-model="nameDraft"
              type="text"
              maxlength="16"
              class="claude-input flex-1"
              placeholder="输入昵称"
              aria-label="玩家昵称"
              @keyup.enter="saveName"
              @keyup.esc="cancelEditName"
            />
            <button
              v-else
              type="button"
              class="flex min-h-11 flex-1 truncate items-center rounded-lg px-2 py-1 text-left text-sm font-medium text-text-light transition-colors hover:bg-sand-light dark:text-text-dark dark:hover:bg-sand-dark"
              :title="board.playerName"
              @click="startEditName"
            >
              {{ board.playerName }}
              <span class="ml-1 text-caption text-text-faint-light dark:text-text-faint-dark"
                >编辑</span
              >
            </button>
            <button
              v-if="editingName"
              type="button"
              class="eg-secondary-btn !min-h-9 !px-3 !py-1 !text-xs"
              @click="saveName"
            >
              保存
            </button>
          </div>

          <!-- 排序切换 -->
          <div class="flex flex-wrap items-center gap-2 text-caption">
            <span class="shrink-0 text-text-faint-light dark:text-text-faint-dark">排序</span>
            <button
              type="button"
              class="eg-opt !min-h-11 !px-2.5 !py-1 !text-caption"
              :class="sortBy === 'score' ? 'eg-opt-on' : ''"
              @click="sortBy = 'score'"
            >
              按分数
            </button>
            <button
              type="button"
              class="eg-opt !min-h-11 !px-2.5 !py-1 !text-caption"
              :class="sortBy === 'time' ? 'eg-opt-on' : ''"
              @click="sortBy = 'time'"
            >
              按时间
            </button>
          </div>

          <!-- 维度筛选 -->
          <div
            v-for="dim in dimensions"
            :key="dim.key"
            class="flex flex-wrap items-center gap-2 text-caption"
          >
            <span class="shrink-0 text-text-faint-light dark:text-text-faint-dark">{{
              dim.label
            }}</span>
            <button
              type="button"
              class="eg-opt !min-h-11 !px-2.5 !py-1 !text-caption"
              :class="filter[dim.key] === undefined ? 'eg-opt-on' : ''"
              @click="filter[dim.key] = undefined"
            >
              全部
            </button>
            <button
              v-for="opt in dim.values"
              :key="String(opt.value)"
              type="button"
              class="eg-opt !min-h-11 !px-2.5 !py-1 !text-caption"
              :class="filter[dim.key] === opt.value ? 'eg-opt-on' : ''"
              @click="filter[dim.key] = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 列表 -->
        <div class="min-h-[200px] flex-1 overflow-y-auto px-3 py-2">
          <div
            v-if="sortedEntries.length === 0"
            class="flex flex-col items-center gap-2 py-10 text-center"
          >
            <span class="text-text-faint-light dark:text-text-faint-dark" aria-hidden="true">
              <AppIcon name="flag" :size="22" />
            </span>
            <p class="eg-caption">暂无最高分记录，去玩一局吧</p>
          </div>
          <div v-else class="space-y-1">
            <div
              v-for="(e, i) in sortedEntries"
              :key="e.id"
              class="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors"
              :class="
                e.playerName === board.playerName
                  ? 'bg-accent-soft-light dark:bg-accent-soft-dark'
                  : ''
              "
            >
              <div
                class="w-7 shrink-0 text-center font-display text-sm tabular-nums"
                :class="
                  i === 0
                    ? 'font-medium text-accent-light dark:text-accent-dark'
                    : 'text-text-faint-light dark:text-text-faint-dark'
                "
              >
                {{ i + 1 }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold text-text-light dark:text-text-dark">
                  {{ e.playerName }}
                </div>
                <div
                  class="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-text-faint-light dark:text-text-faint-dark"
                >
                  <span v-if="e.won" class="text-success-light dark:text-success-dark">通关</span>
                  <span v-if="e.difficulty">{{ dimLabel('difficulty', e.difficulty) }}</span>
                  <span v-if="e.size">{{ sizeText(e.size) }}</span>
                  <span v-if="e.moves">{{ e.moves }} 步</span>
                  <span v-if="e.duration">{{ formatDuration(e.duration) }}</span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div
                  class="font-display text-base font-medium tabular-nums text-text-light dark:text-text-dark"
                >
                  {{ e.score }}
                </div>
                <div class="text-[0.6875rem] text-text-faint-light dark:text-text-faint-dark">
                  {{ formatTimestamp(e.timestamp) }}
                </div>
              </div>
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-faint-light opacity-100 transition-all hover:bg-danger-light/10 hover:text-danger-light focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-danger-dark/10 dark:hover:text-danger-dark"
                aria-label="删除这条记录"
                @click="removeEntry(e.id)"
              >
                <AppIcon name="close" :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- 底部操作 -->
        <div
          class="flex items-center justify-between gap-2 border-t border-border-subtle-light px-5 py-3 dark:border-border-subtle-dark"
        >
          <p class="text-caption text-text-faint-light dark:text-text-faint-dark">
            共 {{ filteredEntries.length }} 条（每人每维度只保留最高分）
            <span v-if="filteredEntries.length !== board.entries.length"
              >/ 总榜 {{ board.entries.length }} 条</span
            >
          </p>
          <button
            v-if="board.entries.length > 0"
            type="button"
            class="rounded-lg px-3 py-1.5 min-h-11 text-caption font-medium text-danger-light transition-colors hover:bg-danger-light/10 dark:text-danger-dark dark:hover:bg-danger-dark/10"
            @click="confirmClear"
          >
            清空全部
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useLeaderboardStore } from '../../../stores/leaderboard'
import { formatTimestamp, type LeaderboardDimension } from '../../../game/base/leaderboard'
import { useEscapeKey } from '../../../composables/useEscapeKey'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  modelValue: boolean
  gameId: string
  gameName: string
  dimensions?: LeaderboardDimension[]
  /** 尺寸维度展示后缀，如 2048 用「×」（显示 4×），扫雷可省略 */
  sizeSuffix?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
}>()

const board = useLeaderboardStore(props.gameId)

const sortBy = ref<'score' | 'time'>('score')
const filter = reactive<Record<'difficulty' | 'size', string | number | undefined>>({
  difficulty: undefined,
  size: undefined,
})
const editingName = ref(false)
const nameDraft = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      sortBy.value = 'score'
      filter.difficulty = undefined
      filter.size = undefined
      editingName.value = false
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

useEscapeKey(() => props.modelValue, close)

function startEditName() {
  nameDraft.value = board.playerName
  editingName.value = true
  nextTick(() => nameInputRef.value?.focus())
}

function saveName() {
  board.setPlayerName(nameDraft.value)
  editingName.value = false
}

function cancelEditName() {
  editingName.value = false
}

/** 按筛选条件过滤后的记录 */
const filteredEntries = computed(() =>
  board.entries.filter(
    (e) =>
      (!filter.difficulty || e.difficulty === filter.difficulty) &&
      (!filter.size || e.size === filter.size),
  ),
)

/** 按当前排序方式排序 */
const sortedEntries = computed(() => {
  const list = [...filteredEntries.value]
  if (sortBy.value === 'time') {
    return list.sort((a, b) => b.timestamp - a.timestamp)
  }
  return list.sort((a, b) => b.score - a.score)
})

/** 维度值到展示标签的查表 */
function dimLabel(key: 'difficulty' | 'size', value: string | number): string {
  const dim = props.dimensions?.find((d) => d.key === key)
  if (!dim) return String(value)
  const hit = dim.values.find((v) => v.value === value)
  return hit ? hit.label : String(value)
}

/** 尺寸维度优先用配置里的展示名（如 4×4），否则退回原始值 + 后缀 */
function sizeText(size: number): string {
  const dim = props.dimensions?.find((d) => d.key === 'size')
  const hit = dim?.values.find((v) => v.value === size)
  return hit ? hit.label : `${size}${props.sizeSuffix ?? ''}`
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${String(s).padStart(2, '0')}s`
}

function removeEntry(id: string) {
  if (confirm('确定删除这条记录吗？')) {
    board.removeEntry(id)
  }
}

function confirmClear() {
  if (
    confirm(
      '确定清空该游戏的全部最高分记录吗？每位玩家在各维度下的最高分将一并删除，此操作不可撤销。',
    )
  ) {
    board.clearAll()
  }
}
</script>

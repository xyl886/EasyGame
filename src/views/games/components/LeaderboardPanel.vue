<template>
  <transition name="panel">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="close"
    >
      <!-- 遮罩 -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <!-- 面板 -->
      <div class="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-claude-lg overflow-hidden">
        <!-- 头部 -->
        <div class="flex items-center justify-between p-5 pb-3 border-b border-black/5 dark:border-white/10">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span>🏆</span>
            <span>{{ gameName }} · 最高分榜</span>
          </h3>
          <button
            @click="close"
            class="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <!-- 玩家名 + 排序切换 -->
        <div class="px-5 py-3 space-y-3 border-b border-black/5 dark:border-white/10">
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-60 shrink-0">玩家</span>
            <input
              v-if="editingName"
              v-model="nameDraft"
              @keyup.enter="saveName"
              @keyup.esc="cancelEditName"
              ref="nameInputRef"
              type="text"
              maxlength="16"
              class="flex-1 px-2 py-1 rounded-lg text-sm bg-bg-light dark:bg-bg-dark/60 border border-accent-light dark:border-accent-dark outline-none text-text-light dark:text-text-dark"
              placeholder="输入昵称"
            />
            <button
              v-else
              @click="startEditName"
              class="flex-1 text-left text-sm font-medium px-2 py-1 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark/40 transition-colors truncate text-text-light dark:text-text-dark"
              :title="board.playerName"
            >
              {{ board.playerName }}
              <span class="text-xs opacity-50 ml-1">✏️</span>
            </button>
            <button
              v-if="editingName"
              @click="saveName"
              class="px-3 py-1 rounded-lg bg-accent-light dark:bg-accent-dark text-white text-xs font-bold hover:shadow-claude transition-all active:scale-95"
            >
              保存
            </button>
          </div>

          <!-- 排序切换 -->
          <div class="flex items-center gap-2 text-xs">
            <span class="opacity-60 shrink-0">排序</span>
            <button
              @click="sortBy = 'score'"
              class="px-2.5 py-1 rounded-md font-medium transition-all border"
              :class="sortBy === 'score'
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              按分数
            </button>
            <button
              @click="sortBy = 'time'"
              class="px-2.5 py-1 rounded-md font-medium transition-all border"
              :class="sortBy === 'time'
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              按时间
            </button>
          </div>

          <!-- 维度筛选 -->
          <div
            v-for="dim in dimensions"
            :key="dim.key"
            class="flex items-center gap-2 text-xs flex-wrap"
          >
            <span class="opacity-60 shrink-0">{{ dim.label }}</span>
            <button
              @click="filter[dim.key] = undefined"
              class="px-2.5 py-1 rounded-md font-medium transition-all border"
              :class="filter[dim.key] === undefined
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              全部
            </button>
            <button
              v-for="opt in dim.values"
              :key="String(opt.value)"
              @click="filter[dim.key] = opt.value"
              class="px-2.5 py-1 rounded-md font-medium transition-all border"
              :class="filter[dim.key] === opt.value
                ? 'bg-accent-light dark:bg-accent-dark text-white border-transparent shadow-claude'
                : 'bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:border-accent-light/40 dark:hover:border-accent-dark/40'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 列表 -->
        <div class="flex-1 overflow-y-auto px-3 py-2 min-h-[200px]">
          <div v-if="sortedEntries.length === 0" class="text-center py-10 opacity-50 text-sm">
            <div class="text-4xl mb-2">📭</div>
            <div>暂无最高分记录，去玩一局吧～</div>
          </div>
          <div v-else class="space-y-1.5">
            <div
              v-for="(e, i) in sortedEntries"
              :key="e.id"
              class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
              :class="e.playerName === board.playerName
                ? 'bg-accent-light/10 dark:bg-accent-dark/10 ring-1 ring-accent-light/30 dark:ring-accent-dark/30'
                : 'hover:bg-bg-light dark:hover:bg-bg-dark/40'"
            >
              <div class="w-7 text-center font-bold text-sm shrink-0"
                :class="i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-orange-700 dark:text-orange-400' : 'opacity-60'"
              >
                {{ i + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate">{{ e.playerName }}</div>
                <div class="text-[11px] opacity-60 flex items-center gap-1.5 flex-wrap">
                  <span v-if="e.won" class="text-emerald-500">🏆</span>
                  <span v-if="e.difficulty" class="px-1 rounded bg-bg-light dark:bg-bg-dark/60 text-text-muted-light dark:text-text-muted-dark">{{ dimLabel('difficulty', e.difficulty) }}</span>
                  <span v-if="e.size" class="px-1 rounded bg-bg-light dark:bg-bg-dark/60 text-text-muted-light dark:text-text-muted-dark">{{ e.size }}{{ sizeSuffix }}</span>
                  <span v-if="e.moves" class="opacity-70">{{ e.moves }} 步</span>
                  <span v-if="e.duration" class="opacity-70">{{ formatDuration(e.duration) }}</span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="font-extrabold text-base tabular-nums">{{ e.score }}</div>
                <div class="text-[10px] opacity-50">{{ formatTimestamp(e.timestamp) }}</div>
              </div>
              <button
                @click="removeEntry(e.id)"
                class="w-6 h-6 rounded-md text-xs opacity-30 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0"
                aria-label="删除"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- 底部操作 -->
        <div class="px-5 py-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
          <div class="text-xs opacity-50">
            共 {{ filteredEntries.length }} 条最高分（按玩家+难度+尺寸去重，每人每维度只留最高）
            <span v-if="filteredEntries.length !== board.entries.length">/ 总榜 {{ board.entries.length }} 条</span>
          </div>
          <button
            v-if="board.entries.length > 0"
            @click="confirmClear"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
          >
            清空全部最高分
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
  if (confirm('确定清空该游戏的全部最高分记录吗？每位玩家在各维度下的最高分将一并删除，此操作不可撤销。')) {
    board.clearAll()
  }
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

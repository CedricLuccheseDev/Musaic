<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'default' | 'large'
  loading?: boolean
}>(), {
  size: 'default',
  loading: false
})

const { t } = useI18n()

const searchInput = defineModel<string>('modelValue', { default: '' })

const emit = defineEmits<{
  search: []
}>()

function onSearch() {
  if (!searchInput.value.trim()) return
  emit('search')
}

const inputHeight = computed(() => props.size === 'large' ? 'h-14 md:h-16' : 'h-12')
const inputText = computed(() => props.size === 'large' ? 'text-base md:text-lg' : 'text-base')
</script>

<template>
  <div class="relative flex w-full flex-col">
    <!-- Main search bar -->
    <div
      class="flex w-full items-center overflow-hidden rounded-2xl border border-neutral-700/50 bg-neutral-900/80 transition-all duration-200 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20"
    >
      <!-- Search icon -->
      <div class="flex items-center pl-3 md:pl-4">
        <UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5 text-neutral-500" />
      </div>

      <!-- Input -->
      <input
        v-model="searchInput"
        type="text"
        :placeholder="t.searchPlaceholder"
        class="min-w-0 flex-1 bg-transparent px-2 text-white placeholder-neutral-500 outline-none md:px-3"
        :class="[inputHeight, inputText]"
        @keyup.enter="onSearch"
      >

      <!-- Search button with AI glow -->
      <button
        type="button"
        class="group relative m-1.5 flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-linear-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
        :class="size === 'large' ? 'p-2.5 md:p-3 md:hover:pr-5' : 'p-2.5 hover:pr-4'"
        :disabled="loading"
        @click="onSearch"
      >
        <!-- Animated background gradient -->
        <span class="absolute inset-0 bg-linear-to-r from-pink-600 via-purple-600 to-violet-600 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <!-- Glow pulse effect -->
        <span class="absolute inset-0 animate-pulse bg-linear-to-r from-violet-400/20 via-purple-400/20 to-pink-400/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />

        <!-- Loading spinner -->
        <div v-if="loading" class="relative z-10 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

        <!-- Icon with rotation -->
        <UIcon
          v-else
          name="i-heroicons-sparkles"
          class="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
        />

        <!-- Text that appears on hover -->
        <span class="font-logo relative z-10 ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm transition-all duration-300 group-hover:ml-2 group-hover:max-w-24">
          {{ loading ? '' : t.search }}
        </span>
      </button>
    </div>
  </div>
</template>

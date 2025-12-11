<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'default' | 'large'
}>(), {
  size: 'default'
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
        class="m-1.5 flex shrink-0 cursor-pointer items-center justify-center rounded-xl bg-linear-to-r from-violet-600 via-purple-600 to-pink-600 p-2.5 text-white shadow-lg shadow-purple-500/30 transition-all duration-200 hover:shadow-purple-500/50"
        :class="size === 'large' ? 'md:p-3' : 'p-2.5'"
        @click="onSearch"
      >
        <UIcon name="i-heroicons-sparkles" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

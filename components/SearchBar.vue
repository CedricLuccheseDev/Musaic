<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'default' | 'large'
}>(), {
  size: 'default'
})

const searchInput = defineModel<string>('modelValue', { default: '' })
const searchArtist = defineModel<boolean>('searchArtist', { default: false })

const emit = defineEmits<{
  search: []
}>()

function onSearch() {
  if (!searchInput.value.trim()) return
  emit('search')
}

function toggleArtistSearch() {
  searchArtist.value = !searchArtist.value
}

const inputHeight = computed(() => props.size === 'large' ? 'h-16' : 'h-12')
const inputText = computed(() => props.size === 'large' ? 'text-lg' : 'text-base')
</script>

<template>
  <div class="relative flex w-full items-center">
    <!-- Search input container -->
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
        :placeholder="searchArtist ? 'Artiste...' : 'Titre...'"
        class="min-w-0 flex-1 bg-transparent px-2 text-white placeholder-neutral-500 outline-none md:px-3"
        :class="[inputHeight, inputText]"
        @keyup.enter="onSearch"
      >

      <!-- Artist toggle button -->
      <button
        type="button"
        class="mx-1 flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 md:mx-2 md:gap-1.5 md:rounded-xl md:px-3 md:text-sm"
        :class="searchArtist
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'"
        @click="toggleArtistSearch"
      >
        <UIcon name="i-heroicons-user" class="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span class="hidden sm:inline">Artiste</span>
      </button>

      <!-- Search button inside -->
      <button
        type="button"
        class="m-1 flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-violet-600 p-2 font-medium text-white transition-all duration-200 hover:bg-violet-500 md:m-1.5 md:gap-2 md:rounded-xl md:px-4 md:py-2"
        :class="size === 'large' ? 'md:px-6 md:py-3' : 'md:px-4 md:py-2'"
        @click="onSearch"
      >
        <UIcon name="i-heroicons-magnifying-glass" class="h-4 w-4 md:hidden" />
        <span class="hidden md:inline">Rechercher</span>
      </button>
    </div>
  </div>
</template>

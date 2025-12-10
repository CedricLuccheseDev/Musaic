<script setup lang="ts">
withDefaults(defineProps<{
  showSearch?: boolean
}>(), {
  showSearch: true
})

const searchInput = defineModel<string>('modelValue', { default: '' })
const searchArtist = defineModel<boolean>('searchArtist', { default: false })

const emit = defineEmits<{
  search: []
}>()

function onSearch() {
  emit('search')
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-xl">
    <div class="grid grid-cols-3 items-center px-6 py-4">
      <!-- Logo - Left -->
      <div class="flex justify-start">
        <NuxtLink to="/" class="group flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-500/20 transition-transform group-hover:scale-105">
            <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-white" />
          </div>
          <span class="text-xl font-bold text-white">Musaic</span>
        </NuxtLink>
      </div>

      <!-- Search bar - Center -->
      <div v-if="showSearch" class="flex justify-center">
        <div class="w-full max-w-4xl">
          <SearchBar
            v-model="searchInput"
            v-model:search-artist="searchArtist"
            @search="onSearch"
          />
        </div>
      </div>
      <div v-else />

      <!-- Profile - Right -->
      <div class="flex justify-end">
        <button
          type="button"
          class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 transition-all duration-200 hover:bg-neutral-700 hover:text-white"
        >
          <UIcon name="i-heroicons-user" class="h-5 w-5" />
        </button>
      </div>
    </div>
  </header>
</template>

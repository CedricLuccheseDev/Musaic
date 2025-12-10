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
    <!-- Desktop layout -->
    <div class="hidden md:grid md:grid-cols-3 md:items-center md:px-6 md:py-4">
      <!-- Logo - Left -->
      <div class="flex justify-start">
        <NuxtLink to="/" class="group transition-transform hover:scale-105">
          <Logo size="md" />
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

    <!-- Mobile layout -->
    <div class="flex flex-col gap-3 px-4 py-3 md:hidden">
      <!-- Top row: Logo + Profile -->
      <div class="flex items-center justify-between">
        <NuxtLink to="/">
          <Logo size="sm" />
        </NuxtLink>
        <button
          type="button"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-neutral-800 text-neutral-400"
        >
          <UIcon name="i-heroicons-user" class="h-4 w-4" />
        </button>
      </div>

      <!-- Search bar -->
      <div v-if="showSearch">
        <SearchBar
          v-model="searchInput"
          v-model:search-artist="searchArtist"
          @search="onSearch"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const query = ref('')
const searchArtist = ref(false)

function search() {
  if (!query.value.trim()) return
  const queryParams: Record<string, string> = { q: query.value }
  if (searchArtist.value) {
    queryParams.searchArtist = '1'
  }
  navigateTo({ path: '/search', query: queryParams })
}
</script>

<template>
  <div class="relative min-h-screen bg-linear-to-b from-neutral-950 to-neutral-900">
    <BackgroundHome />
    <div class="relative flex min-h-screen flex-col items-center justify-center px-4">
      <!-- Logo -->
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-violet-800 shadow-xl shadow-violet-500/30">
          <UIcon name="i-heroicons-musical-note" class="h-8 w-8 text-white" />
        </div>
        <h1 class="text-6xl font-bold tracking-tight text-white">
          Musaic
        </h1>
      </div>

      <!-- Tagline -->
      <p class="mb-12 text-lg text-neutral-400">
        Trouve où télécharger tes tracks
      </p>

      <!-- Search -->
      <div class="w-full max-w-2xl">
        <SearchBar
          v-model="query"
          v-model:search-artist="searchArtist"
          size="large"
          @search="search"
        />
      </div>
    </div>
  </div>
</template>

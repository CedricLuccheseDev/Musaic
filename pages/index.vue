<script setup lang="ts">
const { t } = useI18n()

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
  <div class="relative flex min-h-screen flex-col bg-linear-to-b from-neutral-950 to-neutral-900">
    <BackgroundHome />
    <HeaderHome />
    <div class="relative flex flex-1 flex-col items-center justify-center px-4">
      <!-- Logo -->
      <div class="mb-3 md:mb-4">
        <Logo size="lg" />
      </div>

      <!-- Tagline -->
      <p class="mb-8 text-center text-base text-neutral-400 md:mb-12 md:text-lg">
        {{ t.tagline }}
      </p>

      <!-- Search -->
      <div class="w-full max-w-2xl px-2">
        <SearchBar
          v-model="query"
          v-model:search-artist="searchArtist"
          size="large"
          @search="search"
        />
      </div>
    </div>
    <Footer />
  </div>
</template>

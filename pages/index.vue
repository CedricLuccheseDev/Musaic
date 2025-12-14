<script setup lang="ts">
/* --- States --- */
const { t } = useI18n()
const query = ref('')
const isSearching = ref(false)

/* --- Methods --- */
async function search() {
  if (!query.value.trim()) return
  isSearching.value = true
  await navigateTo({ path: '/search', query: { q: query.value } })
}
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-linear-to-b from-neutral-950 to-neutral-900 lg:p-8">
    <HomeBackground />
    <HomeHeader />
    <div class="relative flex flex-1 flex-col items-center justify-center px-4">
      <!-- Logo -->
      <div
        v-motion
        :initial="{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }"
        :enter="{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 15, delay: 200 } }"
        class="mb-3 md:mb-4"
      >
        <AppLogo size="lg" />
      </div>

      <!-- Tagline -->
      <p
        v-motion
        :initial="{ opacity: 0, y: 30 }"
        :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 12, delay: 500 } }"
        class="mb-8 text-center text-base text-neutral-400 md:mb-12 md:text-lg"
      >
        {{ t.tagline }}
      </p>

      <!-- Search -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 40, scale: 0.9 }"
        :enter="{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 15, delay: 700 } }"
        class="w-full max-w-2xl px-2"
      >
        <SearchBar
          v-model="query"
          size="large"
          :loading="isSearching"
          @search="search"
        />
      </div>
    </div>
    <AppFooter />
  </div>
</template>

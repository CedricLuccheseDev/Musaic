<script setup lang="ts">
withDefaults(defineProps<{
  showSearch?: boolean
  loading?: boolean
}>(), {
  showSearch: true,
  loading: false
})

const searchInput = defineModel<string>('modelValue', { default: '' })

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
    <div class="hidden md:grid md:grid-cols-3 md:items-start md:px-6 md:py-4">
      <!-- Logo - Left -->
      <div class="flex justify-start">
        <NuxtLink to="/" class="group transition-transform hover:scale-105">
          <Logo size="md" />
        </NuxtLink>
      </div>

      <!-- Search bar - Center -->
      <div v-if="showSearch" class="flex justify-center">
        <div class="w-full max-w-xl">
          <SearchBar
            v-model="searchInput"
            :loading="loading"
            @search="onSearch"
          />
        </div>
      </div>
      <div v-else />

      <!-- Profile - Right -->
      <div class="flex items-center justify-end gap-3">
        <LangSwitch />
        <ProfileButtons />
      </div>
    </div>

    <!-- Mobile layout -->
    <div class="flex flex-col gap-3 px-4 py-3 md:hidden">
      <!-- Top row: Logo + Profile -->
      <div class="flex items-center justify-between">
        <NuxtLink to="/">
          <Logo size="sm" />
        </NuxtLink>
        <div class="flex items-center gap-2">
          <LangSwitch size="sm" />
          <ProfileButtons size="sm" />
        </div>
      </div>

      <!-- Search bar -->
      <div v-if="showSearch">
        <SearchBar
          v-model="searchInput"
          :loading="loading"
          @search="onSearch"
        />
      </div>
    </div>
  </header>
</template>

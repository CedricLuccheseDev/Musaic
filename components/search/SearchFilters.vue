<script setup lang="ts">
const { t } = useI18n()

type FilterType = 'all' | 'free' | 'paid'
type SearchType = 'title' | 'artist'

const searchType = defineModel<SearchType>('searchType', { default: 'title' })
const filter = defineModel<FilterType>('filter', { default: 'all' })
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 py-4">
    <!-- Left: Title/Artist toggle -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
        :class="searchType === 'title'
          ? 'bg-violet-600/20 text-violet-400'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="searchType = 'title'"
      >
        <UIcon name="i-heroicons-musical-note" class="h-4 w-4" />
        {{ t.title }}
      </button>
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
        :class="searchType === 'artist'
          ? 'bg-violet-600/20 text-violet-400'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="searchType = 'artist'"
      >
        <UIcon name="i-heroicons-user" class="h-4 w-4" />
        {{ t.artist }}
      </button>
    </div>

    <!-- Right: All/Free/Paid filter -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
        :class="filter === 'all'
          ? 'bg-violet-600/20 text-violet-400'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="filter = 'all'"
      >
        {{ t.all }}
      </button>
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
        :class="filter === 'free'
          ? 'bg-emerald-600/20 text-emerald-400'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="filter = 'free'"
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
        {{ t.free }}
      </button>
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
        :class="filter === 'paid'
          ? 'bg-orange-600/20 text-orange-400'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="filter = 'paid'"
      >
        <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
        {{ t.paid }}
      </button>
    </div>
  </div>
</template>

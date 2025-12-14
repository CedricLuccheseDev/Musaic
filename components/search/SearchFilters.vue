<script setup lang="ts">
/* --- States --- */
const { t } = useI18n()
type FilterType = 'all' | 'free' | 'paid'
const filter = defineModel<FilterType>('filter', { default: 'all' })
</script>

<template>
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
</template>

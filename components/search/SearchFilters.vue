<script setup lang="ts">
const { t } = useI18n()

type FilterType = 'all' | 'free' | 'paid'

const showTracks = defineModel<boolean>('showTracks', { default: true })
const showArtist = defineModel<boolean>('showArtist', { default: true })
const filter = defineModel<FilterType>('filter', { default: 'all' })

function toggleTracks() {
  // Can only disable if artist is enabled
  if (showTracks.value && showArtist.value) {
    showTracks.value = false
  } else {
    showTracks.value = true
  }
}

function toggleArtist() {
  // Can only disable if tracks is enabled
  if (showArtist.value && showTracks.value) {
    showArtist.value = false
  } else {
    showArtist.value = true
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 py-4">
    <!-- Left: Tracks/Artist toggles (both can be active, min 1) -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
        :class="showTracks
          ? 'bg-violet-600/20 text-violet-400'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="toggleTracks"
      >
        <UIcon name="i-heroicons-musical-note" class="h-4 w-4" />
        {{ t.title }}
      </button>
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
        :class="showArtist
          ? 'bg-violet-600/20 text-violet-400'
          : 'text-neutral-400 hover:text-neutral-200'"
        @click="toggleArtist"
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

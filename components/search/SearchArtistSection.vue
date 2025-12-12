<script setup lang="ts">
import type { ArtistInfo } from '~/server/services/soundcloud'

defineProps<{
  artist: ArtistInfo
}>()

const { t } = useI18n()

const collapsed = ref(false)

function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
</script>

<template>
  <section class="mb-8">
    <!-- Header (clickable to collapse) -->
    <button
      type="button"
      class="flex w-full cursor-pointer items-center gap-3 py-4 text-left"
      @click="collapsed = !collapsed"
    >
      <!-- Artist avatar -->
      <img
        v-if="artist.avatar_url"
        :src="artist.avatar_url"
        :alt="artist.username"
        class="h-10 w-10 rounded-full object-cover"
      >
      <UIcon v-else name="i-heroicons-user-circle" class="h-10 w-10 text-cyan-400" />

      <div class="flex-1">
        <h2 class="text-lg font-semibold text-cyan-400">
          {{ t.tracksBy }} {{ artist.username }}
        </h2>
        <p class="text-sm text-neutral-500">
          {{ formatFollowers(artist.followers_count) }} followers
        </p>
      </div>

      <span class="text-sm text-neutral-500">{{ artist.tracks.length }} {{ t.results }}</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="h-5 w-5 text-cyan-400 transition-transform duration-200"
        :class="{ 'rotate-180': !collapsed }"
      />
    </button>

    <!-- Track list (collapsible) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[2000px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[2000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="!collapsed" class="mt-2 space-y-2 overflow-hidden">
        <SearchTrackCard
          v-for="(track, index) in artist.tracks"
          :key="`artist-${track.id}`"
          :track="track"
          :index="index"
        />
      </div>
    </Transition>
  </section>
</template>

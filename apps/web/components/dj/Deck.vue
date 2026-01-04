<script setup lang="ts">
import type { DeckId } from '~/composables/useDjPlayer'

/* --- Props --- */
const props = defineProps<{
  deck: DeckId
}>()

/* --- Composables --- */
const { t } = useI18n()
const {
  deckA,
  deckB,
  masterDeck,
  syncEnabled,
  togglePlay,
  toggleBass,
  setMaster,
  ejectDeck,
  formatTime,
  seek
} = useDjPlayer()
const { formatKey, getKeyColor } = useKeyNotation()

/* --- Computed --- */
const deckState = computed(() => props.deck === 'A' ? deckA.value : deckB.value)
const isMaster = computed(() => masterDeck.value === props.deck)

const displayBpm = computed(() => {
  const track = deckState.value.track
  if (!track?.bpm_detected) return null

  const originalBpm = track.bpm_detected
  const syncedBpm = Math.round(originalBpm * deckState.value.playbackRate)

  if (syncEnabled.value && deckState.value.playbackRate !== 1.0) {
    return { original: Math.round(originalBpm), synced: syncedBpm }
  }
  return { original: Math.round(originalBpm), synced: null }
})

/* --- Methods --- */
function handleSeek(time: number) {
  seek(props.deck, time)
}
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
    <!-- Deck Label -->
    <div class="flex items-center justify-between">
      <span
        class="rounded-full px-2 py-0.5 text-xs font-bold"
        :class="deck === 'A' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-orange-500/20 text-orange-400'"
      >
        {{ deck }}
      </span>
      <button
        v-if="deckState.track"
        type="button"
        class="cursor-pointer rounded p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
        @click="ejectDeck(deck)"
      >
        <UIcon name="i-heroicons-x-mark" class="h-3 w-3" />
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="!deckState.track"
      class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-700 p-4 text-center"
    >
      <p class="text-xs text-neutral-500">{{ t.djDropTrack }}</p>
    </div>

    <!-- Track Loaded -->
    <template v-else>
      <!-- Artwork + Info -->
      <div class="flex gap-2">
        <div
          class="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg"
          @click="togglePlay(deck)"
        >
          <img
            v-if="deckState.track.artwork"
            :src="deckState.track.artwork"
            :alt="deckState.track.title"
            class="h-full w-full object-cover"
          >
          <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
            <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-500" />
          </div>
          <!-- Play/Pause overlay -->
          <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <UIcon
              :name="deckState.isPlaying ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
              class="h-5 w-5 text-white"
            />
          </div>
        </div>

        <div class="min-w-0 flex-1 overflow-hidden">
          <p class="truncate text-xs font-medium text-white">{{ deckState.track.title }}</p>
          <p class="truncate text-[10px] text-neutral-400">{{ deckState.track.artist }}</p>

          <!-- BPM + Key -->
          <div class="mt-1 flex items-center gap-2 text-[10px]">
            <span v-if="displayBpm" class="text-neutral-400">
              <span v-if="displayBpm.synced" class="text-violet-400">{{ displayBpm.synced }}</span>
              <span v-else>{{ displayBpm.original }}</span>
              <span v-if="displayBpm.synced" class="text-neutral-500"> ({{ displayBpm.original }})</span>
            </span>
            <span
              v-if="deckState.track.key_detected"
              class="rounded px-1 py-0.5 text-[9px] font-semibold"
              :style="{
                backgroundColor: `${getKeyColor(deckState.track.key_detected)}20`,
                color: getKeyColor(deckState.track.key_detected)
              }"
            >
              {{ formatKey(deckState.track.key_detected) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Time + Controls -->
      <div class="flex items-center justify-between">
        <span class="text-[10px] tabular-nums text-neutral-500">
          {{ formatTime(deckState.currentTime) }} / {{ formatTime(deckState.duration) }}
        </span>

        <div class="flex items-center gap-1">
          <!-- Master button -->
          <button
            v-if="syncEnabled && deckState.track?.bpm_detected"
            type="button"
            class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors"
            :class="isMaster
              ? 'bg-violet-500 text-white shadow shadow-violet-500/30'
              : 'bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700'"
            @click="setMaster(deck)"
          >
            M
          </button>

          <!-- Bass Toggle -->
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
            :class="deckState.bassOn
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'"
            @click="toggleBass(deck)"
          >
            <UIcon
              :name="deckState.bassOn ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'"
              class="h-3 w-3"
            />
            {{ deckState.bassOn ? 'BASS' : 'CUT' }}
          </button>
        </div>
      </div>

      <!-- Waveform Overview -->
      <DjWaveformOverview
        :track="deckState.track"
        :current-time="deckState.currentTime"
        :duration="deckState.duration"
        :waveform-data="deckState.waveformData"
        :deck="deck"
        @seek="handleSeek"
      />
    </template>
  </div>
</template>

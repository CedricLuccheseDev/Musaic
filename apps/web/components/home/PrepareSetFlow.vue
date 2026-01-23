<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()

const emit = defineEmits<{
  close: []
}>()

const selectedGenre = ref<string | null>(null)
const selectedVibe = ref<string | null>(null)
const artistInput = ref('')

const genres = [
  'Techno', 'House', 'Trance', 'Drum & Bass', 'Dubstep',
  'Ambient', 'Electro', 'Minimal', 'Progressive'
]

const vibes = [
  { id: 'chill', label: t.value.flowVibeChill },
  { id: 'energetic', label: t.value.flowVibeEnergetic },
  { id: 'dark', label: t.value.flowVibeDark },
  { id: 'melodic', label: t.value.flowVibeMelodic }
]

function search() {
  const parts = []
  if (selectedGenre.value) parts.push(selectedGenre.value)
  if (selectedVibe.value) parts.push(selectedVibe.value)
  if (artistInput.value) parts.push(artistInput.value)

  const query = parts.join(' ')
  if (query) {
    router.push({ path: '/search', query: { q: query } })
    emit('close')
  }
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold text-white">{{ t.guidedPrepareSet }}</h2>

    <!-- Genre Selection -->
    <div>
      <p class="mb-3 text-sm text-neutral-400">{{ t.flowWhatStyle }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="genre in genres"
          :key="genre"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm transition-colors"
          :class="selectedGenre === genre
            ? 'border-orange-500 bg-orange-500/20 text-orange-400'
            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'"
          @click="selectedGenre = selectedGenre === genre ? null : genre"
        >
          {{ genre }}
        </button>
      </div>
    </div>

    <!-- Vibe Selection -->
    <div>
      <p class="mb-3 text-sm text-neutral-400">
        {{ t.flowWhatVibe }}
        <span class="text-neutral-600">({{ t.flowVibeOptional }})</span>
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="vibe in vibes"
          :key="vibe.id"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm transition-colors"
          :class="selectedVibe === vibe.id
            ? 'border-orange-500 bg-orange-500/20 text-orange-400'
            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'"
          @click="selectedVibe = selectedVibe === vibe.id ? null : vibe.id"
        >
          {{ vibe.label }}
        </button>
      </div>
    </div>

    <!-- Artist Input -->
    <div>
      <p class="mb-3 text-sm text-neutral-400">{{ t.flowArtistInspiration }}</p>
      <input
        v-model="artistInput"
        type="text"
        :placeholder="t.flowArtistPlaceholder"
        class="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
      >
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <button
        type="button"
        class="flex-1 rounded-lg border border-neutral-700 py-2.5 text-neutral-400 transition-colors hover:bg-neutral-800"
        @click="emit('close')"
      >
        {{ t.flowSkip }}
      </button>
      <button
        type="button"
        :disabled="!selectedGenre"
        class="flex-1 rounded-lg bg-orange-500 py-2.5 font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        @click="search"
      >
        {{ t.flowSearch }}
      </button>
    </div>
  </div>
</template>

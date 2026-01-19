<script setup lang="ts">
/**
 * New Set Page - /set/new
 * Configuration form for creating a new DJ set
 */

import type { SetMood } from '~/types'

/* --- Meta --- */
definePageMeta({
  middleware: ['auth']
})

/* --- Composables --- */
const { t } = useI18n()
const { createSet, loading, error } = useSetBuilder()

/* --- State --- */
const form = reactive({
  name: '',
  genre: '',
  targetDuration: 60,
  mood: 'mixed' as SetMood,
  freeDownloadOnly: false
})

const genreSearch = ref('')
const showGenreDropdown = ref(false)
const genreInputRef = ref<HTMLInputElement | null>(null)

const genres = [
  'Dubstep',
  'House',
  'Techno',
  'Drum & Bass',
  'Trance',
  'Hardstyle',
  'Bass House',
  'Future Bass',
  'Trap',
  'Lo-Fi',
  'Ambient',
  'Progressive House'
]

const durations = [
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: '120 min', value: 120 }
]

const moods: { value: SetMood }[] = [
  { value: 'energetic' },
  { value: 'chill' },
  { value: 'progressive' },
  { value: 'mixed' }
]


/* --- Computed --- */
const isValid = computed(() => {
  return form.name.trim().length > 0 && form.genre.length > 0
})

const filteredGenres = computed(() => {
  if (!genreSearch.value) return genres
  const search = genreSearch.value.toLowerCase()
  return genres.filter(g => g.toLowerCase().includes(search))
})

/* --- Genre Methods --- */
function selectGenre(genre: string) {
  form.genre = genre
  genreSearch.value = genre
  showGenreDropdown.value = false
}

function onGenreInput() {
  showGenreDropdown.value = true
  // Si le texte ne correspond plus exactement à un genre, reset le genre sélectionné
  if (!genres.includes(genreSearch.value)) {
    form.genre = ''
  }
}

function onGenreBlur() {
  // Délai pour permettre le clic sur une option
  setTimeout(() => {
    showGenreDropdown.value = false
  }, 200)
}

/* --- Methods --- */
async function handleSubmit() {
  if (!isValid.value || loading.value) return

  const result = await createSet({
    name: form.name.trim(),
    genre: form.genre,
    targetDuration: form.targetDuration,
    mood: form.mood,
    freeDownloadOnly: form.freeDownloadOnly
  })

  if (result) {
    navigateTo(`/set/${result.id}`)
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <main class="mx-auto w-full max-w-lg flex-1 px-4 py-8 md:px-6">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink
          to="/set"
          class="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          {{ t.setMySets }}
        </NuxtLink>
        <h1 class="text-2xl font-bold text-white">{{ t.setNewSet }}</h1>
      </div>

      <!-- Form -->
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Name -->
        <div>
          <label class="mb-2 block text-sm font-medium text-neutral-300">
            {{ t.setName }}
          </label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t.setNamePlaceholder"
            class="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-violet-500 focus:outline-none"
          >
        </div>

        <!-- Genre -->
        <div class="relative">
          <label class="mb-2 block text-sm font-medium text-neutral-300">
            {{ t.setGenre }}
          </label>
          <div class="relative">
            <input
              ref="genreInputRef"
              v-model="genreSearch"
              type="text"
              :placeholder="t.setGenrePlaceholder"
              class="w-full rounded-lg border bg-neutral-800/50 px-4 py-3 text-white placeholder-neutral-500 focus:outline-none"
              :class="form.genre ? 'border-violet-500' : 'border-neutral-700 focus:border-violet-500'"
              autocomplete="off"
              @input="onGenreInput"
              @focus="showGenreDropdown = true"
              @blur="onGenreBlur"
            >
            <UIcon
              v-if="form.genre"
              name="i-heroicons-check-circle-solid"
              class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-500"
            />
            <UIcon
              v-else
              name="i-heroicons-chevron-down"
              class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500"
            />
          </div>
          <!-- Dropdown -->
          <div
            v-if="showGenreDropdown && filteredGenres.length > 0"
            class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-800 shadow-xl"
          >
            <button
              v-for="genre in filteredGenres"
              :key="genre"
              type="button"
              class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-700"
              :class="form.genre === genre ? 'bg-violet-500/20 text-violet-400' : 'text-neutral-300'"
              @mousedown.prevent="selectGenre(genre)"
            >
              {{ genre }}
              <UIcon v-if="form.genre === genre" name="i-heroicons-check" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Duration -->
        <div>
          <label class="mb-2 block text-sm font-medium text-neutral-300">
            {{ t.setDuration }}
          </label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="dur in durations"
              :key="dur.value"
              type="button"
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-all"
              :class="form.targetDuration === dur.value
                ? 'border-violet-500 bg-violet-500/20 text-violet-400'
                : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600'"
              @click="form.targetDuration = dur.value"
            >
              {{ dur.label }}
            </button>
          </div>
        </div>

        <!-- Mood -->
        <div>
          <label class="mb-2 block text-sm font-medium text-neutral-300">
            {{ t.setMood }}
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="mood in moods"
              :key="mood.value"
              type="button"
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-all"
              :class="form.mood === mood.value
                ? 'border-violet-500 bg-violet-500/20 text-violet-400'
                : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600'"
              @click="form.mood = mood.value"
            >
              {{ mood.value === 'energetic' ? t.setMoodEnergetic :
                 mood.value === 'chill' ? t.setMoodChill :
                 mood.value === 'progressive' ? t.setMoodProgressive : t.setMoodMixed }}
            </button>
          </div>
        </div>

        <!-- Free Download Only -->
        <label class="flex cursor-pointer items-center gap-3">
          <input
            v-model="form.freeDownloadOnly"
            type="checkbox"
            class="h-5 w-5 rounded border-neutral-600 bg-neutral-800 text-violet-500 focus:ring-violet-500"
          >
          <span class="text-neutral-300">{{ t.setFreeOnly }}</span>
        </label>

        <!-- Error -->
        <div v-if="error" class="rounded-lg border border-red-500/30 bg-red-900/10 p-3 text-sm text-red-400">
          {{ error }}
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="!isValid || loading"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UIcon v-if="loading" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
          <span>{{ t.setStartCreation }}</span>
          <UIcon name="i-heroicons-arrow-right" class="h-5 w-5" />
        </button>
      </form>
    </main>
  </div>
</template>

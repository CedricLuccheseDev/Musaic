<script setup lang="ts">
import { placeholderPhrases, getRandomPrompts } from '~/config/search'
import type { SearchHistoryEntry } from '~/composables/useSearchHistory'

/* --- Props --- */
const props = withDefaults(defineProps<{
  size?: 'default' | 'large'
  loading?: boolean
  recentSearches?: SearchHistoryEntry[]
  showSuggestions?: boolean
}>(), {
  size: 'default',
  loading: false,
  recentSearches: () => [],
  showSuggestions: true
})

/* --- Emits --- */
const emit = defineEmits<{
  search: []
  'suggestion-click': [query: string]
}>()

/* --- States --- */
const { t } = useI18n()
const searchInput = defineModel<string>('modelValue', { default: '' })
const animatedPlaceholder = ref('')
const isInputFocused = ref(false)
const showPanel = ref(false)
const suggestedPrompts = ref<string[]>([])
const popularGenres = ref<Array<{ name: string; count: number }>>([])
let animationTimeout: ReturnType<typeof setTimeout> | null = null

/* --- Computed --- */
const inputHeight = computed(() => props.size === 'large' ? 'h-14 md:h-16' : 'h-12')
const inputText = computed(() => props.size === 'large' ? 'text-base md:text-lg' : 'text-base')
const displayPlaceholder = computed(() => {
  if (isInputFocused.value || searchInput.value) return t.value.searchPlaceholder
  return animatedPlaceholder.value || t.value.searchPlaceholder
})

// Show panel when focused (always, even with input)
const shouldShowPanel = computed(() =>
  props.showSuggestions && showPanel.value
)

/* --- Methods --- */
function onSearch() {
  if (!searchInput.value.trim()) return
  showPanel.value = false
  emit('search')
}

function handleSuggestionClick(query: string) {
  searchInput.value = query
  showPanel.value = false
  emit('suggestion-click', query)
  emit('search')
}

function getRandomPhrase(): string {
  return placeholderPhrases[Math.floor(Math.random() * placeholderPhrases.length)]
}

function typeWriter(text: string, index: number, callback: () => void) {
  if (isInputFocused.value || searchInput.value) {
    animatedPlaceholder.value = ''
    return
  }
  if (index < text.length) {
    animatedPlaceholder.value = text.substring(0, index + 1)
    const delay = 50 + Math.random() * 80
    animationTimeout = setTimeout(() => typeWriter(text, index + 1, callback), delay)
  } else {
    animationTimeout = setTimeout(callback, 2000)
  }
}

function eraseText(callback: () => void) {
  if (isInputFocused.value || searchInput.value) {
    animatedPlaceholder.value = ''
    return
  }
  const text = animatedPlaceholder.value
  if (text.length > 0) {
    animatedPlaceholder.value = text.substring(0, text.length - 1)
    const delay = 30 + Math.random() * 40
    animationTimeout = setTimeout(() => eraseText(callback), delay)
  } else {
    animationTimeout = setTimeout(callback, 500)
  }
}

function startAnimation() {
  if (isInputFocused.value || searchInput.value) return
  const phrase = getRandomPhrase()
  typeWriter(phrase, 0, () => {
    eraseText(() => {
      startAnimation()
    })
  })
}

function stopAnimation() {
  if (animationTimeout) {
    clearTimeout(animationTimeout)
    animationTimeout = null
  }
  animatedPlaceholder.value = ''
}

function onFocus() {
  isInputFocused.value = true
  showPanel.value = true
  stopAnimation()
  // Refresh suggested prompts on focus
  suggestedPrompts.value = getRandomPrompts(4)
}

function onBlur() {
  isInputFocused.value = false
  // Delay hiding panel to allow click events on suggestions
  setTimeout(() => {
    if (!isInputFocused.value) {
      showPanel.value = false
    }
  }, 200)
  if (!searchInput.value) {
    startAnimation()
  }
}

async function fetchPopularGenres() {
  try {
    const { genres } = await $fetch<{ genres: Array<{ name: string; count: number }> }>('/api/genres/popular', {
      query: { limit: 8 }
    })
    popularGenres.value = genres
  } catch (err) {
    console.error('[SearchBar] Failed to fetch popular genres:', err)
  }
}

/* --- Watchers --- */
watch(searchInput, (val) => {
  if (val) {
    stopAnimation()
  } else if (!isInputFocused.value) {
    startAnimation()
  }
})

/* --- Lifecycle --- */
onMounted(() => {
  if (!searchInput.value) {
    setTimeout(startAnimation, 1000)
  }
  // Initialize prompts
  suggestedPrompts.value = getRandomPrompts(4)
  // Fetch popular genres
  fetchPopularGenres()
})

onUnmounted(() => {
  stopAnimation()
})
</script>

<template>
  <div class="relative flex w-full flex-col">
    <!-- Main search bar -->
    <div
      class="flex w-full items-center overflow-hidden rounded-2xl border border-neutral-700/50 bg-neutral-900/80 transition-all duration-200 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20"
      :class="{ 'rounded-b-none border-b-0': shouldShowPanel }"
    >
      <!-- Search icon -->
      <div class="flex items-center pl-3 md:pl-4">
        <UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5 text-neutral-500" />
      </div>

      <!-- Input -->
      <input
        v-model="searchInput"
        type="text"
        :placeholder="displayPlaceholder"
        class="min-w-0 flex-1 bg-transparent px-2 text-white placeholder-neutral-500 outline-none md:px-3"
        :class="[inputHeight, inputText]"
        @keyup.enter="onSearch"
        @focus="onFocus"
        @blur="onBlur"
      >

      <!-- Search button -->
      <UTooltip :text="t.search">
        <button
          type="button"
          class="search-btn group relative m-1.5 flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl p-2.5 text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
          :class="[
            size === 'large' ? 'md:p-3' : '',
            !loading && !searchInput ? 'opacity-50' : '',
            !loading && searchInput ? 'opacity-80 hover:opacity-100' : ''
          ]"
          :disabled="loading"
          @click="onSearch"
        >
          <!-- Animated gradient background -->
          <span class="absolute inset-0 bg-linear-to-r from-violet-600 via-purple-600 to-pink-600 transition-all duration-500" />
          <span class="absolute inset-0 bg-linear-to-r from-pink-600 via-fuchsia-600 to-violet-600 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          <!-- Shimmer effect -->
          <span class="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

          <!-- Glow effect -->
          <span class="absolute -inset-1 rounded-xl bg-linear-to-r from-violet-600 via-purple-600 to-pink-600 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-50" />

          <!-- Loading spinner -->
          <template v-if="loading">
            <div class="relative z-10 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </template>

          <!-- Icon -->
          <template v-else>
            <UIcon
              name="i-heroicons-sparkles"
              class="relative z-10 h-5 w-5 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110"
            />
          </template>
        </button>
      </UTooltip>
    </div>

    <!-- Suggestions Panel (Chat-like) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="shouldShowPanel"
        class="absolute left-0 right-0 top-full z-50 rounded-b-2xl border border-t-0 border-neutral-700/50 bg-neutral-900/95 px-4 pb-4 pt-3 backdrop-blur-xl"
      >
        <!-- Recent searches -->
        <div v-if="recentSearches.length" class="mb-4">
          <div class="mb-2 flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="h-3.5 w-3.5 text-neutral-500" />
            <span class="text-xs font-medium text-neutral-500">Récent</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="entry in recentSearches.slice(0, 5)"
              :key="entry.query"
              type="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-full bg-neutral-800/80 px-3 py-1.5 text-sm text-neutral-300 transition-all hover:bg-neutral-700 hover:text-white"
              @mousedown.prevent="handleSuggestionClick(entry.query)"
            >
              <UIcon
                :name="entry.queryType === 'url' ? 'i-heroicons-link' : entry.queryType === 'track' ? 'i-heroicons-musical-note' : 'i-heroicons-magnifying-glass'"
                class="h-3 w-3 text-neutral-500"
              />
              <span class="max-w-32 truncate">{{ entry.query }}</span>
            </button>
          </div>
        </div>

        <!-- Popular genres (dynamic from DB) -->
        <div v-if="popularGenres.length" class="mb-4">
          <div class="mb-2 flex items-center gap-2">
            <UIcon name="i-heroicons-musical-note" class="h-3.5 w-3.5 text-orange-400" />
            <span class="text-xs font-medium text-neutral-500">Genres populaires</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="genre in popularGenres"
              :key="genre.name"
              type="button"
              class="cursor-pointer rounded-full bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-300 transition-all hover:bg-orange-500/20 hover:text-orange-200"
              @mousedown.prevent="handleSuggestionClick(genre.name)"
            >
              {{ genre.name }}
            </button>
          </div>
        </div>

        <!-- Natural prompts (ChatGPT-style) -->
        <div>
          <div class="mb-2 flex items-center gap-2">
            <UIcon name="i-heroicons-sparkles" class="h-3.5 w-3.5 text-violet-400" />
            <span class="text-xs font-medium text-neutral-500">Essaie quelque chose comme...</span>
          </div>
          <div class="space-y-1.5">
            <button
              v-for="prompt in suggestedPrompts"
              :key="prompt"
              type="button"
              class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-300 transition-all hover:bg-violet-500/10 hover:text-violet-200"
              @mousedown.prevent="handleSuggestionClick(prompt)"
            >
              <UIcon name="i-heroicons-chat-bubble-left-ellipsis" class="h-4 w-4 shrink-0 text-violet-400/60" />
              <span>"{{ prompt }}"</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

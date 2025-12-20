<script setup lang="ts">
import { placeholderPhrases } from '~/config/search'

/* --- Props --- */
const props = withDefaults(defineProps<{
  size?: 'default' | 'large'
  loading?: boolean
}>(), {
  size: 'default',
  loading: false
})

/* --- Emits --- */
const emit = defineEmits<{
  search: []
}>()

/* --- States --- */
const { t } = useI18n()
const searchInput = defineModel<string>('modelValue', { default: '' })
const animatedPlaceholder = ref('')
const isInputFocused = ref(false)
let animationTimeout: ReturnType<typeof setTimeout> | null = null

/* --- Computed --- */
const inputHeight = computed(() => props.size === 'large' ? 'h-14 md:h-16' : 'h-12')
const inputText = computed(() => props.size === 'large' ? 'text-base md:text-lg' : 'text-base')
const displayPlaceholder = computed(() => {
  if (isInputFocused.value || searchInput.value) return t.value.searchPlaceholder
  return animatedPlaceholder.value || t.value.searchPlaceholder
})

/* --- Methods --- */
function onSearch() {
  if (!searchInput.value.trim()) return
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
  stopAnimation()
}

function onBlur() {
  isInputFocused.value = false
  if (!searchInput.value) {
    startAnimation()
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
  </div>
</template>

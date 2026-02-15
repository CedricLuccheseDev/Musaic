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

/* --- Models --- */
type FilterType = 'all' | 'free' | 'paid'
const searchInput = defineModel<string>('modelValue', { default: '' })
const activeFilter = defineModel<FilterType>('filter', { default: 'all' })

/* --- States --- */
const { t } = useI18n()
const animatedPlaceholder = ref('')
const isInputFocused = ref(false)
const textareaRef = ref<HTMLTextAreaElement>()
let animationTimeout: ReturnType<typeof setTimeout> | null = null

/* --- Computed --- */
const inputPadding = computed(() => props.size === 'large' ? 'py-3 md:py-4' : 'py-2.5')
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

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    onSearch()
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
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
    eraseText(() => startAnimation())
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
  nextTick(autoResize)
})

/* --- Lifecycle --- */
onMounted(() => {
  if (!searchInput.value) {
    setTimeout(startAnimation, 1000)
  }
  nextTick(autoResize)
})

onUnmounted(() => {
  stopAnimation()
})
</script>

<template>
  <div class="flex w-full flex-col overflow-hidden rounded-2xl border border-neutral-700/50 bg-neutral-900/80 transition-all duration-200 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20">
    <!-- Input row -->
    <div class="flex items-start">
      <textarea
        ref="textareaRef"
        v-model="searchInput"
        rows="1"
        :placeholder="displayPlaceholder"
        class="max-h-32 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 text-white placeholder-neutral-500 outline-none md:px-4"
        :class="[inputPadding, inputText]"
        @keydown="handleKeydown"
        @input="autoResize"
        @focus="onFocus"
        @blur="onBlur"
      />
    </div>

    <!-- Footer row -->
    <div class="flex items-center justify-between border-t border-neutral-800/50 px-2 py-1.5 md:px-3">
      <SearchFilters v-model:filter="activeFilter" />

      <UTooltip :text="t.search">
        <button
          type="button"
          class="search-btn group relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl p-2 text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
          :class="[
            size === 'large' ? 'md:p-2.5' : '',
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

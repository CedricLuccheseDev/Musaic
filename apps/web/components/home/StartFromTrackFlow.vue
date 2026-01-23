<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()

const emit = defineEmits<{
  close: []
}>()

const trackInput = ref('')
const isLoading = ref(false)

async function findSimilar() {
  if (!trackInput.value.trim()) return

  isLoading.value = true

  // Check if it's a SoundCloud URL
  if (trackInput.value.includes('soundcloud.com')) {
    // TODO: Resolve URL and find similar tracks
    router.push({ path: '/search', query: { q: trackInput.value } })
  } else {
    // Search for the track directly
    router.push({ path: '/search', query: { q: trackInput.value } })
  }

  emit('close')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-white">{{ t.flowStartFromTrack }}</h2>
      <p class="mt-1 text-sm text-neutral-400">{{ t.flowStartFromTrackDesc }}</p>
    </div>

    <div>
      <input
        v-model="trackInput"
        type="text"
        :placeholder="t.flowStartFromTrackPlaceholder"
        class="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
        @keydown.enter="findSimilar"
      >
    </div>

    <div class="flex gap-3">
      <button
        type="button"
        class="flex-1 rounded-lg border border-neutral-700 py-2.5 text-neutral-400 transition-colors hover:bg-neutral-800"
        @click="emit('close')"
      >
        {{ t.close }}
      </button>
      <button
        type="button"
        :disabled="!trackInput.trim() || isLoading"
        class="flex-1 rounded-lg bg-orange-500 py-2.5 font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        @click="findSimilar"
      >
        <span v-if="isLoading">...</span>
        <span v-else>{{ t.flowFindSimilar }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClarificationOption } from '~/server/services/aiQuery'

/* --- Props --- */
defineProps<{
  question: string
  options: ClarificationOption[]
  originalQuery?: string
}>()

/* --- Emits --- */
const emit = defineEmits<{
  select: [query: string]
  skip: []
}>()

/* --- Methods --- */
function handleSelect(option: ClarificationOption) {
  emit('select', option.query)
}

function handleSkip() {
  emit('skip')
}
</script>

<template>
  <section class="mt-6 rounded-xl border border-purple-500/20 bg-purple-900/10 p-4 md:p-6">
    <!-- Header with sparkle icon -->
    <div class="mb-4 flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
        <UIcon name="i-heroicons-sparkles" class="h-5 w-5 text-purple-400" />
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-medium text-white">
          {{ question }}
        </h3>
        <p class="mt-1 text-sm text-neutral-400">
          Clique sur une option pour affiner ta recherche
        </p>
      </div>
    </div>

    <!-- Options as clickable chips -->
    <div class="flex flex-wrap gap-3">
      <button
        v-for="option in options"
        :key="option.label"
        type="button"
        class="group cursor-pointer rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-left transition-all hover:border-purple-400/50 hover:bg-purple-500/20"
        @click="handleSelect(option)"
      >
        <span class="font-medium text-white transition-colors group-hover:text-purple-200">
          {{ option.label }}
        </span>
      </button>

      <!-- Skip / "Je ne sais pas" option -->
      <button
        type="button"
        class="group cursor-pointer rounded-xl border border-neutral-600/30 bg-neutral-800/50 px-4 py-3 text-left transition-all hover:border-neutral-500/50 hover:bg-neutral-700/50"
        @click="handleSkip"
      >
        <span class="font-medium text-neutral-400 transition-colors group-hover:text-neutral-300">
          Je ne sais pas
        </span>
      </button>
    </div>

    <!-- Tip -->
    <div class="mt-4 flex items-center gap-2 text-sm text-neutral-500">
      <UIcon name="i-heroicons-light-bulb" class="h-4 w-4" />
      <span>Tu peux aussi taper directement une recherche plus précise</span>
    </div>
  </section>
</template>

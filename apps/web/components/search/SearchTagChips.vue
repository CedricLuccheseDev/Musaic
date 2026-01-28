<script setup lang="ts">
/* --- Props --- */
defineProps<{
  popularGenres?: string[]
}>()

/* --- Emits --- */
const emit = defineEmits<{
  tagClick: [tag: string]
}>()

/* --- States --- */
const selectedTags = ref<Set<string>>(new Set())

/* --- Methods --- */
function toggleTag(tagId: string) {
  if (selectedTags.value.has(tagId)) {
    selectedTags.value.delete(tagId)
  } else {
    selectedTags.value.add(tagId)
  }
  selectedTags.value = new Set(selectedTags.value)
}

function isSelected(tagId: string): boolean {
  return selectedTags.value.has(tagId)
}

function handleGenreClick(genre: string) {
  toggleTag(genre)
  emit('tagClick', genre)
}
</script>

<template>
  <div v-if="popularGenres?.length" class="flex items-center gap-2">
    <span class="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
      Genre
    </span>
    <div class="flex flex-wrap gap-2 overflow-x-auto scrollbar-hide">
      <button
        v-for="genre in popularGenres"
        :key="genre"
        type="button"
        class="shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-all"
        :class="isSelected(genre)
          ? 'bg-violet-500 text-white'
          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'"
        @click="handleGenreClick(genre)"
      >
        {{ genre }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()

const emit = defineEmits<{
  close: []
}>()

const genres = [
  { name: 'Techno', subgenres: ['Dark Techno', 'Melodic Techno', 'Hard Techno', 'Minimal Techno'] },
  { name: 'House', subgenres: ['Deep House', 'Tech House', 'Progressive House', 'Afro House'] },
  { name: 'Trance', subgenres: ['Progressive Trance', 'Uplifting Trance', 'Psytrance', 'Tech Trance'] },
  { name: 'Drum & Bass', subgenres: ['Liquid DnB', 'Neurofunk', 'Jump Up', 'Jungle'] },
  { name: 'Dubstep', subgenres: ['Melodic Dubstep', 'Riddim', 'Brostep', 'Deep Dubstep'] },
  { name: 'Ambient', subgenres: ['Dark Ambient', 'Space Ambient', 'Drone', 'Chillout'] }
]

function selectGenre(genre: string) {
  router.push({ path: '/search', query: { q: genre } })
  emit('close')
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold text-white">{{ t.flowExploreGenre }}</h2>

    <div class="max-h-96 space-y-4 overflow-y-auto pr-2">
      <div v-for="genre in genres" :key="genre.name" class="space-y-2">
        <button
          type="button"
          class="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-left font-medium text-white transition-colors hover:border-orange-500/50 hover:bg-neutral-800"
          @click="selectGenre(genre.name)"
        >
          {{ genre.name }}
        </button>
        <div class="ml-4 flex flex-wrap gap-2">
          <button
            v-for="sub in genre.subgenres"
            :key="sub"
            type="button"
            class="rounded-full border border-neutral-700 px-3 py-1 text-sm text-neutral-400 transition-colors hover:border-orange-500/50 hover:text-white"
            @click="selectGenre(sub)"
          >
            {{ sub }}
          </button>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="w-full rounded-lg border border-neutral-700 py-2.5 text-neutral-400 transition-colors hover:bg-neutral-800"
      @click="emit('close')"
    >
      {{ t.close }}
    </button>
  </div>
</template>

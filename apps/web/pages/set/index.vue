<script setup lang="ts">
/**
 * Set List Page - /set
 * Displays user's DJ sets with create/duplicate/delete options
 */


/* --- Meta --- */
definePageMeta({
  middleware: ['auth']
})

/* --- Composables --- */
const { t } = useI18n()
const { isPremium } = useProfile()
const {
  sets,
  loading,
  error,
  fetchSets,
  deleteSet,
  duplicateSet,
  formatDuration
} = useSetBuilder()

/* --- State --- */
const searchQuery = ref('')
const showDeleteModal = ref(false)
const setToDelete = ref<{ id: string; name: string } | null>(null)

/* --- Computed --- */
const filteredSets = computed(() => {
  if (!searchQuery.value.trim()) return sets.value
  const query = searchQuery.value.toLowerCase()
  return sets.value.filter(
    s => s.name.toLowerCase().includes(query) ||
         s.genre?.toLowerCase().includes(query)
  )
})

const canCreateSet = computed(() => {
  return isPremium.value || sets.value.length < 1
})

/* --- Methods --- */
function handleCreateSet() {
  if (!canCreateSet.value) return
  navigateTo('/set/new')
}

function openSet(id: string) {
  navigateTo(`/set/${id}`)
}

async function handleDuplicate(id: string) {
  const result = await duplicateSet(id)
  if (result) {
    navigateTo(`/set/${result.id}`)
  }
}

function confirmDelete(set: { id: string; name: string }) {
  setToDelete.value = { id: set.id, name: set.name }
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!setToDelete.value) return
  await deleteSet(setToDelete.value.id)
  showDeleteModal.value = false
  setToDelete.value = null
}

/* --- Lifecycle --- */
onMounted(() => {
  fetchSets()
})
</script>

<template>
  <div class="flex flex-1 flex-col">
    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
      <!-- Header -->
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-bold text-white">{{ t.setMySets }}</h1>

        <!-- Search -->
        <div class="relative w-full sm:w-64">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t.search"
            class="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 py-2 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-violet-500 focus:outline-none"
          >
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-violet-400" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-xl border border-red-500/30 bg-red-900/10 p-6 text-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-2 h-8 w-8 text-red-400" />
        <p class="text-red-400">{{ error }}</p>
      </div>

      <!-- Sets Grid -->
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Create Set Card -->
        <button
          class="group relative flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all"
          :class="canCreateSet
            ? 'border-neutral-700 hover:border-violet-500 hover:bg-violet-500/5'
            : 'cursor-not-allowed border-neutral-800 opacity-50'"
          @click="handleCreateSet"
        >
          <div
            class="mb-3 flex h-14 w-14 items-center justify-center rounded-full transition-colors"
            :class="canCreateSet ? 'bg-neutral-800 group-hover:bg-violet-500/20' : 'bg-neutral-800'"
          >
            <UIcon
              name="i-heroicons-plus"
              class="h-7 w-7"
              :class="canCreateSet ? 'text-neutral-400 group-hover:text-violet-400' : 'text-neutral-600'"
            />
          </div>
          <span
            class="font-medium"
            :class="canCreateSet ? 'text-neutral-300 group-hover:text-white' : 'text-neutral-600'"
          >
            {{ t.setCreateSet }}
          </span>
          <span v-if="!canCreateSet" class="mt-2 text-xs text-neutral-500">
            {{ t.setPremiumLimit }}
          </span>
        </button>

        <!-- Set Cards -->
        <div
          v-for="set in filteredSets"
          :key="set.id"
          class="group relative flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/50 transition-all hover:border-neutral-700 hover:bg-neutral-900"
        >
          <!-- Artwork Mosaic -->
          <div
            class="relative aspect-video cursor-pointer overflow-hidden rounded-t-xl bg-neutral-800"
            @click="openSet(set.id)"
          >
            <div class="grid h-full w-full grid-cols-2 grid-rows-2">
              <div
                v-for="(artwork, i) in set.artworks"
                :key="i"
                class="overflow-hidden"
              >
                <img
                  v-if="artwork"
                  :src="artwork"
                  :alt="`Artwork ${i + 1}`"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
                  <UIcon name="i-heroicons-musical-note" class="h-6 w-6 text-neutral-600" />
                </div>
              </div>
            </div>

            <!-- Hover overlay -->
            <div class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <UIcon name="i-heroicons-play" class="h-12 w-12 text-white" />
            </div>
          </div>

          <!-- Content -->
          <div class="flex flex-1 flex-col p-4">
            <h3
              class="cursor-pointer truncate font-semibold text-white hover:text-violet-400"
              @click="openSet(set.id)"
            >
              {{ set.name }}
            </h3>
            <p class="mt-1 text-sm text-neutral-400">
              {{ set.genre || '-' }}
            </p>
            <div class="mt-auto flex items-center justify-between pt-3 text-xs text-neutral-500">
              <span>{{ set.trackCount }} {{ t.setTracks }}</span>
              <span>{{ formatDuration(set.totalDuration) }}</span>
            </div>
          </div>

          <!-- Context Menu -->
          <div class="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <UDropdownMenu
              :items="[[
                { label: t.setDuplicate, icon: 'i-heroicons-document-duplicate', onSelect: () => handleDuplicate(set.id) },
                { label: t.setDelete, icon: 'i-heroicons-trash', onSelect: () => confirmDelete({ id: set.id, name: set.name }) }
              ]]"
            >
              <button class="rounded-lg bg-black/50 p-2 backdrop-blur-xs hover:bg-black/70">
                <UIcon name="i-heroicons-ellipsis-horizontal" class="h-5 w-5 text-white" />
              </button>
            </UDropdownMenu>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="!loading && filteredSets.length === 0 && sets.length > 0"
          class="col-span-full py-12 text-center text-neutral-500"
        >
          {{ t.noResults }} "{{ searchQuery }}"
        </div>
      </div>

      <!-- Empty State (no sets at all) -->
      <div
        v-if="!loading && sets.length === 0"
        class="py-16 text-center"
      >
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-800">
          <UIcon name="i-heroicons-musical-note" class="h-10 w-10 text-neutral-600" />
        </div>
        <h3 class="text-lg font-medium text-neutral-300">{{ t.setNoSets }}</h3>
        <p class="mt-1 text-neutral-500">{{ t.setNoSetsDesc }}</p>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="rounded-2xl border border-neutral-800/50 bg-neutral-900 p-6">
          <h3 class="text-lg font-semibold text-white">{{ t.setDeleteConfirm }}</h3>
          <p class="mt-2 text-neutral-400">{{ t.setDeleteConfirmDesc }}</p>
          <p v-if="setToDelete" class="mt-2 font-medium text-white">{{ setToDelete.name }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button
              class="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
              @click="showDeleteModal = false"
            >
              {{ t.setCancel }}
            </button>
            <button
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              @click="handleDelete"
            >
              {{ t.setDelete }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

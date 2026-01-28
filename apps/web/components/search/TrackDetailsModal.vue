<script setup lang="ts">
import type { TrackEntry } from '~/types'
import { AnalysisStatus } from '~/types'

/* --- Props --- */
const props = defineProps<{
  track: TrackEntry
  open: boolean
}>()

/* --- Emits --- */
const emit = defineEmits<{
  close: []
}>()

/* --- Composables --- */
const { t } = useI18n()
const { formatKey, getKeyColor } = useKeyNotation()

/* --- Computed --- */
const isAnalyzed = computed(() => props.track.analysis_status === AnalysisStatus.Completed)
const isPending = computed(() => props.track.analysis_status === AnalysisStatus.Pending)
const isProcessing = computed(() => props.track.analysis_status === AnalysisStatus.Processing)
const isFailed = computed(() => props.track.analysis_status === AnalysisStatus.Failed)
</script>

<template>
  <UModal :open="open" @close="emit('close')">
    <template #content>
      <div class="bg-neutral-900">
        <!-- Header avec artwork -->
        <div class="relative">
          <div class="absolute inset-0 overflow-hidden">
            <img
              v-if="track.artwork"
              :src="track.artwork"
              :alt="track.title"
              class="h-full w-full object-cover opacity-30 blur-xl"
            >
          </div>
          <div class="relative flex items-center gap-4 p-4">
            <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl shadow-xl">
              <img
                v-if="track.artwork"
                :src="track.artwork"
                :alt="track.title"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
                <UIcon name="i-heroicons-musical-note" class="h-8 w-8 text-neutral-500" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-lg font-bold text-white">{{ track.title }}</h2>
              <p class="truncate text-sm text-neutral-300">{{ track.artist }}</p>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-full bg-black/30 p-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
              @click="emit('close')"
            >
              <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Not analyzed states -->
        <div v-if="!isAnalyzed" class="flex flex-col items-center justify-center p-8 text-center">
          <div v-if="isPending" class="text-neutral-400">
            <UIcon name="i-heroicons-clock" class="mx-auto mb-3 h-12 w-12" />
            <p>{{ t.analysisPending }}</p>
          </div>
          <div v-else-if="isProcessing" class="text-violet-400">
            <UIcon name="i-heroicons-arrow-path" class="mx-auto mb-3 h-12 w-12 animate-spin" />
            <p>{{ t.analysisProcessing }}</p>
          </div>
          <div v-else-if="isFailed" class="text-red-400">
            <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-3 h-12 w-12" />
            <p>{{ t.analysisFailed }}</p>
          </div>
          <div v-else class="text-neutral-500">
            <UIcon name="i-heroicons-chart-bar" class="mx-auto mb-3 h-12 w-12" />
            <p>{{ t.analysisNotAvailable }}</p>
          </div>
        </div>

        <!-- Analyzed content -->
        <div v-else class="p-4">
          <!-- BPM & Key - Big numbers -->
          <div class="mb-6 flex gap-4">
            <!-- BPM -->
            <div class="flex-1 text-center">
              <p class="text-3xl font-black text-white">{{ track.bpm_detected ? Math.round(track.bpm_detected) : '-' }}</p>
              <p class="text-xs font-medium uppercase tracking-wider text-violet-400">{{ t.analysisBpm }}</p>
            </div>

            <!-- Divider -->
            <div class="w-px bg-neutral-700" />

            <!-- Key -->
            <div class="flex-1 text-center">
              <p class="text-3xl font-black" :style="{ color: getKeyColor(track.key_detected) }">
                {{ formatKey(track.key_detected) }}
              </p>
              <p class="text-xs font-medium uppercase tracking-wider" :style="{ color: getKeyColor(track.key_detected) }">
                {{ t.analysisKey }}
              </p>
            </div>
          </div>

        </div>
      </div>
    </template>
  </UModal>
</template>

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

/* --- Methods --- */
function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return `${Math.round(value * 100)}%`
}

function getBarWidth(value: number | null): string {
  if (value === null || value === undefined) return '0%'
  return `${Math.round(value * 100)}%`
}
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

          <!-- Audio characteristics - Clean bars -->
          <div class="space-y-3">
            <!-- Energy -->
            <div v-if="track.energy !== null" class="group">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-neutral-400">{{ t.analysisEnergy }}</span>
                <span class="font-medium text-white">{{ formatPercent(track.energy) }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-blue-500 to-red-500 transition-all"
                  :style="{ width: getBarWidth(track.energy) }"
                />
              </div>
            </div>

            <!-- Danceability -->
            <div v-if="track.danceability !== null" class="group">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-neutral-400">{{ t.analysisDanceability }}</span>
                <span class="font-medium text-white">{{ formatPercent(track.danceability) }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                  :style="{ width: getBarWidth(track.danceability) }"
                />
              </div>
            </div>

            <!-- Valence (Mood) -->
            <div v-if="track.valence !== null" class="group">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-neutral-400">{{ t.analysisValence }}</span>
                <span class="font-medium text-white">{{ formatPercent(track.valence) }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-blue-400 to-yellow-400 transition-all"
                  :style="{ width: getBarWidth(track.valence) }"
                />
              </div>
            </div>

            <!-- Instrumentalness -->
            <div v-if="track.instrumentalness !== null" class="group">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-neutral-400">{{ t.analysisInstrumentalness }}</span>
                <span class="font-medium text-white">{{ formatPercent(track.instrumentalness) }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                <div
                  class="h-full rounded-full bg-cyan-500 transition-all"
                  :style="{ width: getBarWidth(track.instrumentalness) }"
                />
              </div>
            </div>
          </div>

          <!-- Additional info - Small chips -->
          <div class="mt-4 flex flex-wrap gap-2">
            <div v-if="track.loudness !== null" class="rounded-full bg-neutral-800 px-3 py-1 text-xs">
              <span class="text-neutral-400">{{ t.analysisLoudness }}:</span>
              <span class="ml-1 font-medium text-white">{{ track.loudness?.toFixed(1) }} dB</span>
            </div>
            <div v-if="track.liveness !== null && track.liveness > 0.7" class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
              {{ t.analysisLive }}
            </div>
            <div v-if="track.speechiness !== null && track.speechiness > 0.5" class="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-400">
              {{ t.analysisVocal }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

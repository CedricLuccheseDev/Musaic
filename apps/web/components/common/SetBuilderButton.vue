<script setup lang="ts">
/**
 * Set Builder Navigation Buttons
 * Two buttons for quick access to DJ sets: list and create
 */

/* --- Props --- */
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

/* --- Composables --- */
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- My Sets button -->
    <NuxtLink
      to="/set"
      class="flex items-center gap-1.5 rounded-full border border-neutral-700/50 bg-neutral-800/50 px-3 text-neutral-300 transition-all duration-200 hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white"
      :class="size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm'"
    >
      <UIcon name="i-heroicons-queue-list" :class="size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
      <span class="hidden sm:inline">{{ t.setMySets }}</span>
    </NuxtLink>

    <!-- Create Set button -->
    <NuxtLink
      to="/set/new"
      class="flex items-center gap-1.5 rounded-full border border-violet-500/50 bg-violet-500/10 px-3 font-medium text-violet-400 transition-all duration-200 hover:border-violet-400 hover:bg-violet-500/20 hover:text-violet-300"
      :class="size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm'"
    >
      <UIcon name="i-heroicons-plus" :class="size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
      <span class="hidden sm:inline">{{ t.setCreateSet }}</span>
    </NuxtLink>
  </div>
</template>

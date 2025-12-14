<script setup lang="ts">
/* --- States --- */
const { t } = useI18n()
const version = __APP_VERSION__
</script>

<template>
  <footer class="relative z-10 py-4 sm:py-6">
    <div class="flex flex-col items-center gap-2 sm:gap-3">
      <div class="flex items-center gap-2 sm:gap-4">
        <NuxtLink
          to="/how-it-works"
          class="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-neutral-500 transition-all hover:border-violet-500 hover:text-violet-400 sm:h-8 sm:w-8"
        >
          <UIcon name="i-heroicons-question-mark-circle" class="h-4 w-4 sm:h-5 sm:w-5" />
        </NuxtLink>
        <a
          href="https://clhub.fr"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-neutral-500 transition-colors duration-200 hover:text-violet-400 sm:text-sm"
        >
          {{ t.footer }}
        </a>
        <span class="text-[10px] text-neutral-600 sm:text-xs">v{{ version }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
/* --- States --- */
const { t } = useI18n()
</script>

<template>
  <footer class="relative z-10 py-6">
    <div class="flex flex-col items-center gap-3">
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/how-it-works"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 text-neutral-500 transition-all hover:border-violet-500 hover:text-violet-400"
        >
          <UIcon name="i-heroicons-question-mark-circle" class="h-5 w-5" />
        </NuxtLink>
        <a
          href="https://clhub.fr"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-neutral-500 transition-colors duration-200 hover:text-violet-400"
        >
          {{ t.footer }}
        </a>
      </div>
    </div>
  </footer>
</template>

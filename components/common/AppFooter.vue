<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="relative z-10 py-6 text-center">
    <a
      href="https://clhub.fr"
      target="_blank"
      rel="noopener noreferrer"
      class="text-sm text-neutral-500 transition-colors duration-200 hover:text-violet-400"
    >
      {{ t.footer }}
    </a>
  </footer>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

const { lang, toggleLang } = useI18n()
</script>

<template>
  <button
    type="button"
    class="flex cursor-pointer items-center gap-1 rounded-lg bg-neutral-800 font-medium text-neutral-400 transition-all duration-200 hover:bg-neutral-700 hover:text-white"
    :class="size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-2 text-sm'"
    @click="toggleLang"
  >
    <span :class="lang === 'fr' ? 'text-white' : 'text-neutral-500'">FR</span>
    <span class="text-neutral-600">/</span>
    <span :class="lang === 'en' ? 'text-white' : 'text-neutral-500'">EN</span>
  </button>
</template>

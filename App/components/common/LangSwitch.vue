<script setup lang="ts">
/* --- Props --- */
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

/* --- States --- */
const { lang, toggleLang } = useI18n()
</script>

<template>
  <button
    type="button"
    class="group relative flex cursor-pointer items-center overflow-hidden rounded-full border border-neutral-700/50 bg-neutral-800/50 transition-all duration-300 hover:border-violet-500/50"
    :class="size === 'sm' ? 'h-8 w-16 text-xs' : 'h-10 w-20 text-sm'"
    @click="toggleLang"
  >
    <!-- Sliding background -->
    <span
      class="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-violet-600 transition-all duration-300"
      :class="lang === 'fr' ? 'left-1' : 'left-[calc(50%+2px)]'"
    />

    <!-- FR -->
    <span
      class="relative z-10 flex flex-1 items-center justify-center font-medium transition-colors duration-300"
      :class="lang === 'fr' ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'"
    >
      FR
    </span>

    <!-- EN -->
    <span
      class="relative z-10 flex flex-1 items-center justify-center font-medium transition-colors duration-300"
      :class="lang === 'en' ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'"
    >
      EN
    </span>
  </button>
</template>

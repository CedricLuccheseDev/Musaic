<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()

defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    class="group flex flex-col items-center rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-center transition-all hover:border-orange-500/50 hover:bg-neutral-900"
    @click="$emit('select')"
  >
    <span class="mb-2 text-2xl">{{ icon }}</span>
    <span class="text-sm font-medium text-white">{{ title }}</span>
    <span class="mt-1 text-xs text-neutral-500">{{ description }}</span>
  </button>
</template>

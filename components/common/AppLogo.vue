<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md'
})

const sizeClasses = {
  sm: {
    icon: 'h-8 w-8 rounded-lg',
    note: 'h-4 w-4',
    text: 'text-lg',
    beta: 'text-[8px] px-1 py-0.5'
  },
  md: {
    icon: 'h-9 w-9 rounded-xl',
    note: 'h-5 w-5',
    text: 'text-xl',
    beta: 'text-[9px] px-1.5 py-0.5'
  },
  lg: {
    icon: 'h-10 w-10 rounded-xl md:h-14 md:w-14 md:rounded-2xl',
    note: 'h-6 w-6 md:h-8 md:w-8',
    text: 'text-4xl md:text-6xl',
    beta: 'text-xs md:text-sm px-2 py-1'
  }
}
</script>

<template>
  <div class="flex items-center gap-2 md:gap-3">
    <div
      class="flex items-center justify-center bg-linear-to-br from-violet-600 to-violet-800 shadow-xl shadow-violet-500/30"
      :class="sizeClasses[size].icon"
    >
      <UIcon name="i-heroicons-musical-note" class="text-white" :class="sizeClasses[size].note" />
    </div>
    <div class="flex items-center gap-1.5 md:gap-2">
      <span class="font-logo tracking-tight text-white" :class="sizeClasses[size].text">
        Mus<span class="text-ai-gradient">AI</span>c
      </span>
      <span
        class="rounded font-medium uppercase text-neutral-500"
        :class="sizeClasses[size].beta"
      >
        beta
      </span>
    </div>
  </div>
</template>

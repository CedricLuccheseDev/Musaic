<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

const { t } = useI18n()

// TODO: Replace with actual auth state
const isLoggedIn = ref(false)
</script>

<template>
  <div class="flex items-center gap-2">
    <template v-if="isLoggedIn">
      <!-- Profile button when logged in -->
      <button
        type="button"
        class="flex cursor-pointer items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 transition-all duration-200 hover:bg-neutral-700 hover:text-white"
        :class="size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'"
      >
        <UIcon name="i-heroicons-user" :class="size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'" />
      </button>
    </template>
    <template v-else>
      <!-- Login button -->
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 font-medium text-neutral-400 transition-all duration-200 hover:bg-neutral-700 hover:text-white"
        :class="size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'"
      >
        <UIcon name="i-heroicons-arrow-right-on-rectangle" :class="size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
        <span class="hidden sm:inline">{{ t.login }}</span>
      </button>
      <!-- Signup button -->
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-violet-600 font-medium text-white transition-all duration-200 hover:bg-violet-500"
        :class="size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'"
      >
        <UIcon name="i-heroicons-user-plus" :class="size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'" />
        <span class="hidden sm:inline">{{ t.signup }}</span>
      </button>
    </template>
  </div>
</template>

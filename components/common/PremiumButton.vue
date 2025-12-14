<script setup lang="ts">
/* --- Props --- */
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

/* --- States --- */
const { user } = useAuth()
const { isPremium } = useSubscription()
const sizeClasses = {
  sm: {
    premiumBtn: 'h-8 px-2.5 gap-1',
    premiumIcon: 'h-3.5 w-3.5',
    badgeIcon: 'h-3 w-3'
  },
  md: {
    premiumBtn: 'h-10 px-3 gap-1.5',
    premiumIcon: 'h-4 w-4',
    badgeIcon: 'h-3.5 w-3.5'
  }
}
</script>

<template>
  <template v-if="user">
    <!-- Premium badge -->
    <NuxtLink
      v-if="isPremium"
      to="/subscription"
      class="flex cursor-pointer items-center gap-1 rounded-full bg-linear-to-r from-amber-500/20 to-amber-600/20 px-2.5 py-1 text-xs font-medium text-amber-400 transition-all hover:from-amber-500/30 hover:to-amber-600/30"
    >
      <UIcon name="i-heroicons-sparkles-solid" :class="sizeClasses[size].badgeIcon" />
      <span>Premium</span>
    </NuxtLink>
    <!-- Upgrade button -->
    <NuxtLink
      v-else
      to="/subscription"
      :class="[sizeClasses[size].premiumBtn, 'flex cursor-pointer items-center rounded-full bg-linear-to-r from-amber-500 to-amber-600 text-xs font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/30']"
    >
      <UIcon name="i-heroicons-sparkles" :class="sizeClasses[size].premiumIcon" />
    </NuxtLink>
  </template>
</template>

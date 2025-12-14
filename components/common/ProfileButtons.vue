<script setup lang="ts">
/* --- Props --- */
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

/* --- States --- */
const { t } = useI18n()
const { user, loading, signOut } = useAuth()
const { isPremium } = useSubscription()
const router = useRouter()
const sizeClasses = {
  sm: {
    wrapper: 'h-8 w-8',
    icon: 'h-4 w-4',
    premiumBtn: 'h-8 px-2.5 gap-1',
    premiumIcon: 'h-3.5 w-3.5',
    badgeIcon: 'h-3 w-3'
  },
  md: {
    wrapper: 'h-10 w-10',
    icon: 'h-5 w-5',
    premiumBtn: 'h-10 px-3 gap-1.5',
    premiumIcon: 'h-4 w-4',
    badgeIcon: 'h-3.5 w-3.5'
  }
}

/* --- Computed --- */
const dropdownItems = computed(() => [[
  { label: t.value.profileMenu, icon: 'i-heroicons-user', onSelect: () => router.push('/profile'), class: 'cursor-pointer' },
  { label: t.value.profileSignOut, icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: () => signOut(), class: 'cursor-pointer' }
]])
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Loading -->
    <div v-if="loading" :class="[sizeClasses[size].wrapper, 'flex items-center justify-center']">
      <UIcon name="i-heroicons-arrow-path" :class="[sizeClasses[size].icon, 'animate-spin text-neutral-500']" />
    </div>

    <!-- Logged in -->
    <template v-else-if="user">
      <!-- Premium badge or upgrade button -->
      <NuxtLink
        v-if="isPremium"
        to="/subscription"
        class="flex cursor-pointer items-center gap-1 rounded-full bg-linear-to-r from-amber-500/20 to-amber-600/20 px-2.5 py-1 text-xs font-medium text-amber-400 transition-all hover:from-amber-500/30 hover:to-amber-600/30"
      >
        <UIcon name="i-heroicons-sparkles-solid" :class="sizeClasses[size].badgeIcon" />
        <span>Premium</span>
      </NuxtLink>
      <NuxtLink
        v-else
        to="/subscription"
        :class="[sizeClasses[size].premiumBtn, 'flex cursor-pointer items-center rounded-full bg-linear-to-r from-amber-500 to-amber-600 text-xs font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/30']"
      >
        <UIcon name="i-heroicons-sparkles" :class="sizeClasses[size].premiumIcon" />
      </NuxtLink>

      <!-- Avatar with dropdown -->
      <UDropdownMenu :items="dropdownItems">
        <button
          type="button"
          :class="[sizeClasses[size].wrapper, 'relative cursor-pointer overflow-hidden rounded-full border-2 transition-all hover:border-violet-500', isPremium ? 'border-amber-500/50' : 'border-violet-500/50']"
        >
          <img
            v-if="user.user_metadata?.avatar_url"
            :src="user.user_metadata.avatar_url"
            :alt="user.user_metadata?.full_name || 'Avatar'"
            class="h-full w-full object-cover"
            referrerpolicy="no-referrer"
          >
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-violet-600 text-sm font-medium text-white"
          >
            {{ (user.email?.[0] || 'U').toUpperCase() }}
          </div>
        </button>
      </UDropdownMenu>
    </template>

    <!-- Not logged in: Icon button with tooltip -->
    <UTooltip v-else :text="t.tooltipLogin">
      <NuxtLink
        to="/login"
        :class="[sizeClasses[size].wrapper, 'flex cursor-pointer items-center justify-center rounded-full border-2 border-neutral-700/50 bg-neutral-800/50 text-neutral-400 transition-all duration-200 hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-400']"
      >
        <UIcon name="i-heroicons-user-circle" :class="sizeClasses[size].icon" />
      </NuxtLink>
    </UTooltip>
  </div>
</template>

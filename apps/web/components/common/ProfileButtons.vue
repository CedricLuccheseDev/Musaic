<script setup lang="ts">
/* --- Types --- */
interface DropdownItem {
  label: string
  icon: string
  onSelect: () => void
  class: string
}

/* --- Props --- */
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

/* --- Constants --- */
const sizeClasses = {
  sm: {
    wrapper: 'h-8 w-8',
    icon: 'h-4 w-4'
  },
  md: {
    wrapper: 'h-10 w-10',
    icon: 'h-5 w-5'
  }
}

/* --- Composables --- */
const { t } = useI18n()
const { user, loading, signOut } = useAuth()
const { isPremium, isAdmin } = useProfile()
const router = useRouter()
const config = useRuntimeConfig()
const isDev = config.public.isDev

/* --- States --- */
const imageError = ref(false)

/* --- Computed --- */
const hasAdminAccess = computed(() => isDev || isAdmin.value)

const dropdownItems = computed(() => {
  const items: DropdownItem[] = [
    { label: t.value.profileMenu, icon: 'i-heroicons-cog-6-tooth', onSelect: () => router.push('/settings'), class: 'cursor-pointer' }
  ]

  if (hasAdminAccess.value) {
    items.push({ label: 'Dashboard', icon: 'i-heroicons-chart-bar', onSelect: () => router.push('/dashboard'), class: 'cursor-pointer' })
  }

  items.push({ label: t.value.profileSignOut, icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: () => { signOut() }, class: 'cursor-pointer' })

  return [items]
})

const showAvatar = computed(() => user.value?.user_metadata?.avatar_url && !imageError.value)

/* --- Watchers --- */
watch(() => user.value?.id, () => {
  imageError.value = false
})
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Loading -->
    <div v-if="loading" :class="[sizeClasses[size].wrapper, 'flex items-center justify-center']">
      <UIcon name="i-heroicons-arrow-path" :class="[sizeClasses[size].icon, 'animate-spin text-neutral-500']" />
    </div>

    <!-- Logged in -->
    <template v-else-if="user">
      <!-- Avatar with dropdown -->
      <UDropdownMenu :items="dropdownItems">
        <button
          type="button"
          :class="[sizeClasses[size].wrapper, 'relative cursor-pointer overflow-hidden rounded-full border-2 transition-all hover:border-violet-500', isPremium ? 'border-amber-500/50' : 'border-violet-500/50']"
        >
          <img
            v-if="showAvatar"
            :src="user.user_metadata.avatar_url"
            :alt="user.user_metadata?.full_name || 'Avatar'"
            class="h-full w-full object-cover"
            referrerpolicy="no-referrer"
            loading="eager"
            @error="imageError = true"
          >
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-violet-600 text-sm font-medium text-white"
          >
            {{ (user.user_metadata?.soundcloud_username?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase() }}
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

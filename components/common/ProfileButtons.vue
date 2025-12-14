<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

const { t } = useI18n()
const { user, loading, signOut } = useAuth()

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

async function handleSignOut() {
  await signOut()
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" :class="[sizeClasses[size].wrapper, 'flex items-center justify-center']">
      <UIcon name="i-heroicons-arrow-path" :class="[sizeClasses[size].icon, 'animate-spin text-neutral-500']" />
    </div>

    <!-- Logged in: Avatar with dropdown -->
    <UDropdownMenu v-else-if="user" :items="[[{ label: 'Se déconnecter', icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: handleSignOut, class: 'cursor-pointer' }]]">
      <button
        type="button"
        :class="[sizeClasses[size].wrapper, 'cursor-pointer overflow-hidden rounded-full border-2 border-violet-500/50 transition-all hover:border-violet-500']"
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

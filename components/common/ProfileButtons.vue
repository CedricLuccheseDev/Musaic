<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

const { user, loading, signInWithGoogle, signOut } = useAuth()

const sizeClasses = {
  sm: {
    button: 'h-8 w-8',
    icon: 'h-4 w-4',
    avatar: 'h-8 w-8'
  },
  md: {
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
    avatar: 'h-10 w-10'
  }
}

function handleSignIn() {
  signInWithGoogle()
}

async function handleSignOut() {
  await signOut()
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" :class="[sizeClasses[size].button, 'flex items-center justify-center']">
      <UIcon name="i-heroicons-arrow-path" :class="[sizeClasses[size].icon, 'animate-spin text-neutral-500']" />
    </div>

    <!-- Logged in: Avatar with dropdown -->
    <UDropdownMenu v-else-if="user" :items="[[{ label: 'Se déconnecter', icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: handleSignOut, class: 'cursor-pointer' }]]">
      <button type="button" class="cursor-pointer overflow-hidden rounded-full ring-2 ring-violet-500/50 transition-all hover:ring-violet-500">
        <img
          v-if="user.user_metadata?.avatar_url"
          :src="user.user_metadata.avatar_url"
          :alt="user.user_metadata?.full_name || 'Avatar'"
          :class="[sizeClasses[size].avatar, 'object-cover']"
        >
        <div
          v-else
          :class="[sizeClasses[size].avatar, 'flex items-center justify-center bg-violet-600 text-white']"
        >
          {{ (user.email?.[0] || 'U').toUpperCase() }}
        </div>
      </button>
    </UDropdownMenu>

    <!-- Not logged in: Sign in button -->
    <button
      v-else
      type="button"
      class="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-all hover:bg-neutral-100"
      @click="handleSignIn"
    >
      <UIcon name="i-simple-icons-google" class="h-4 w-4" />
      <span class="hidden sm:inline">Connexion</span>
    </button>
  </div>
</template>

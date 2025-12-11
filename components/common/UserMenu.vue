<template>
  <div>
    <UButton
      v-if="!user"
      to="/login"
      variant="ghost"
      icon="i-heroicons-user"
    >
      Connexion
    </UButton>

    <UDropdown v-else :items="items">
      <UButton
        variant="ghost"
        icon="i-heroicons-user-circle"
      >
        {{ user.email }}
      </UButton>
    </UDropdown>
  </div>
</template>

<script setup lang="ts">
const { user, signOut } = useAuth()
const router = useRouter()

const handleSignOut = async () => {
  await signOut()
  router.push('/login')
}

const items = [
  [{
    label: 'Profil',
    icon: 'i-heroicons-user',
    click: () => router.push('/profile')
  }],
  [{
    label: 'Déconnexion',
    icon: 'i-heroicons-arrow-left-on-rectangle',
    click: handleSignOut
  }]
]
</script>

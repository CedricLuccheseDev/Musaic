<script setup lang="ts">
/* --- States --- */
const { init, loading } = useAuth()

/* --- Lifecycle --- */
onMounted(async () => {
  await init()
})

/* --- Provide --- */
provide('authLoading', loading)
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <DjPreview />
  </UApp>
</template>

<script setup lang="ts">
/* --- States --- */
const { init } = useAuth()

/* --- Lifecycle --- */
onMounted(() => {
  init()
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <SoundCloudPlayer />
  </UApp>
</template>

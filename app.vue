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
    <NuxtPage />
    <SoundCloudPlayer />
  </UApp>
</template>

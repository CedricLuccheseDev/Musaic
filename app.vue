<script setup lang="ts">
const { init } = useAuth()

onMounted(() => {
  init()
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>

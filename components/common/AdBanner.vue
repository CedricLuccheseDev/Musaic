<script setup lang="ts">
/* --- Props --- */
withDefaults(defineProps<{
  slot?: string
  format?: 'horizontal' | 'rectangle'
}>(), {
  slot: '',
  format: 'horizontal'
})

/* --- States --- */
const { isPremium } = useSubscription()
const config = useRuntimeConfig()
const adClient = config.public.adSenseClient || ''
</script>

<template>
  <div v-if="!isPremium && adClient" class="ad-banner my-4">
    <ins
      class="adsbygoogle"
      :style="format === 'horizontal' ? 'display:block' : 'display:inline-block;width:300px;height:250px'"
      :data-ad-client="adClient"
      :data-ad-slot="slot"
      :data-ad-format="format === 'horizontal' ? 'auto' : undefined"
      :data-full-width-responsive="format === 'horizontal' ? 'true' : undefined"
    />
  </div>
</template>

<style scoped>
.ad-banner {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0.75rem;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}
</style>

<script setup lang="ts">
/* --- States --- */
const route = useRoute()
const router = useRouter()

/* --- Computed --- */
const layoutMeta = computed(() => {
  const config = route.meta.layoutConfig as {
    showHeader?: boolean
    showFooter?: boolean
    stickyFooter?: boolean
    showBackButton?: boolean
    backButtonLink?: string
    hideLogo?: boolean
  } | undefined
  return config || {}
})

/* --- Methods --- */
function goBack() {
  router.back()
}
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-neutral-950 lg:p-8">
    <PageHeader
      v-if="layoutMeta.showHeader !== false"
      class="relative z-50"
      sticky
      :hide-logo="layoutMeta.hideLogo"
    >
      <template v-if="layoutMeta.showBackButton" #back>
        <component
          :is="layoutMeta.backButtonLink ? 'NuxtLink' : 'button'"
          :to="layoutMeta.backButtonLink"
          type="button"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-all hover:border-violet-500 hover:text-white"
          @click="!layoutMeta.backButtonLink && goBack()"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
        </component>
      </template>
    </PageHeader>

    <slot />

    <template v-if="layoutMeta.showFooter !== false">
      <div v-if="layoutMeta.stickyFooter" class="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-28 backdrop-blur-md" style="mask-image: linear-gradient(to top, black 0%, transparent 100%); -webkit-mask-image: linear-gradient(to top, black 0%, transparent 100%);" />
      <footer :class="layoutMeta.stickyFooter ? 'sticky bottom-0 z-20' : 'relative z-10'">
        <AppFooter />
      </footer>
    </template>
  </div>
</template>

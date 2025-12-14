<script setup lang="ts">
withDefaults(defineProps<{
  sticky?: boolean
}>(), {
  sticky: false
})
</script>

<template>
  <header
    class="z-50"
    :class="sticky ? 'sticky top-0 bg-neutral-950/90 backdrop-blur-xl' : 'relative'"
  >
    <!-- Desktop layout -->
    <div class="hidden md:grid md:grid-cols-3 md:items-start md:px-6 md:py-4">
      <!-- Left -->
      <div class="flex items-center justify-start">
        <slot name="left">
          <NuxtLink to="/" class="group transition-transform hover:scale-105">
            <AppLogo size="md" />
          </NuxtLink>
        </slot>
      </div>

      <!-- Center -->
      <div class="flex justify-center">
        <slot name="center" />
      </div>

      <!-- Right -->
      <div class="flex items-center justify-end gap-3">
        <slot name="right">
          <LangSwitch />
          <ProfileButtons />
        </slot>
      </div>
    </div>

    <!-- Mobile layout -->
    <div class="flex flex-col gap-3 px-4 py-3 md:hidden">
      <!-- Top row -->
      <div class="flex items-center justify-between">
        <slot name="left-mobile">
          <slot name="left">
            <NuxtLink to="/">
              <AppLogo size="sm" />
            </NuxtLink>
          </slot>
        </slot>
        <div class="flex items-center gap-2">
          <slot name="right-mobile">
            <LangSwitch size="sm" />
            <ProfileButtons size="sm" />
          </slot>
        </div>
      </div>

      <!-- Center row (mobile) -->
      <slot name="center-mobile">
        <slot name="center" />
      </slot>
    </div>
  </header>
</template>

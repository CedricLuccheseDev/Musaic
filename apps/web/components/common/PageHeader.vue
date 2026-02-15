<script setup lang="ts">
/* --- Props --- */
withDefaults(defineProps<{
  sticky?: boolean
  hideLogo?: boolean
}>(), {
  sticky: false,
  hideLogo: false
})
</script>

<template>
  <header
    class="z-50"
    :class="sticky ? 'sticky top-0 bg-neutral-950/90 backdrop-blur-xl' : 'relative'"
  >
    <!-- Desktop layout -->
    <div class="hidden md:grid md:grid-cols-3 md:items-center md:px-6 md:py-4">
      <!-- Left -->
      <div class="flex items-center justify-start gap-4">
        <slot name="back" />
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-90 -translate-x-2"
          enter-to-class="opacity-100 scale-100 translate-x-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-x-0"
          leave-to-class="opacity-0 scale-90 -translate-x-2"
          mode="out-in"
        >
          <slot v-if="!hideLogo" name="left">
            <div class="flex items-center gap-3">
              <NuxtLink to="/" class="group transition-transform hover:scale-105">
                <AppLogo size="md" />
              </NuxtLink>
              <!-- <PremiumButton /> -->
            </div>
          </slot>
          <div v-else />
        </Transition>
      </div>

      <!-- Center -->
      <div id="header-center-desktop" class="flex justify-center">
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-2"
          mode="out-in"
        >
          <slot name="center" />
        </Transition>
      </div>

      <!-- Right -->
      <div class="flex items-center justify-end gap-3">
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-90 translate-x-2"
          enter-to-class="opacity-100 scale-100 translate-x-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-x-0"
          leave-to-class="opacity-0 scale-90 translate-x-2"
          mode="out-in"
        >
          <slot name="right">
            <ProfileButtons />
          </slot>
        </Transition>
      </div>
    </div>

    <!-- Mobile layout -->
    <div class="flex flex-col gap-3 px-4 py-3 md:hidden">
      <!-- Top row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <slot name="back" />
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 scale-90 -translate-x-2"
            enter-to-class="opacity-100 scale-100 translate-x-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-x-0"
            leave-to-class="opacity-0 scale-90 -translate-x-2"
            mode="out-in"
          >
            <slot v-if="!hideLogo" name="left-mobile">
              <slot name="left">
                <NuxtLink to="/">
                  <AppLogo size="sm" />
                </NuxtLink>
              </slot>
            </slot>
            <div v-else />
          </Transition>
        </div>
        <div class="flex items-center gap-2">
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 scale-90 translate-x-2"
            enter-to-class="opacity-100 scale-100 translate-x-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-x-0"
            leave-to-class="opacity-0 scale-90 translate-x-2"
            mode="out-in"
          >
            <slot name="right-mobile">
              <ProfileButtons size="sm" />
            </slot>
          </Transition>
        </div>
      </div>

      <!-- Center row (mobile) -->
      <div id="header-center-mobile">
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-2"
          mode="out-in"
        >
          <slot name="center-mobile">
            <slot name="center" />
          </slot>
        </Transition>
      </div>
    </div>
  </header>
</template>

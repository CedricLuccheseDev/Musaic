<script setup lang="ts">
const { t } = useI18n()

const email = ref('')
const subject = ref('')
const message = ref('')
const sending = ref(false)
const sent = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!email.value || !subject.value || !message.value) return

  sending.value = true
  error.value = ''

  try {
    await $fetch('/api/issues', {
      method: 'POST',
      body: { email: email.value, subject: subject.value, message: message.value }
    })
    sent.value = true
    email.value = ''
    subject.value = ''
    message.value = ''
  } catch {
    error.value = t.value.contactError
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="mb-4 text-xl font-bold text-white">
      {{ t.contactTitle }}
    </h2>

    <div v-if="sent" class="flex flex-col items-center gap-3 py-4 text-center">
      <UIcon name="i-heroicons-check-circle" class="h-12 w-12 text-green-500" />
      <p class="text-sm text-neutral-300">{{ t.contactSent }}</p>
    </div>

    <form v-else class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <input
          v-model="email"
          type="email"
          :placeholder="t.contactEmail"
          required
          class="w-full rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-violet-500/50"
        >
      </div>

      <div>
        <input
          v-model="subject"
          type="text"
          :placeholder="t.contactSubject"
          required
          class="w-full rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-violet-500/50"
        >
      </div>

      <div>
        <textarea
          v-model="message"
          :placeholder="t.contactMessage"
          required
          rows="4"
          class="w-full resize-none rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-violet-500/50"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="sending"
        class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UIcon v-if="sending" name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin" />
        <UIcon v-else name="i-heroicons-paper-airplane" class="h-4 w-4" />
        <span>{{ t.contactSend }}</span>
      </button>
    </form>
  </div>
</template>

import { useLocalStorage } from '~/composables/utils/useLocalStorage'

interface Profile {
  id: string
  is_premium: boolean
  is_admin: boolean
  premium_until: string | null
}

interface AiUsage {
  count: number
  date: string
}

/* --- Constants --- */
const FREE_AI_LIMIT = 5

/* --- State --- */
const profile = ref<Profile | null>(null)
const loadingProfile = ref(false)

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

// Use shared localStorage utility
const aiUsageStorage = useLocalStorage<AiUsage>(
  'musaic_ai_usage',
  { count: 0, date: getTodayKey() },
  {
    validator: (value): value is AiUsage => {
      return (
        typeof value === 'object' &&
        value !== null &&
        'count' in value &&
        'date' in value &&
        typeof value.count === 'number' &&
        typeof value.date === 'string'
      )
    }
  }
)

function loadAiUsage() {
  const stored = aiUsageStorage.load()
  if (stored.date === getTodayKey()) {
    aiUsageStorage.value.value = stored
  } else {
    aiUsageStorage.value.value = { count: 0, date: getTodayKey() }
  }
}

function saveAiUsage() {
  aiUsageStorage.save()
}

export function useProfile() {
  /* --- Computed --- */
  const isPremium = computed(() => {
    if (!profile.value) return false
    if (!profile.value.is_premium) return false
    if (profile.value.premium_until) {
      return new Date(profile.value.premium_until) > new Date()
    }
    return profile.value.is_premium
  })

  const aiGenerationsLeft = computed(() => {
    const config = useRuntimeConfig()
    if (config.public.isDev) return Infinity
    if (isPremium.value) return Infinity
    loadAiUsage()
    return Math.max(0, FREE_AI_LIMIT - aiUsageStorage.value.value.count)
  })

  const canUseAi = computed(() => aiGenerationsLeft.value > 0)

  const isAdmin = computed(() => profile.value?.is_admin || false)

  /* --- Methods --- */
  async function fetchProfile(userId: string) {
    const supabase = useSupabase()
    if (!supabase || loadingProfile.value) return

    loadingProfile.value = true

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_premium, is_admin, premium_until')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({ id: userId })
          .select('id, is_premium, is_admin, premium_until')
          .single()

        if (newProfile) {
          profile.value = newProfile
        }
      } else if (data) {
        profile.value = data
      }
    } finally {
      loadingProfile.value = false
    }
  }

  function clearProfile() {
    profile.value = null
  }

  function incrementAiUsage() {
    loadAiUsage()
    aiUsageStorage.value.value = {
      count: aiUsageStorage.value.value.count + 1,
      date: getTodayKey()
    }
    saveAiUsage()
  }

  return {
    isPremium,
    isAdmin,
    canUseAi,
    aiGenerationsLeft,
    profile: readonly(profile),
    loadingProfile: readonly(loadingProfile),
    fetchProfile,
    clearProfile,
    incrementAiUsage
  }
}

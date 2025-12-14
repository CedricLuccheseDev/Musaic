interface Profile {
  id: string
  is_premium: boolean
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
const aiUsage = ref<AiUsage>({ count: 0, date: '' })

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

function loadAiUsage() {
  if (import.meta.server) return
  const stored = localStorage.getItem('musaic_ai_usage')
  if (stored) {
    const parsed = JSON.parse(stored) as AiUsage
    if (parsed.date === getTodayKey()) {
      aiUsage.value = parsed
    } else {
      aiUsage.value = { count: 0, date: getTodayKey() }
    }
  }
}

function saveAiUsage() {
  if (import.meta.server) return
  localStorage.setItem('musaic_ai_usage', JSON.stringify(aiUsage.value))
}

export function useSubscription() {
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
    if (isPremium.value) return Infinity
    loadAiUsage()
    return Math.max(0, FREE_AI_LIMIT - aiUsage.value.count)
  })

  const canUseAi = computed(() => aiGenerationsLeft.value > 0)

  /* --- Methods --- */
  async function fetchProfile(userId: string) {
    const supabase = useSupabase()
    if (!supabase || loadingProfile.value) return

    loadingProfile.value = true

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_premium, premium_until')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({ id: userId })
          .select('id, is_premium, premium_until')
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
    aiUsage.value = {
      count: aiUsage.value.count + 1,
      date: getTodayKey()
    }
    saveAiUsage()
  }

  return {
    isPremium,
    canUseAi,
    aiGenerationsLeft,
    profile: readonly(profile),
    loadingProfile: readonly(loadingProfile),
    fetchProfile,
    clearProfile,
    incrementAiUsage
  }
}

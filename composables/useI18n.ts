type Lang = 'fr' | 'en'

const translations = {
  fr: {
    // SearchBar
    searchPlaceholder: 'Rechercher...',
    searchPlaceholderTitle: 'Titre...',
    searchPlaceholderArtist: 'Artiste...',
    title: 'Titre',
    artist: 'Artiste',
    search: 'Rechercher',

    // Home
    tagline: 'Cherche et Télécharge tes tracks facilement, rapidement.',

    // Search results
    tracksBy: 'Tracks de',
    resultsFor: 'Résultats pour',
    result: 'résultat',
    results: 'résultats',
    total: 'au total',
    noResults: 'Aucun résultat pour',
    noFilterResults: 'Aucun résultat avec ce filtre',
    endOfResults: 'Fin des résultats',

    // Filters
    all: 'Tous',
    free: 'Gratuit',
    paid: 'Payant',

    // AI Search
    aiGenerating: 'Génération de la requête...',
    aiResults: 'Résultats IA',
    noAiResults: 'Aucun résultat trouvé',
    showSql: 'Voir la requête SQL',
    exit: 'Quitter',

    // TrackCard
    download: 'Télécharger',
    freeLink: 'Lien gratuit',
    buy: 'Acheter',

    // Auth
    login: 'Connexion',
    signup: 'Inscription',

    // Footer
    footer: '@ ClHub'
  },
  en: {
    // SearchBar
    searchPlaceholder: 'Search...',
    searchPlaceholderTitle: 'Title...',
    searchPlaceholderArtist: 'Artist...',
    title: 'Title',
    artist: 'Artist',
    search: 'Search',

    // Home
    tagline: 'Search and Download your tracks easily, quickly.',

    // Search results
    tracksBy: 'Tracks by',
    resultsFor: 'Results for',
    result: 'result',
    results: 'results',
    total: 'total',
    noResults: 'No results for',
    noFilterResults: 'No results with this filter',
    endOfResults: 'End of results',

    // Filters
    all: 'All',
    free: 'Free',
    paid: 'Paid',

    // AI Search
    aiGenerating: 'Generating query...',
    aiResults: 'AI Results',
    noAiResults: 'No results found',
    showSql: 'Show SQL query',
    exit: 'Exit',

    // TrackCard
    download: 'Download',
    freeLink: 'Free link',
    buy: 'Buy',

    // Auth
    login: 'Login',
    signup: 'Sign up',

    // Footer
    footer: '@ ClHub'
  }
} as const

const currentLang = ref<Lang>('fr')

export function useI18n() {
  const t = computed(() => translations[currentLang.value])

  function setLang(lang: Lang) {
    currentLang.value = lang
  }

  function toggleLang() {
    currentLang.value = currentLang.value === 'fr' ? 'en' : 'fr'
  }

  return {
    lang: currentLang,
    t,
    setLang,
    toggleLang
  }
}

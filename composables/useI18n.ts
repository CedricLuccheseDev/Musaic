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
    searching: 'Recherche en cours',
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

    // Tooltips
    tooltipDirectDownload: 'Télécharger gratuitement en MP3',
    tooltipFreeLink: 'Ouvrir le lien de téléchargement gratuit',
    tooltipBuy: 'Acheter ou obtenir ce track',
    tooltipMp3: 'Rechercher sur SoundCloudMP3',
    tooltipSoundcloud: 'Écouter sur SoundCloud',
    tooltipTrackPage: 'Aller à la page SoundCloud',
    tooltipArtistPage: 'Aller à la page artiste SoundCloud',

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
    searching: 'Searching',
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

    // Tooltips
    tooltipDirectDownload: 'Download free MP3',
    tooltipFreeLink: 'Open free download link',
    tooltipBuy: 'Buy or get this track',
    tooltipMp3: 'Search on SoundCloudMP3',
    tooltipSoundcloud: 'Listen on SoundCloud',
    tooltipTrackPage: 'Go to SoundCloud page',
    tooltipArtistPage: 'Go to artist SoundCloud page',

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

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
    noArtistDetected: 'Aucun artiste correspondant trouvé',
    artistMatchFuzzy: 'Correspondance approximative',

    // Download Section
    downloadSection: 'Téléchargements disponibles',
    downloadZip: 'Télécharger en ZIP',
    downloading: 'Téléchargement',
    externalLinks: 'Liens externes gratuits',

    // Filters
    all: 'Tous',
    free: 'Gratuit',
    paid: 'Payant',

    // AI Search
    aiGenerating: 'Génération de la requête...',
    aiResults: 'Résultats IA',
    noAiResults: 'Aucun résultat trouvé',
    aiNoMatch: 'L\'IA n\'a pas trouvé de correspondance dans notre base',
    showSql: 'Voir la requête SQL',
    exit: 'Quitter',
    aiLimitReached: 'Limite IA atteinte',
    aiLimitMessage: 'Tu as utilisé tes 5 recherches IA gratuites aujourd\'hui.',
    aiLimitCta: 'Passe Premium pour des recherches IA illimitées !',
    aiGenerationsLeft: 'recherches IA restantes',

    // TrackCard
    download: 'Télécharger',
    freeLink: 'Lien gratuit',
    buy: 'Acheter',
    close: 'Fermer',
    openInNewTab: 'Problème avec l\'iframe ?',
    openExternal: 'Ouvrir en externe',

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
    loginTitle: 'Bienvenue',
    loginSubtitle: 'Connecte-toi pour accéder à toutes les fonctionnalités',
    continueWithSoundCloud: 'Continuer avec SoundCloud',
    orContinueWith: 'ou continuer avec',
    termsNotice: 'En continuant, tu acceptes nos',
    termsLink: 'conditions d\'utilisation',
    tooltipLogin: 'Se connecter',

    // Terms modal
    termsTitle: 'Conditions d\'utilisation',
    termsClose: 'Fermer',
    termsIntro: 'En utilisant Musaic, vous acceptez les conditions suivantes :',
    termsSection1Title: 'Utilisation du service',
    termsSection1Content: 'Musaic est un moteur de recherche qui indexe du contenu audio disponible publiquement sur SoundCloud. Nous ne stockons pas les fichiers audio sur nos serveurs.',
    termsSection2Title: 'Contenu tiers',
    termsSection2Content: 'Tout le contenu audio est la propriété de ses créateurs respectifs. Les téléchargements sont uniquement disponibles lorsque l\'artiste les a explicitement autorisés sur SoundCloud.',
    termsSection3Title: 'Respect des droits d\'auteur',
    termsSection3Content: 'Les utilisateurs s\'engagent à respecter les droits d\'auteur et à n\'utiliser le contenu téléchargé qu\'à des fins personnelles et non commerciales.',
    termsSection4Title: 'Données personnelles',
    termsSection4Content: 'Nous collectons uniquement les données nécessaires à l\'authentification (email, nom). Aucune donnée n\'est partagée avec des tiers.',
    termsSection5Title: 'Modifications',
    termsSection5Content: 'Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements importants.',

    // Profile
    profileMenu: 'Profil',
    preferencesMenu: 'Préférences',
    keyNotation: 'Notation des tonalités',
    keyNotationStandard: 'Standard (Am, F#, C)',
    keyNotationCamelot: 'Camelot (8A, 11A, 8B)',
    language: 'Langue',
    languageFrench: 'Français',
    languageEnglish: 'English',
    profileProvider: 'Connexion via',
    profileMemberSince: 'Membre depuis',
    profileSignOut: 'Se déconnecter',
    profileBack: 'Retour',
    profileSubscription: 'Abonnement',
    profileCurrentPlan: 'Plan actuel',
    profilePremiumUntil: 'Premium jusqu\'au',
    profileHistory: 'Historique',
    profileNoHistory: 'Aucun historique d\'abonnement',
    profileCancelSubscription: 'Annuler l\'abonnement',
    profileManageSubscription: 'Gérer l\'abonnement',

    // Contact
    contactTitle: 'Nous contacter',
    contactEmail: 'Ton email',
    contactSubject: 'Sujet',
    contactMessage: 'Message',
    contactSend: 'Envoyer',
    contactSent: 'Message envoyé ! Merci.',
    contactError: 'Erreur lors de l\'envoi',

    // Subscription
    subscriptionTitle: 'Abonnement',
    subscriptionSubtitle: 'Choisis le plan qui te correspond',
    planFree: 'Gratuit',
    planPremium: 'Premium',
    planFreePrice: '0€',
    planPremiumPrice: '4.99€',
    planPerMonth: '/mois',
    planForever: 'pour toujours',
    currentPlan: 'Plan actuel',
    upgradePlan: 'Passer Premium',
    featureSearch: 'Recherche de tracks',
    featureFreeDl: 'Suivi des Free DL',
    featureAds: 'Sans publicités',
    featureWithAds: 'Avec publicités',
    featureAiSearch: 'Recherche IA illimitée',
    featureAiLimited: '5 recherches IA/jour',
    included: 'Inclus',
    notIncluded: 'Non inclus',
    compareTitle: 'Comparaison détaillée',

    // How it works
    hiwTitle: 'Comment ça marche ?',
    hiwSubtitle: 'Découvre comment utiliser Musaic pour trouver et télécharger tes tracks préférés',
    hiwSearchTitle: 'Recherche classique',
    hiwSearchContent: 'Tape le nom d\'un artiste, d\'un track ou d\'un genre. Musaic interroge SoundCloud et affiche les résultats.',
    hiwSearchFree: 'Téléchargement gratuit activé par l\'artiste',
    hiwSearchLink: 'Lien externe de téléchargement',
    hiwSearchPaid: 'Track disponible à l\'achat',
    hiwAiTitle: 'Recherche IA',
    hiwAiContent: 'Notre IA comprend tes demandes en langage naturel et fouille notre base de données.',
    hiwAiExample1: '"Trouve-moi de la techno mélodique récente"',
    hiwAiExample2: '"Des tracks de drum and bass énergiques"',
    hiwAiExample3: '"Musique chill pour travailler"',
    hiwFiltersTitle: 'Filtres',
    hiwFiltersContent: 'Affine tes résultats : Tous, Gratuit ou Payant.',
    hiwPremiumTitle: 'Avantages Premium',
    hiwPremiumContent: 'Passe Premium pour profiter de tous les avantages.',
    hiwRespectTitle: 'Respect des artistes',
    hiwRespectContent: 'Musaic indexe uniquement le contenu public. Les téléchargements ne sont disponibles que lorsque l\'artiste les a autorisés.',
    hiwBack: 'Retour',

    // Footer
    footer: '@ ClHub',

    // Track Analysis Details
    analysisDetails: 'Détails',
    analysisTitle: 'Analyse audio',
    analysisNotAvailable: 'Analyse non disponible',
    analysisPending: 'Analyse en attente',
    analysisProcessing: 'Analyse en cours...',
    analysisFailed: 'Analyse échouée',
    analysisClose: 'Fermer',
    analysisBpm: 'BPM',
    analysisKey: 'Tonalité',

    // Similar tracks
    similarTo: 'Similaire à',
    similarTracks: 'Tracks similaires',
    similarSearching: 'Recherche de tracks similaires...',
    similarNotAnalyzed: 'Cette track n\'a pas encore été analysée',
    similarNoResults: 'Aucune track similaire trouvée',

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
    noArtistDetected: 'No matching artist found',
    artistMatchFuzzy: 'Fuzzy match',

    // Download Section
    downloadSection: 'Available downloads',
    downloadZip: 'Download as ZIP',
    downloading: 'Downloading',
    externalLinks: 'External free links',

    // Filters
    all: 'All',
    free: 'Free',
    paid: 'Paid',

    // AI Search
    aiGenerating: 'Generating query...',
    aiResults: 'AI Results',
    noAiResults: 'No results found',
    aiNoMatch: 'AI found no match in our database',
    showSql: 'Show SQL query',
    exit: 'Exit',
    aiLimitReached: 'AI limit reached',
    aiLimitMessage: 'You\'ve used your 5 free AI searches today.',
    aiLimitCta: 'Go Premium for unlimited AI searches!',
    aiGenerationsLeft: 'AI searches left',

    // TrackCard
    download: 'Download',
    freeLink: 'Free link',
    buy: 'Buy',
    close: 'Close',
    openInNewTab: 'Issue with iframe?',
    openExternal: 'Open externally',

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
    loginTitle: 'Welcome',
    loginSubtitle: 'Sign in to access all features',
    continueWithSoundCloud: 'Continue with SoundCloud',
    orContinueWith: 'or continue with',
    termsNotice: 'By continuing, you agree to our',
    termsLink: 'terms of service',
    tooltipLogin: 'Sign in',

    // Terms modal
    termsTitle: 'Terms of Service',
    termsClose: 'Close',
    termsIntro: 'By using Musaic, you agree to the following terms:',
    termsSection1Title: 'Service Usage',
    termsSection1Content: 'Musaic is a search engine that indexes publicly available audio content on SoundCloud. We do not store audio files on our servers.',
    termsSection2Title: 'Third-Party Content',
    termsSection2Content: 'All audio content is the property of its respective creators. Downloads are only available when the artist has explicitly authorized them on SoundCloud.',
    termsSection3Title: 'Copyright Compliance',
    termsSection3Content: 'Users agree to respect copyright and to use downloaded content only for personal, non-commercial purposes.',
    termsSection4Title: 'Personal Data',
    termsSection4Content: 'We only collect data necessary for authentication (email, name). No data is shared with third parties.',
    termsSection5Title: 'Changes',
    termsSection5Content: 'We reserve the right to modify these terms at any time. Users will be notified of significant changes.',

    // Profile
    profileMenu: 'Profile',
    preferencesMenu: 'Preferences',
    keyNotation: 'Key notation',
    keyNotationStandard: 'Standard (Am, F#, C)',
    keyNotationCamelot: 'Camelot (8A, 11A, 8B)',
    language: 'Language',
    languageFrench: 'Français',
    languageEnglish: 'English',
    profileProvider: 'Signed in with',
    profileMemberSince: 'Member since',
    profileSignOut: 'Sign out',
    profileBack: 'Back',
    profileSubscription: 'Subscription',
    profileCurrentPlan: 'Current plan',
    profilePremiumUntil: 'Premium until',
    profileHistory: 'History',
    profileNoHistory: 'No subscription history',
    profileCancelSubscription: 'Cancel subscription',
    profileManageSubscription: 'Manage subscription',

    // Contact
    contactTitle: 'Contact us',
    contactEmail: 'Your email',
    contactSubject: 'Subject',
    contactMessage: 'Message',
    contactSend: 'Send',
    contactSent: 'Message sent! Thank you.',
    contactError: 'Error sending message',

    // Subscription
    subscriptionTitle: 'Subscription',
    subscriptionSubtitle: 'Choose the plan that suits you',
    planFree: 'Free',
    planPremium: 'Premium',
    planFreePrice: '$0',
    planPremiumPrice: '$4.99',
    planPerMonth: '/month',
    planForever: 'forever',
    currentPlan: 'Current plan',
    upgradePlan: 'Upgrade to Premium',
    featureSearch: 'Track search',
    featureFreeDl: 'Free DL tracking',
    featureAds: 'Ad-free',
    featureWithAds: 'With ads',
    featureAiSearch: 'Unlimited AI search',
    featureAiLimited: '5 AI searches/day',
    included: 'Included',
    notIncluded: 'Not included',
    compareTitle: 'Detailed comparison',

    // How it works
    hiwTitle: 'How it works?',
    hiwSubtitle: 'Learn how to use Musaic to find and download your favorite tracks',
    hiwSearchTitle: 'Classic search',
    hiwSearchContent: 'Type an artist name, track or genre. Musaic queries SoundCloud and displays the results.',
    hiwSearchFree: 'Free download enabled by the artist',
    hiwSearchLink: 'External download link',
    hiwSearchPaid: 'Track available for purchase',
    hiwAiTitle: 'AI Search',
    hiwAiContent: 'Our AI understands your natural language requests and searches our database.',
    hiwAiExample1: '"Find me some recent melodic techno"',
    hiwAiExample2: '"Energetic drum and bass tracks"',
    hiwAiExample3: '"Chill music for working"',
    hiwFiltersTitle: 'Filters',
    hiwFiltersContent: 'Refine your results: All, Free or Paid.',
    hiwPremiumTitle: 'Premium benefits',
    hiwPremiumContent: 'Go Premium to enjoy all the benefits.',
    hiwRespectTitle: 'Respect for artists',
    hiwRespectContent: 'Musaic only indexes public content. Downloads are only available when the artist has authorized them.',
    hiwBack: 'Back',

    // Footer
    footer: '@ ClHub',

    // Track Analysis Details
    analysisDetails: 'Details',
    analysisTitle: 'Audio analysis',
    analysisNotAvailable: 'Analysis not available',
    analysisPending: 'Analysis pending',
    analysisProcessing: 'Analyzing...',
    analysisFailed: 'Analysis failed',
    analysisClose: 'Close',
    analysisBpm: 'BPM',
    analysisKey: 'Key',

    // Similar tracks
    similarTo: 'Similar to',
    similarTracks: 'Similar tracks',
    similarSearching: 'Searching for similar tracks...',
    similarNotAnalyzed: 'This track has not been analyzed yet',
    similarNoResults: 'No similar tracks found',

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

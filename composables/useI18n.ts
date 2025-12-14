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
    loginTitle: 'Bienvenue',
    loginSubtitle: 'Connecte-toi pour accéder à toutes les fonctionnalités',
    continueWithGoogle: 'Continuer avec Google',
    continueWithApple: 'Continuer avec Apple',
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
    profileMenu: 'Mon profil',
    profileProvider: 'Connexion via',
    profileMemberSince: 'Membre depuis',
    profileSignOut: 'Se déconnecter',
    profileBack: 'Retour',

    // Contact
    contactTitle: 'Nous contacter',
    contactEmail: 'Ton email',
    contactSubject: 'Sujet',
    contactMessage: 'Message',
    contactSend: 'Envoyer',
    contactSent: 'Message envoyé ! Merci.',
    contactError: 'Erreur lors de l\'envoi',

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
    loginTitle: 'Welcome',
    loginSubtitle: 'Sign in to access all features',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
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
    profileMenu: 'My profile',
    profileProvider: 'Signed in with',
    profileMemberSince: 'Member since',
    profileSignOut: 'Sign out',
    profileBack: 'Back',

    // Contact
    contactTitle: 'Contact us',
    contactEmail: 'Your email',
    contactSubject: 'Subject',
    contactMessage: 'Message',
    contactSend: 'Send',
    contactSent: 'Message sent! Thank you.',
    contactError: 'Error sending message',

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

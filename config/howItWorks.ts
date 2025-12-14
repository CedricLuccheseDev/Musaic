export interface HowItWorksSection {
  icon: string
  titleKey: string
  contentKey: string
  items?: { icon: string; textKey: string }[]
}

export const howItWorksSections: HowItWorksSection[] = [
  {
    icon: 'i-heroicons-magnifying-glass',
    titleKey: 'hiwSearchTitle',
    contentKey: 'hiwSearchContent',
    items: [
      { icon: 'i-heroicons-arrow-down-tray', textKey: 'hiwSearchFree' },
      { icon: 'i-heroicons-link', textKey: 'hiwSearchLink' },
      { icon: 'i-heroicons-currency-dollar', textKey: 'hiwSearchPaid' }
    ]
  },
  {
    icon: 'i-heroicons-sparkles',
    titleKey: 'hiwAiTitle',
    contentKey: 'hiwAiContent',
    items: [
      { icon: 'i-heroicons-chat-bubble-left-ellipsis', textKey: 'hiwAiExample1' },
      { icon: 'i-heroicons-chat-bubble-left-ellipsis', textKey: 'hiwAiExample2' },
      { icon: 'i-heroicons-chat-bubble-left-ellipsis', textKey: 'hiwAiExample3' }
    ]
  },
  {
    icon: 'i-heroicons-funnel',
    titleKey: 'hiwFiltersTitle',
    contentKey: 'hiwFiltersContent'
  },
  {
    icon: 'i-heroicons-star',
    titleKey: 'hiwPremiumTitle',
    contentKey: 'hiwPremiumContent',
    items: [
      { icon: 'i-heroicons-sparkles', textKey: 'featureAiSearch' },
      { icon: 'i-heroicons-no-symbol', textKey: 'featureAds' },
      { icon: 'i-heroicons-arrow-down-tray', textKey: 'featureFreeDl' }
    ]
  },
  {
    icon: 'i-heroicons-heart',
    titleKey: 'hiwRespectTitle',
    contentKey: 'hiwRespectContent'
  }
]

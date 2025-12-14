export interface PlanFeature {
  key: string
  free: boolean
  premium: boolean
  freeText?: string
}

export interface Plan {
  id: 'free' | 'premium'
  priceMonthly: number
  currency: string
  features: string[]
}

export const plans: Record<'free' | 'premium', Plan> = {
  free: {
    id: 'free',
    priceMonthly: 0,
    currency: 'EUR',
    features: [
      'featureSearch',
      'featureFreeDl'
    ]
  },
  premium: {
    id: 'premium',
    priceMonthly: 4.99,
    currency: 'EUR',
    features: [
      'featureSearch',
      'featureFreeDl',
      'featureAiSearch',
      'featureAds'
    ]
  }
}

export const comparisonFeatures: PlanFeature[] = [
  { key: 'featureSearch', free: true, premium: true },
  { key: 'featureFreeDl', free: true, premium: true },
  { key: 'featureAiSearch', free: false, premium: true, freeText: 'featureAiLimited' },
  { key: 'featureAds', free: false, premium: true }
]

export function formatPrice(price: number, currency: string, lang: string): string {
  if (price === 0) {
    return lang === 'fr' ? '0€' : '$0'
  }
  if (currency === 'EUR') {
    return `${price.toFixed(2).replace('.', ',')}€`
  }
  return `$${price.toFixed(2)}`
}

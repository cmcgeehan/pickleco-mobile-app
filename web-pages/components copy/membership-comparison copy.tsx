import React from 'react'
import { CheckCircle } from 'lucide-react'
import { useTranslations } from '../hooks/use-translations'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'

interface MembershipFeature {
  nameKey: string
  priceKey: string
  descriptionKey: string
  featureKeys: string[]
  dynamicPrice?: number | null
}

interface MembershipComparisonProps {
  memberships: MembershipFeature[]
  onMembershipSelect: (membershipType: string) => void
  isLoadingPricing?: boolean
}

export function MembershipComparison({ memberships = [], onMembershipSelect, isLoadingPricing = false }: MembershipComparisonProps) {
  const { t } = useTranslations()
  const router = useRouter()

  const handleButtonClick = (membership: MembershipFeature) => {
    if (membership.nameKey === 'payToPlayName') {
      router.push('/play' as Route)
    } else {
      console.log('Selecting membership type:', membership.nameKey)
      onMembershipSelect(membership.nameKey)
    }
  }

  const getButtonText = (membership: MembershipFeature) => {
    if (membership.nameKey === 'payToPlayName') {
      return t('membership', 'playNow')
    }
    return t('membership', 'choosePlan')
  }

  const formatPrice = (membership: MembershipFeature) => {
    console.log(`🔍 formatPrice called for ${membership.nameKey}:`, {
      nameKey: membership.nameKey,
      dynamicPrice: membership.dynamicPrice,
      priceKey: membership.priceKey
    })
    
    if (membership.nameKey === 'payToPlayName') {
      // Pay to Play shows static text
      const staticPrice = t('membership', membership.priceKey)
      console.log(`🔍 Pay to Play - using static price: ${staticPrice}`)
      return staticPrice
    }
    
    if (isLoadingPricing) {
      console.log(`🔍 Loading state - showing "Loading..."`)
      return 'Loading...'
    }
    
    if (membership.dynamicPrice !== null && membership.dynamicPrice !== undefined) {
      // Format dynamic price from database
      const dynamicPrice = `$${membership.dynamicPrice.toLocaleString()} mxn/month`
      console.log(`🔍 Using dynamic price: ${dynamicPrice}`)
      return dynamicPrice
    }
    
    // Fallback to static translation if no dynamic price
    const fallbackPrice = t('membership', membership.priceKey)
    console.log(`🔍 Fallback to static price: ${fallbackPrice}`)
    return fallbackPrice
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {memberships.map((membership, index) => {
        // Determine if this is the popular membership (Ultimate)
        const isPopular = membership.nameKey === 'ultimateName'
        
        return (
          <Card 
            key={index} 
            className={`relative ${isPopular ? "border-highlight border-2" : ""}`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-highlight text-primary px-4 py-1 rounded-full text-sm font-semibold">
                  {t('membership', 'mostPopular')}
                </span>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{t('membership', membership.nameKey)}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-primary">{formatPrice(membership)}</span>
                {membership.nameKey !== 'payToPlayName' && (
                  <div className="text-sm text-gray-500 mt-1">
                    {t('membership', 'perMonth')}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mt-4">{t('membership', membership.descriptionKey)}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-6">
                {membership.featureKeys.map((featureKey, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{t('membership', featureKey)}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className={`w-full ${isPopular ? "bg-highlight text-primary hover:bg-highlight/90" : ""}`}
                onClick={() => handleButtonClick(membership)}
              >
                {getButtonText(membership)}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

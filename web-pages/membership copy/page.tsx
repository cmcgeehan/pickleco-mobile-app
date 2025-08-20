'use client'

import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useAuthStore } from '@/contexts/auth'
import { MembershipComparison } from '@/components/membership-comparison'
import { HowMembershipsWork } from '@/components/membership-hero'
import { MembershipFAQ } from '@/components/membership-faq'
import { toast } from '@/components/ui/use-toast'
import { useTranslations } from '@/hooks/use-translations'
import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { EarlyBirdModalProvider } from '@/components/providers/early-bird-modal-provider'

const MEMBERSHIPS = [
  {
    nameKey: 'payToPlayName',
    priceKey: 'payToPlayPrice',
    descriptionKey: 'payToPlayDescription',
    featureKeys: [
      'payToPlayFeatureOpenPlay',
      'payToPlayFeatureLeaguePlay',
      'payToPlayFeatureReservations',
      'payToPlayFeatureLessons',
      'payToPlayFeatureClinics',
      'payToPlayFeatureGuestPasses',
      'payToPlayFeatureAccess'
    ]
  },
  {
    nameKey: 'standardName',
    priceKey: 'standardPrice',
    descriptionKey: 'standardDescription',
    featureKeys: [
      'standardFeatureOpenPlay',
      'standardFeatureLeaguePlay',
      'standardFeatureReservations',
      'standardFeatureLessons',
      'standardFeatureClinics',
      'standardFeatureGuestPasses',
      'standardFeatureAccess'
    ]
  },
  {
    nameKey: 'ultimateName',
    priceKey: 'ultimatePrice',
    descriptionKey: 'ultimateDescription',
    featureKeys: [
      'ultimateFeatureOpenPlay',
      'ultimateFeatureLeaguePlay',
      'ultimateFeatureReservations',
      'ultimateFeatureLessons',
      'ultimateFeatureClinics',
      'ultimateFeatureGuestPasses',
      'ultimateFeaturePreLaunch'
    ]
  }
]

const MEMBERSHIP_IDS = {
  standardName: 15,  // standard membership
  ultimateName: 1,   // ultimate membership
  payToPlayName: 16  // pay to play membership
}

// Map membership names to database names for pricing lookup
const MEMBERSHIP_NAME_MAP = {
  standardName: 'standard',
  ultimateName: 'ultimate',
  payToPlayName: 'pay_to_play'
}

export default function MembershipPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { t } = useTranslations()
  const { supabase } = useSupabase()
  const [membershipPricing, setMembershipPricing] = useState<Record<string, number>>({})
  const [isLoadingPricing, setIsLoadingPricing] = useState(true)

  // Fetch membership pricing from database
  useEffect(() => {
    const fetchMembershipPricing = async () => {
      if (!supabase) {
        console.log('🔍 No Supabase client available')
        return
      }
      
      try {
        setIsLoadingPricing(true)
        console.log('🔍 Fetching membership types from database...')
        
        const { data: membershipTypes, error } = await supabase
          .from('membership_types')
          .select('name, cost_mxn')
          .is('deleted_at', null)

        if (error) {
          console.error('Error fetching membership pricing:', error)
          return
        }

        console.log('🔍 Fetched membership types from database:', membershipTypes)

        // Create a map of membership names to prices
        const pricingMap: Record<string, number> = {}
        membershipTypes?.forEach(type => {
          if (type.name && type.cost_mxn !== null) {
            console.log(`🔍 Processing membership type: "${type.name}" with cost: ${type.cost_mxn}`)
            // Find the key that matches this membership name
            const key = Object.entries(MEMBERSHIP_NAME_MAP).find(([_, dbName]) => dbName === type.name)?.[0]
            if (key) {
              console.log(`🔍 Matched "${type.name}" to key: ${key}`)
              pricingMap[key] = type.cost_mxn
            } else {
              console.log(`🔍 No match found for "${type.name}" in MEMBERSHIP_NAME_MAP`)
              console.log(`🔍 Available keys in MEMBERSHIP_NAME_MAP:`, Object.values(MEMBERSHIP_NAME_MAP))
            }
          }
        })

        console.log('🔍 Final pricing map:', pricingMap)
        setMembershipPricing(pricingMap)
      } catch (error) {
        console.error('Error fetching membership pricing:', error)
      } finally {
        setIsLoadingPricing(false)
      }
    }

    fetchMembershipPricing()
  }, [supabase])

  const handleMembershipSelect = useCallback((membershipNameKey: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    const membershipId = MEMBERSHIP_IDS[membershipNameKey as keyof typeof MEMBERSHIP_IDS]
    if (!membershipId) {
      console.error('No membership ID found for type:', membershipNameKey)
      toast({
        title: 'Error',
        description: 'Invalid membership type selected',
        variant: 'destructive'
      })
      return
    }

    console.log('Selected membership:', { nameKey: membershipNameKey, id: membershipId })
    router.push(`/membership/checkout?id=${membershipId}` as Route)
  }, [router, user])

  // Create memberships with dynamic pricing
  const membershipsWithPricing = MEMBERSHIPS.map(membership => ({
    ...membership,
    dynamicPrice: membershipPricing[membership.nameKey] || null
  }))

  console.log('🔍 Final membershipsWithPricing:', membershipsWithPricing)
  console.log('🔍 Current membershipPricing state:', membershipPricing)

  return (
    <EarlyBirdModalProvider>
      <div>
        <HowMembershipsWork />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">{t('membership', 'title')}</h1>
          </div>
          <MembershipComparison 
            memberships={membershipsWithPricing}
            onMembershipSelect={handleMembershipSelect}
            isLoadingPricing={isLoadingPricing}
          />
        </div>
        <MembershipFAQ />
      </div>
    </EarlyBirdModalProvider>
  )
}


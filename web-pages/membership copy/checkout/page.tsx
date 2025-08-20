'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/contexts/auth'
import { PaymentSummary } from '@/components/payment-summary'
import { PolicyModal } from '@/components/policy-modal'
import { CheckoutModal } from '@/components/checkout-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useTranslations } from '@/hooks/use-translations'
import type { Route } from 'next'
import { useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import WaitlistModal from '@/components/waitlist-modal'
import { useSupabase } from '@/hooks/use-supabase'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

type MembershipTypeId = Database['public']['Tables']['membership_types']['Row']['id']

interface PaymentMethod {
  id: string
  last4: string
  brand: string
  exp_month: number
  exp_year: number
}

interface UserProfile {
  first_name: string
  last_name: string
  email: string
  role: string
}

interface Location {
  id: string
  name: string
  open: boolean
}

interface LocationResponse extends Location {
  created_at: string
  deleted_at: string | null
}

interface MembershipType {
  id: number // Changed from string to number
  name: string
  description: string
  cost_mxn: number
  stripe_product_id: string | null
  membership_event_discounts: Array<{
    discount_percentage: number
    event_types: { name: string }[]
  }>
}

export default function MembershipCheckoutPage() {
  // All hooks at the top, before any return
  const router = useRouter()
  const { user } = useAuthStore()
  const { t } = useTranslations()
  const searchParams = useSearchParams()
  const membershipIdParam = searchParams ? searchParams.get('id') : ''
  const membershipId = membershipIdParam ? parseInt(membershipIdParam, 10) : null;
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { supabase, isLoading: isSupabaseLoading } = useSupabase()
  const [membershipData, setMembershipData] = useState<MembershipType | null>(null)
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Extract membershipId from searchParams using the hook
  // const membershipIdParam = searchParams.get('id')
  // const membershipId = membershipIdParam ? parseInt(membershipIdParam, 10) : null;

  const fetchMembershipData = useCallback(async (membershipId: number) => {
    if (!supabase) {
      console.error('No Supabase client available')
      return
    }
    setIsFetchingData(true)
    try {
      // Fetch the membership type by ID
      const { data: membershipType, error } = await supabase
        .from('membership_types')
        .select(`
          id,
          name,
          description,
          cost_mxn,
          stripe_product_id,
          membership_event_discounts (
            discount_percentage,
            event_types (
              name
            )
          )
        `)
        .eq('id', membershipId)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) {
        throw error
      }
      if (!membershipType) {
        throw new Error('Membership type not found')
      }
      // No need to map event_types to a single object; keep as array
      setMembershipData(membershipType as MembershipType)
      return membershipType
    } catch (error) {
      throw error
    } finally {
      setIsFetchingData(false)
    }
  }, [supabase])

  // DEBUG: Log key state values
  console.log('[MembershipCheckoutPage] membershipId:', membershipId)
  console.log('[MembershipCheckoutPage] isLoading:', isLoading)
  console.log('[MembershipCheckoutPage] isSupabaseLoading:', isSupabaseLoading)
  console.log('[MembershipCheckoutPage] supabase:', supabase)

  useEffect(() => {
    console.log('[MembershipCheckoutPage] useEffect triggered', {
      membershipId,
      isSupabaseLoading,
      supabaseExists: !!supabase
    })
    if (isSupabaseLoading) return;
    if (!supabase) {
      setFetchError('No Supabase client available')
      setIsLoading(false)
      toast({
        title: t('common', 'error'),
        description: t('common', 'unexpectedError'),
        variant: "destructive"
      })
      return;
    }
    if (membershipId && !isNaN(membershipId)) {
      setIsLoading(true)
      fetchMembershipData(membershipId)
        .catch((err) => {
          setFetchError('Membership fetch error: ' + (err?.message || String(err)))
          toast({
            title: t('common', 'error'),
            description: t('membership', 'invalidMembershipType'),
            variant: "destructive"
          })
          router.push('/membership' as Route)
        })
        .finally(() => setIsLoading(false))
    } else {
      setFetchError('Invalid membershipId in URL')
      setIsLoading(false)
      toast({
        title: t('common', 'error'),
        description: t('membership', 'invalidMembershipType'),
        variant: "destructive"
      })
      router.push('/membership' as Route)
    }
  }, [membershipId, fetchMembershipData, isSupabaseLoading, supabase, t, router])

  const fetchUserData = React.useCallback(async () => {
    if (!user?.id || !supabase) {
      return
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        throw new Error(sessionError?.message || 'No active session')
      }

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, open, created_at, deleted_at')
        .is('deleted_at', null)
        .order('name')
        .returns<LocationResponse[]>()

      if (locationsError) {
        console.error('Locations error:', locationsError)
        throw new Error('Failed to fetch locations: ' + locationsError.message)
      }

      setLocations(locationsData?.map((loc: LocationResponse) => ({
        id: String(loc.id),
        name: String(loc.name),
        open: Boolean(loc.open)
      })) || [])

      const response = await fetch(`/api/membership/user-data?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch user data')
      }
      
      const data = await response.json()
      if (!data.profile) {
        throw new Error('No profile data received')
      }

              setUserProfile(data.profile as unknown as UserProfile)
      setPaymentMethods(data.paymentMethods || [])
      
      // Set the first payment method as default if available
      if (data.paymentMethods?.length > 0) {
        setSelectedPaymentMethod(data.paymentMethods[0].id)
      } else {
        setSelectedPaymentMethod(undefined)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast({
        title: t('membership', 'error'),
        description: error instanceof Error ? error.message : t('membership', 'errorLoadingUser'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, supabase, t])

  useEffect(() => {
    let mounted = true
    const client = supabase

    if (client && mounted) {
      fetchUserData()
    }

    return () => {
      mounted = false
    }
  }, [supabase, user?.id, fetchUserData])

  // In the MembershipCheckoutPage component, after locations are loaded, set default location to Polanco if present
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      const polanco = locations.find(loc => loc.name.toLowerCase().includes('polanco'))
      if (polanco) {
        setSelectedLocation(polanco.id)
      }
    }
  }, [locations, selectedLocation])

  const handleProceedToPayment = () => {
    if (!selectedLocation) {
      toast({
        title: t('membership', 'error'),
        description: t('membership', 'selectLocationRequired'),
        variant: 'destructive',
      })
      return
    }

    if (!membershipData) {
      toast({
        title: t('membership', 'error'),
        description: t('membership', 'membershipDataRequired'),
        variant: 'destructive',
      })
      return
    }

    // Verify user has completed required profile information
    if (!userProfile?.first_name || !userProfile?.last_name) {
      toast({
        title: t('membership', 'error'),
        description: t('membership', 'completeProfileRequired'),
        variant: 'destructive',
      })
      router.push('/account' as Route)
      return
    }

    setShowCheckout(true)
  }

  const handlePolicyAccepted = async () => {
    setShowPolicyModal(false)
    setShowCheckout(true)
  }

  const handlePaymentSuccess = async () => {
    try {
      // Only show toast and redirect, do not call /api/membership/activate here
      toast({
        title: t('membership', 'success'),
        description: t('membership', 'welcomeMessage'),
      })
      router.push('/account' as Route)
    } catch (error) {
      console.error('Error updating membership:', error)
      toast({
        title: t('membership', 'error'),
        description: error instanceof Error ? error.message : t('membership', 'errorActivating'),
        variant: 'destructive',
      })
    }
  }

  // Render loading spinner as part of main return, after all hooks
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin w-8 h-8 text-primary mb-4" />
        <span>{t('membership', 'loadingMembership')}</span>
        {fetchError && (
          <div className="mt-4 p-4 bg-red-100 text-red-900 rounded">
            <strong>{t('common', 'error')}</strong>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{fetchError}</pre>
          </div>
        )}
      </div>
    )
  }
  // Show error if fetch failed and not loading
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-red-700 font-bold">Error: {fetchError}</span>
      </div>
    )
  }

  // Remove getMembershipBenefits and replace with static feature lists
  const getMembershipFeatures = () => {
    if (!membershipData) return []
    if (membershipData.name.toLowerCase() === 'standard') {
      return [
        t('membership', 'standardFeatureOpenPlay'),
        t('membership', 'standardFeatureLeaguePlay'),
        t('membership', 'standardFeatureReservations'),
        t('membership', 'standardFeatureLessons'),
        t('membership', 'standardFeatureClinics'),
        t('membership', 'standardFeatureGuestPasses'),
      ]
    }
    if (membershipData.name.toLowerCase() === 'ultimate') {
      return [
        t('membership', 'ultimateFeatureOpenPlay'),
        t('membership', 'ultimateFeatureLeaguePlay'),
        t('membership', 'ultimateFeatureReservations'),
        t('membership', 'ultimateFeatureLessons'),
        t('membership', 'ultimateFeatureClinics'),
        t('membership', 'ultimateFeatureGuestPasses'),
        t('membership', 'ultimateFeaturePreLaunch'),
      ]
    }
    return []
  }

  const getMembershipCost = () => {
    return membershipData?.cost_mxn || 0
  }

  const getStripeCost = () => {
    // Stripe expects amounts in cents/smallest currency unit
    return getMembershipCost() * 100
  }

  // If no locations are available, show the coming soon message
  if (locations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-6">
          {t('membership', 'earlyBirdTitle')}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>{t('membership', 'benefits')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <ul className="space-y-2">
                {getMembershipFeatures().map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center p-8 bg-muted rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">{t('common', 'comingSoon')}</h3>
              <p className="text-muted-foreground mb-6">We&apos;re setting up our locations. Check back soon!</p>
              <Button onClick={() => setShowWaitlist(true)}>{t('common', 'joinWaitlist')}</Button>
            </div>
          </CardContent>
        </Card>

        {showWaitlist && (
          <WaitlistModal
            location="Mexico City"
            locationId={typeof selectedLocation === 'string' && selectedLocation ? selectedLocation : '1'}
            userId={user?.id ? user.id : ''}
            onClose={() => setShowWaitlist(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('membership', 'checkoutTitle')}</h1>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Membership Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('membership', 'membershipSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ul className="space-y-2">
                    {getMembershipFeatures().map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Membership Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('membership', 'membershipDetails')}</CardTitle>
              </CardHeader>
              <CardContent>
                {locations.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-2">{t('membership', 'selectHomeLocation')}</h2>
                    <Select value={typeof selectedLocation === 'string' ? selectedLocation : ''} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('membership', 'selectLocationPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Select your preferred location. You can join even if the location isn&apos;t open yet - we&apos;ll activate your membership when it launches!
                    </p>
                  </div>
                )}
                <div className="mb-8">
                  <PaymentSummary 
                    amount={getMembershipCost()} 
                    description={t('membership', 'monthlyPayment')}
                  />
                </div>
                {paymentMethods.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('membership', 'savedPaymentMethods')}</h3>
                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`p-4 border rounded-lg cursor-pointer ${
                            selectedPaymentMethod === method.id ? 'border-primary' : ''
                          }`}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              {method.brand.toUpperCase()} •••• {method.last4}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t('membership', 'expires')} {method.exp_month}/{method.exp_year}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-8">
                  <Button 
                    variant="link" 
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => setShowPolicyModal(true)}
                  >
                    {t('membership', 'viewTerms')}
                  </Button>
                </div>
                <div className="flex justify-end pt-6">
                  <Button
                    onClick={handleProceedToPayment}
                    className="w-full"
                    disabled={
                      !selectedLocation ||
                      !membershipData ||
                      isLoading ||
                      !userProfile?.first_name ||
                      !userProfile?.last_name
                    }
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common', 'loading')}
                      </div>
                    ) : (
                      t('membership', 'proceedToPayment')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {showPolicyModal && (
        <PolicyModal
          isOpen={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
          _onAccept={handlePolicyAccepted}
          _userId={user?.id || ''}
        />
      )}

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        amount={getStripeCost()}
        onSuccess={handlePaymentSuccess}
        selectedPaymentMethod={selectedPaymentMethod || undefined}
        metadata={{
          userId: user?.id ?? '',
          type: 'membership',
          membershipType: membershipData?.name ?? '',
          locationId: selectedLocation ?? ''
        }}
      />

      {showWaitlist && (
        <WaitlistModal
          location="Mexico City"
          locationId={typeof selectedLocation === 'string' && selectedLocation ? selectedLocation : '1'}
          userId={user?.id ? user.id : ''}
          onClose={() => setShowWaitlist(false)}
        />
      )}
    </div>
  )
}

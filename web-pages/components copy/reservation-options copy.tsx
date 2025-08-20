'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CourtReservationWizard } from '@/components/court-reservation-wizard'
import { useTranslations } from '@/hooks/use-translations'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/contexts/auth'
import { useSupabase } from '@/hooks/use-supabase'

export function ReservationOptions() {
  const [activeWizard, setActiveWizard] = useState<'court' | 'lesson' | null>('court')
  const { t } = useTranslations()
  const router = useRouter()
  const { user } = useAuthStore()
  const { supabase } = useSupabase()

  // Use a proper UUID format for the default location
  const defaultLocationId = "00000000-0000-0000-0000-000000000001"
  // For now, we'll pass null as userMembershipLocationId since we don't have membership data in the user type
  const userMembershipLocationId = null

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">{t("reservations", "makeReservation")}</h2>
      <div className="flex space-x-4 mb-8">
        <Button onClick={() => setActiveWizard('court')} variant="outline" disabled className="text-white">
          {t("reservations", "reserveCourt")} (coming soon)
        </Button>
        <Button onClick={() => setActiveWizard('lesson')} variant="outline" disabled>
          {t("common", "bookALesson")} (coming soon)
        </Button>
      </div>

      {activeWizard === 'court' && (
        <CourtReservationWizard 
          locationId={defaultLocationId}
          userMembershipLocationId={userMembershipLocationId}
          onClose={() => setActiveWizard(null)}
          supabase={supabase}
        />
      )}
    </div>
  )
}

export default ReservationOptions


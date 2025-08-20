'use client'

import * as React from 'react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslations } from '@/hooks/use-translations'
import { Database } from '@/types/supabase'
import { ScrollArea } from '@/components/ui/scroll-area'

type User = Database['public']['Tables']['users']['Row'] & {
  role: 'admin' | 'coach' | 'member' | 'guest'
}

interface WaiverModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
  user: User | null
}

export const WaiverModal: React.FC<WaiverModalProps> = ({ isOpen, onClose, onAccept, user }): JSX.Element => {
  const { t } = useTranslations()
  const [hasAgreed, setHasAgreed] = useState(false)

  const handleAccept = () => {
    if (hasAgreed) {
      onAccept()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('waiver', 'title')}</DialogTitle>
          <DialogDescription>
            Please read and accept the waiver to continue
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <div className="prose dark:prose-invert max-w-none">
            {t('waiver', 'content').split('\\n\\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </ScrollArea>
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="terms"
            checked={hasAgreed}
            onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('waiver', 'agreement')}
          </label>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('common', 'cancel')}
          </Button>
          <Button onClick={handleAccept} disabled={!hasAgreed}>
            {t('common', 'accept')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
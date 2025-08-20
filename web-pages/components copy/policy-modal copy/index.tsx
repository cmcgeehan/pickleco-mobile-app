import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  _onAccept: () => Promise<void>;
  _userId: string;
}

const PolicyModal = ({ isOpen, onClose, _onAccept }: PolicyModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            The Pickle Co. Membership Terms & Conditions
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 text-sm leading-relaxed">
          <p className="text-gray-700 mb-4">
            These Terms & Conditions govern all memberships, reservations, and participation at The Pickle Co. By purchasing or renewing a membership, you acknowledge that you have read, understood, and agreed to the following:
          </p>
          
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">1. Membership Terms & Renewals</h3>
            <p className="mb-3">Memberships are billed on an annual basis unless otherwise specified.</p>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Auto-Renewal & Consent:</h4>
                <p>Memberships auto-renew annually until cancelled. By purchasing, you authorize The Pickle Co. to charge the payment method on file for each renewal at the then-current rate, including any price changes communicated in advance. You can cancel at any time from your account or by contacting us. Cancellations requested less than 48 hours before the renewal date will be processed after the renewal charge; no refunds for partial periods.</p>
              </div>
              
              <div>
                <h4 className="font-medium">Pricing Changes at Renewal:</h4>
                <p>The Pickle Co. reserves the right to adjust membership pricing upon annual renewal. Any pricing changes will be communicated to members prior to the renewal date.</p>
              </div>
              
              <div>
                <h4 className="font-medium">Cancellation Policy:</h4>
                <p>Memberships may be cancelled at any time; however, cancellations requested less than 48 hours before the renewal date will be processed after the renewal charge has been applied.</p>
              </div>
              
              <div>
                <h4 className="font-medium">Payment Requirements:</h4>
                <p>All membership dues must be fully paid and up-to-date before a cancellation request can be processed.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">2. Refund Policy</h3>
            <div className="space-y-3">
              <p>The Pickle Co. does not provide refunds for membership fees, reservations, or event registrations once payment has been processed.</p>
              <p>Any exceptions to this policy will be solely at the discretion of The Pickle Co. and evaluated on a case-by-case basis.</p>
              <p>No credits, make-ups, or pro-rated adjustments will be issued for missed games, clinics, or programs, including late sign-ups, suspensions, or injuries.</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">3. Facility Rules & Conduct</h3>
            <p className="mb-3">To maintain a safe, respectful, and family-friendly environment:</p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Participation at Your Own Risk</h4>
                <p>All participants play at their own risk and are expected to act in a manner that is not reckless or harmful to others.</p>
              </div>
              
              <div>
                <h4 className="font-medium">Prohibited Items & Substances</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>No outside food or alcoholic beverages permitted.</li>
                  <li>No smoking, vaping, or use of tobacco products inside the facility.</li>
                  <li>Absolutely no guns, knives, or weapons of any kind are allowed.</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Sportsmanship</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Good sportsmanship is mandatory. No profanity, negative comments, or inappropriate behavior toward officials, players, coaches, or spectators will be tolerated.</li>
                  <li>Physical altercations, confrontations, or fighting will result in immediate removal from the facility.</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Children & Spectators</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Children under the age of 13 must be supervised by a parent or guardian at all times.</li>
                  <li>Non-participating children are not permitted on courts, fields, or in play areas.</li>
                  <li>Spectators are not permitted on courts at any time.</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Sports Equipment Use</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Sports equipment may only be used in designated play areas.</li>
                  <li>Kicking or throwing balls outside of play areas is prohibited.</li>
                  <li>The Pickle Co. reserves the right to confiscate equipment and escort violators from the facility.</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Dress Code</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Proper court shoes and appropriate athletic attire are required at all times.</li>
                  <li>Cut-off or ripped apparel is not permitted.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">4. Waivers & Liability</h3>
            <div className="space-y-3">
              <p>All participants must have a completed waiver on file (either electronically or in writing) before participating in any activity.</p>
              <p>Failure to complete a waiver will result in denial of participation.</p>
              <p>The Pickle Co. is not responsible for lost or stolen personal items anywhere inside or outside the facility.</p>
              <div>
                <h4 className="font-medium">Indemnity:</h4>
                <p>You agree to indemnify, defend, and hold harmless The Pickle Co., its owners, employees, coaches, contractors, and affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or related to your (or your guests&apos;/minors&apos; you supervise) use of the facility, participation in activities, violation of these Terms & Conditions, or violation of law, except to the extent caused by The Pickle Co.&apos;s gross negligence or willful misconduct.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">5. Programs & Scheduling</h3>
            <div className="space-y-3">
              <p>The Pickle Co. is not obligated to reschedule games or programs cancelled due to inclement weather but will make reasonable efforts to do so if the calendar permits.</p>
              <p>Participation in league or tournament play requires either:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>An official DUPR rating, or</li>
                <li>A club rating issued by The Pickle Co. pros (available for $500 MXN).</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">6. Media & Privacy</h3>
            <div className="space-y-3">
              <p>The Pickle Co. may operate security cameras that record video and audio for security purposes. Entry into the facility constitutes consent to being recorded.</p>
              <p>The Pickle Co. may take photographs or videos for promotional use. Entry into the facility constitutes consent to the use of your likeness in marketing materials.</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">7. Policy Changes</h3>
            <div className="space-y-3">
              <p>The Pickle Co. reserves the right to modify these Terms & Conditions at any time.</p>
              <p>Members will be required to review and accept revised terms in order to continue membership.</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-lg mb-3">8. Force Majeure & Closures</h3>
            <div className="space-y-3">
              <p>The Pickle Co. will not be liable for any delay, disruption, or failure to perform (including temporary or extended closure of the facility, cancellation of programs, or suspension of services) due to causes beyond its reasonable control, including but not limited to acts of God, natural disasters, severe weather, fire, flood, war, terrorism, civil unrest, labor disputes, government orders or restrictions, public health emergencies or pandemics, utility failures, or equipment breakdowns.</p>
              <p>In such events, The Pickle Co. may, at its sole discretion, offer rescheduling options or account credits where feasible; refunds are not required.</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="font-medium text-center">
              By completing your membership purchase, you agree to comply with all rules, policies, and procedures of The Pickle Co. as outlined above.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={_onAccept}>Accept Terms & Conditions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { PolicyModal }; 
import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface PolicyModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export default function PolicyModal({ visible, onClose, type }: PolicyModalProps) {
  const renderTermsContent = () => (
    <>
      <Text style={styles.intro}>
        These Terms & Conditions govern all memberships, reservations, and participation at The Pickle Co. By purchasing or renewing a membership, you acknowledge that you have read, understood, and agreed to the following:
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Membership Terms & Renewals</Text>
        <Text style={styles.paragraph}>
          Memberships are billed on an annual basis unless otherwise specified.
        </Text>
        
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Auto-Renewal & Consent:</Text>
          <Text style={styles.paragraph}>
            Memberships auto-renew annually until cancelled. By purchasing, you authorize The Pickle Co. to charge the payment method on file for each renewal at the then-current rate, including any price changes communicated in advance. You can cancel at any time from your account or by contacting us. Cancellations requested less than 48 hours before the renewal date will be processed after the renewal charge; no refunds for partial periods.
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Pricing Changes at Renewal:</Text>
          <Text style={styles.paragraph}>
            The Pickle Co. reserves the right to adjust membership pricing upon annual renewal. Any pricing changes will be communicated to members prior to the renewal date.
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Cancellation Policy:</Text>
          <Text style={styles.paragraph}>
            Memberships may be cancelled at any time; however, cancellations requested less than 48 hours before the renewal date will be processed after the renewal charge has been applied.
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Payment Requirements:</Text>
          <Text style={styles.paragraph}>
            All membership dues must be fully paid and up-to-date before a cancellation request can be processed.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Refund Policy</Text>
        <Text style={styles.paragraph}>
          The Pickle Co. does not provide refunds for membership fees, reservations, or event registrations once payment has been processed.
        </Text>
        <Text style={styles.paragraph}>
          Any exceptions to this policy will be solely at the discretion of The Pickle Co. and evaluated on a case-by-case basis.
        </Text>
        <Text style={styles.paragraph}>
          No credits, make-ups, or pro-rated adjustments will be issued for missed games, clinics, or programs, including late sign-ups, suspensions, or injuries.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Facility Rules & Conduct</Text>
        <Text style={styles.paragraph}>
          To maintain a safe, respectful, and family-friendly environment:
        </Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Participation at Your Own Risk</Text>
          <Text style={styles.paragraph}>
            All participants play at their own risk and are expected to act in a manner that is not reckless or harmful to others.
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Prohibited Items & Substances</Text>
          <Text style={styles.bulletPoint}>• No outside food or alcoholic beverages permitted.</Text>
          <Text style={styles.bulletPoint}>• No smoking, vaping, or use of tobacco products inside the facility.</Text>
          <Text style={styles.bulletPoint}>• Absolutely no guns, knives, or weapons of any kind are allowed.</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Sportsmanship</Text>
          <Text style={styles.bulletPoint}>• Good sportsmanship is mandatory. No profanity, negative comments, or inappropriate behavior toward officials, players, coaches, or spectators will be tolerated.</Text>
          <Text style={styles.bulletPoint}>• Physical altercations, confrontations, or fighting will result in immediate removal from the facility.</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Children & Spectators</Text>
          <Text style={styles.bulletPoint}>• Children under the age of 13 must be supervised by a parent or guardian at all times.</Text>
          <Text style={styles.bulletPoint}>• Non-participating children are not permitted on courts, fields, or in play areas.</Text>
          <Text style={styles.bulletPoint}>• Spectators are not permitted on courts at any time.</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Sports Equipment Use</Text>
          <Text style={styles.bulletPoint}>• Sports equipment may only be used in designated play areas.</Text>
          <Text style={styles.bulletPoint}>• Kicking or throwing balls outside of play areas is prohibited.</Text>
          <Text style={styles.bulletPoint}>• The Pickle Co. reserves the right to confiscate equipment and escort violators from the facility.</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Dress Code</Text>
          <Text style={styles.bulletPoint}>• Proper court shoes and appropriate athletic attire are required at all times.</Text>
          <Text style={styles.bulletPoint}>• Cut-off or ripped apparel is not permitted.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Waivers & Liability</Text>
        <Text style={styles.paragraph}>
          All participants must have a completed waiver on file (either electronically or in writing) before participating in any activity.
        </Text>
        <Text style={styles.paragraph}>
          Failure to complete a waiver will result in denial of participation.
        </Text>
        <Text style={styles.paragraph}>
          The Pickle Co. is not responsible for lost or stolen personal items anywhere inside or outside the facility.
        </Text>
        
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Indemnity:</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify, defend, and hold harmless The Pickle Co., its owners, employees, coaches, contractors, and affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to your (or your guests'/minors' you supervise) use of the facility, participation in activities, violation of these Terms & Conditions, or violation of law, except to the extent caused by The Pickle Co.'s gross negligence or willful misconduct.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Programs & Scheduling</Text>
        <Text style={styles.paragraph}>
          The Pickle Co. is not obligated to reschedule games or programs cancelled due to inclement weather but will make reasonable efforts to do so if the calendar permits.
        </Text>
        <Text style={styles.paragraph}>
          Participation in league or tournament play requires either:
        </Text>
        <Text style={styles.bulletPoint}>• An official DUPR rating, or</Text>
        <Text style={styles.bulletPoint}>• A club rating issued by The Pickle Co. pros (available for $500 MXN).</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Media & Privacy</Text>
        <Text style={styles.paragraph}>
          The Pickle Co. may operate security cameras that record video and audio for security purposes. Entry into the facility constitutes consent to being recorded.
        </Text>
        <Text style={styles.paragraph}>
          The Pickle Co. may take photographs or videos for promotional use. Entry into the facility constitutes consent to the use of your likeness in marketing materials.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Policy Changes</Text>
        <Text style={styles.paragraph}>
          The Pickle Co. reserves the right to modify these Terms & Conditions at any time.
        </Text>
        <Text style={styles.paragraph}>
          Members will be required to review and accept revised terms in order to continue membership.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Force Majeure & Closures</Text>
        <Text style={styles.paragraph}>
          The Pickle Co. will not be liable for any delay, disruption, or failure to perform (including temporary or extended closure of the facility, cancellation of programs, or suspension of services) due to causes beyond its reasonable control, including but not limited to acts of God, natural disasters, severe weather, fire, flood, war, terrorism, civil unrest, labor disputes, government orders or restrictions, public health emergencies or pandemics, utility failures, or equipment breakdowns.
        </Text>
        <Text style={styles.paragraph}>
          In such events, The Pickle Co. may, at its sole discretion, offer rescheduling options or account credits where feasible; refunds are not required.
        </Text>
      </View>

      <View style={styles.finalSection}>
        <Text style={styles.finalText}>
          By completing your membership purchase, you agree to comply with all rules, policies, and procedures of The Pickle Co. as outlined above.
        </Text>
      </View>
    </>
  );

  const renderPrivacyContent = () => (
    <Text style={styles.paragraph}>
      Privacy Policy content will be added here when available.
    </Text>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          {type === 'terms' ? renderTermsContent() : renderPrivacyContent()}
        </ScrollView>

        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  intro: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  subsection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  finalSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  finalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: '#2A62A2',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
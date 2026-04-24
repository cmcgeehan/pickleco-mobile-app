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
    <>
      <Text style={styles.intro}>
        Last Updated: October 29, 2025
      </Text>
      <Text style={styles.paragraph}>
        Welcome to The Pickle Co mobile app. We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Personal Information You Provide</Text>
          <Text style={styles.paragraph}>When you register and use The Pickle Co app, we collect:</Text>
          <Text style={styles.bulletPoint}>• Account Information: Email address, password (encrypted), first name, last name</Text>
          <Text style={styles.bulletPoint}>• Profile Information: Phone number, gender, profile picture (optional)</Text>
          <Text style={styles.bulletPoint}>• Membership Information: Membership type, status, payment history</Text>
          <Text style={styles.bulletPoint}>• Booking Information: Court reservations, lesson bookings, event registrations</Text>
          <Text style={styles.bulletPoint}>• Communication Preferences: Email, SMS, and WhatsApp notification preferences</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Automatically Collected Information</Text>
          <Text style={styles.bulletPoint}>• Device Information: Device type, operating system, unique device identifiers</Text>
          <Text style={styles.bulletPoint}>• Usage Data: App features used, pages viewed, time spent in app</Text>
          <Text style={styles.bulletPoint}>• Location Data: General location (if you enable location services) to show nearby facilities</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Payment Information</Text>
          <Text style={styles.bulletPoint}>• Payment processing is handled securely by Stripe</Text>
          <Text style={styles.bulletPoint}>• We do not store your complete credit card information</Text>
          <Text style={styles.bulletPoint}>• We only store tokenized payment information necessary for processing membership payments</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Provide Services</Text>
          <Text style={styles.bulletPoint}>• Create and manage your account</Text>
          <Text style={styles.bulletPoint}>• Process bookings and reservations</Text>
          <Text style={styles.bulletPoint}>• Manage your membership</Text>
          <Text style={styles.bulletPoint}>• Send booking confirmations and reminders</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Improve Our Services</Text>
          <Text style={styles.bulletPoint}>• Understand how users interact with the app</Text>
          <Text style={styles.bulletPoint}>• Identify and fix technical issues</Text>
          <Text style={styles.bulletPoint}>• Develop new features</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Communication</Text>
          <Text style={styles.bulletPoint}>• Send important updates about your bookings</Text>
          <Text style={styles.bulletPoint}>• Notify you about facility news and events</Text>
          <Text style={styles.bulletPoint}>• Respond to your inquiries and support requests</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Information Sharing and Disclosure</Text>
        <Text style={styles.paragraph}>
          We do not sell, trade, or rent your personal information to third parties.
        </Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Service Providers</Text>
          <Text style={styles.paragraph}>We share information with trusted third-party service providers:</Text>
          <Text style={styles.bulletPoint}>• Supabase: Database and authentication services</Text>
          <Text style={styles.bulletPoint}>• Stripe: Payment processing for memberships and bookings</Text>
          <Text style={styles.bulletPoint}>• Expo: Mobile app infrastructure and push notifications</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Legal Requirements</Text>
          <Text style={styles.paragraph}>We may disclose your information if required by law or in response to:</Text>
          <Text style={styles.bulletPoint}>• Valid legal process (subpoena, court order)</Text>
          <Text style={styles.bulletPoint}>• Protection of our rights or property</Text>
          <Text style={styles.bulletPoint}>• Emergency situations involving personal safety</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>We implement security measures to protect your information:</Text>
        <Text style={styles.bulletPoint}>• Encrypted data transmission (HTTPS/TLS)</Text>
        <Text style={styles.bulletPoint}>• Secure authentication using industry-standard protocols</Text>
        <Text style={styles.bulletPoint}>• Regular security audits</Text>
        <Text style={styles.bulletPoint}>• Access controls limiting who can view your data</Text>
        <Text style={styles.bulletPoint}>• Secure password storage using encryption</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.paragraph}>We retain your information for as long as:</Text>
        <Text style={styles.bulletPoint}>• Your account is active</Text>
        <Text style={styles.bulletPoint}>• Necessary to provide services</Text>
        <Text style={styles.bulletPoint}>• Required by law or for legitimate business purposes</Text>
        <Text style={styles.paragraph}>
          When you delete your account, we will delete or anonymize your personal information within 30 days, except where we need to retain it for legal compliance.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Your Rights and Choices</Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Access and Update</Text>
          <Text style={styles.bulletPoint}>• View and update your profile information in the app</Text>
          <Text style={styles.bulletPoint}>• Request a copy of your personal data</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Delete Your Account</Text>
          <Text style={styles.bulletPoint}>• You can delete your account at any time through the app settings</Text>
          <Text style={styles.bulletPoint}>• Contact us at privacy@thepickleco.mx for assistance</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Manage Communications</Text>
          <Text style={styles.bulletPoint}>• Control notification preferences in app settings</Text>
          <Text style={styles.bulletPoint}>• Opt out of marketing emails (you'll still receive essential service notifications)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          The Pickle Co app is not intended for children under 13. We do not knowingly collect information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Push Notifications</Text>
        <Text style={styles.paragraph}>We may send push notifications about:</Text>
        <Text style={styles.bulletPoint}>• Booking confirmations and reminders</Text>
        <Text style={styles.bulletPoint}>• Facility updates and announcements</Text>
        <Text style={styles.bulletPoint}>• Special events and promotions</Text>
        <Text style={styles.paragraph}>
          You can disable push notifications in your device settings at any time.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy in the app and updating the "Last Updated" date.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>If you have questions about this Privacy Policy:</Text>
        <Text style={styles.bulletPoint}>• Email: privacy@thepickleco.mx</Text>
        <Text style={styles.bulletPoint}>• Address: The Pickle Co, Prog. Moliere 479, Amp Granada, Miguel Hidalgo, 11529 Ciudad de México, CDMX</Text>
      </View>

      <View style={styles.finalSection}>
        <Text style={styles.paragraph}>
          For California Residents: Under the California Consumer Privacy Act (CCPA), you have additional rights regarding your personal information. Contact us for more information.
        </Text>
        <Text style={styles.paragraph}>
          For EU/UK Residents: Under GDPR, you have additional rights including the right to object to processing and the right to lodge a complaint with a supervisory authority.
        </Text>
      </View>

      <View style={styles.finalSection}>
        <Text style={styles.finalText}>
          By using The Pickle Co mobile app, you consent to this Privacy Policy and the collection, use, and sharing of your information as described herein.
        </Text>
      </View>
    </>
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
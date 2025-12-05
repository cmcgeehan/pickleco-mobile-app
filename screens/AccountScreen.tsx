import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import PaymentMethodsManager from '@/components/PaymentMethodsManager';
import PaymentHistory from '@/components/PaymentHistory';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CountryCodePicker, { 
  DEFAULT_COUNTRY, 
  getFullPhoneNumber,
  parsePhoneNumber,
  type Country 
} from '@/components/CountryCodePicker';

const { width } = Dimensions.get('window');

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  instagramHandle: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

interface Membership {
  type: string;
  startDate: string;
  endDate?: string | null;
  location?: {
    id: string;
    name: string;
  };
  status: string;
}

interface MembershipHistory {
  id: string;
  type: {
    name: string;
    description: string;
  };
  status: string;
  startDate: string;
  endDate: string | null;
}

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user, profile: userProfile, signOut, updateProfile, loading: authLoading } = useAuthStore()
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'profile' | 'membership' | 'billing' | 'notifications'>('profile');
  const [saving, setSaving] = useState(false);
  
  // Parse phone number to separate country and number
  const parsedPhone = parsePhoneNumber(userProfile?.phone || '');
  const [selectedCountry, setSelectedCountry] = useState<Country>(parsedPhone.country);
  const [phoneNumber, setPhoneNumber] = useState(parsedPhone.number);
  
  const [profile, setProfile] = useState<UserProfile>({
    firstName: userProfile?.first_name || '',
    lastName: userProfile?.last_name || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    gender: userProfile?.gender || '',
    instagramHandle: '',
    emailNotifications: userProfile?.email_notifications ?? true,
    smsNotifications: userProfile?.sms_notifications ?? false,
    whatsappNotifications: userProfile?.whatsapp_notifications ?? true,
  });

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setProfile({
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        gender: userProfile.gender || '',
        instagramHandle: '',
        emailNotifications: userProfile.email_notifications,
        smsNotifications: userProfile.sms_notifications,
        whatsappNotifications: userProfile.whatsapp_notifications,
      })
      
      // Also update phone number parsing
      const parsed = parsePhoneNumber(userProfile.phone || '');
      setSelectedCountry(parsed.country);
      setPhoneNumber(parsed.number);
    }
  }, [userProfile]);
  const activeMembership = userProfile?.active_membership;
  const membershipHistory = userProfile?.membership_history || [];


  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Combine country code with phone number
      const fullPhoneNumber = phoneNumber ? getFullPhoneNumber(selectedCountry, phoneNumber) : null;
      
      await updateProfile({
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
        phone: fullPhoneNumber,
        gender: profile.gender || null,
        email_notifications: profile.emailNotifications,
        sms_notifications: profile.smsNotifications,
        whatsapp_notifications: profile.whatsappNotifications,
      });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = (type: 'emailNotifications' | 'smsNotifications' | 'whatsappNotifications') => {
    setProfile(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderTabButton = (tab: 'profile' | 'membership' | 'billing' | 'notifications', title: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>First Name</Text>
          <TextInput
            style={styles.textInput}
            value={profile.firstName}
            onChangeText={(text) => setProfile(prev => ({ ...prev, firstName: text }))}
            placeholder="Enter first name"
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <TextInput
            style={styles.textInput}
            value={profile.lastName}
            onChangeText={(text) => setProfile(prev => ({ ...prev, lastName: text }))}
            placeholder="Enter last name"
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={profile.email}
            onChangeText={(text) => setProfile(prev => ({ ...prev, email: text }))}
            placeholder="Enter email"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('auth.phoneOptional')}</Text>
          <CountryCodePicker
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            phoneNumber={phoneNumber}
            onChangePhoneNumber={setPhoneNumber}
            placeholder={t('auth.phone')}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Instagram Handle</Text>
          <TextInput
            style={styles.textInput}
            value={profile.instagramHandle}
            onChangeText={(text) => setProfile(prev => ({ ...prev, instagramHandle: text }))}
            placeholder="@username"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Contact Us Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        
        <TouchableOpacity 
          style={styles.contactItem}
          onPress={() => Linking.openURL('https://maps.google.com/?q=Av+Moliere+46,+Granada,+Miguel+Hidalgo,+11529+Ciudad+de+México,+CDMX')}
        >
          <Text style={styles.contactIcon}>📍</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>Visit Us</Text>
            <Text style={styles.contactText}>Av Moliere 46, Granada</Text>
            <Text style={styles.contactText}>Miguel Hidalgo, 11529 CDMX</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.contactItem}
          onPress={() => Linking.openURL('https://api.whatsapp.com/send/?phone=525634234298&text&type=phone_number&app_absent=0')}
        >
          <Text style={styles.contactIcon}>💬</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>WhatsApp Direct Message</Text>
            <Text style={styles.contactText}>+52 56 3423 4298</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.contactItem}
          onPress={() => Linking.openURL('https://chat.whatsapp.com/IL8Ho3Zcu9G0KdYuBp1B7K')}
        >
          <Text style={styles.contactIcon}>👥</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>WhatsApp Club Group</Text>
            <Text style={styles.contactText}>Join our community chat</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.contactItem}
          onPress={() => Linking.openURL('https://www.instagram.com/the_pickle_co')}
        >
          <Text style={styles.contactIcon}>📸</Text>
          <View style={styles.contactContent}>
            <Text style={styles.contactLabel}>Instagram</Text>
            <Text style={styles.contactText}>@the_pickle_co</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSaveProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMembershipTab = () => (
    <View style={styles.tabContent}>
      {activeMembership ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Membership</Text>
          
          <View style={styles.membershipCard}>
            <View style={styles.membershipHeader}>
              <Text style={styles.membershipType}>{activeMembership.membership_types?.name || 'Active'}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
            
            <View style={styles.membershipDetails}>
              <View style={styles.membershipRow}>
                <Text style={styles.membershipLabel}>Start Date</Text>
                <Text style={styles.membershipValue}>
                  {formatDate(activeMembership.start_date)}
                </Text>
              </View>
              {activeMembership.end_date && (
                <View style={styles.membershipRow}>
                  <Text style={styles.membershipLabel}>End Date</Text>
                  <Text style={styles.membershipValue}>
                    {formatDate(activeMembership.end_date)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Membership History</Text>
          {membershipHistory.map((membership, index) => (
            <View key={membership.id || index} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyType}>{membership.type || membership.type?.name || 'Membership'}</Text>
                <View style={[
                  styles.historyStatusBadge,
                  membership.status === 'active' ? styles.activeStatus : styles.inactiveStatus
                ]}>
                  <Text style={[
                    styles.historyStatusText,
                    membership.status === 'active' ? styles.activeStatusText : styles.inactiveStatusText
                  ]}>
                    {membership.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyDescription}>{membership.type?.description || 'Membership details'}</Text>
              <Text style={styles.historyDates}>
                {formatDate(membership.start_date || membership.startDate)} 
                {(membership.end_date || membership.endDate) && ` - ${formatDate(membership.end_date || membership.endDate)}`}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyMembership}>
          <Text style={styles.emptyIcon}>🏓</Text>
          <Text style={styles.emptyTitle}>No Active Membership</Text>
          <Text style={styles.emptyText}>
            You don't have an active membership. Visit the Membership tab to explore our plans!
          </Text>
          <TouchableOpacity 
            style={styles.browseMembershipButton}
            onPress={() => navigation.navigate('Membership')}
          >
            <Text style={styles.browseMembershipButtonText}>View Membership Options</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBillingTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <PaymentMethodsManager userId={user?.id} />
      </View>
      
      <View style={styles.section}>
        <PaymentHistory userId={user?.id} />
      </View>
    </View>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        
        <View style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>Email Notifications</Text>
            <Text style={styles.notificationDescription}>
              Receive updates about events, bookings, and account activity
            </Text>
          </View>
          <Switch
            value={profile.emailNotifications}
            onValueChange={() => handleNotificationToggle('emailNotifications')}
            trackColor={{ false: '#E2E8F0', true: '#2A62A2' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>SMS Notifications</Text>
            <Text style={styles.notificationDescription}>
              Get text messages for important updates and reminders
            </Text>
          </View>
          <Switch
            value={profile.smsNotifications}
            onValueChange={() => handleNotificationToggle('smsNotifications')}
            trackColor={{ false: '#E2E8F0', true: '#2A62A2' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>WhatsApp Notifications</Text>
            <Text style={styles.notificationDescription}>
              Receive notifications through WhatsApp
            </Text>
          </View>
          <Switch
            value={profile.whatsappNotifications}
            onValueChange={() => handleNotificationToggle('whatsappNotifications')}
            trackColor={{ false: '#E2E8F0', true: '#2A62A2' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  );

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A62A2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.pageTitle}>{t('account.title')}</Text>
          </View>
          
          <View style={styles.centerSection}>
            <Image 
              source={{ uri: 'https://omqdrgqzlksexruickvh.supabase.co/storage/v1/object/public/email-images/thePickleCoLogoBlue.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.rightSection}>
            <LanguageSwitcher />
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton('profile', t('account.profile'))}
        {renderTabButton('membership', t('navigation.membership'))}
        {renderTabButton('billing', 'Billing')}
        {renderTabButton('notifications', t('account.notifications'))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'membership' && renderMembershipTab()}
        {activeTab === 'billing' && renderBillingTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  logo: {
    width: 60,
    height: 28,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A62A2',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  activeTabButtonText: {
    color: '#2A62A2',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#020817',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#2A62A2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#FF5964',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FF5964',
    fontSize: 16,
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  membershipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membershipType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
  },
  statusBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2A62A2',
  },
  statusText: {
    color: '#2A62A2',
    fontSize: 12,
    fontWeight: '600',
  },
  membershipDetails: {
    gap: 8,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  membershipValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#020817',
  },
  historyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
  },
  historyStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeStatus: {
    backgroundColor: '#F0F9FF',
  },
  inactiveStatus: {
    backgroundColor: '#F1F5F9',
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activeStatusText: {
    color: '#2A62A2',
  },
  inactiveStatusText: {
    color: '#64748B',
  },
  historyDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  historyDates: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyMembership: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  browseMembershipButton: {
    backgroundColor: '#2A62A2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseMembershipButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#020817',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  SafeAreaView as RNSafeAreaView,
  Linking,
  TextInput,
  Switch,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useNavigation } from '@react-navigation/native';
import PaymentMethodsManager from '@/components/PaymentMethodsManager';
import PaymentHistory from '@/components/PaymentHistory';
import CountryCodePicker, { 
  DEFAULT_COUNTRY, 
  getFullPhoneNumber,
  parsePhoneNumber,
  type Country 
} from '@/components/CountryCodePicker';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { imageUploadService } from '@/lib/imageUploadService';

type ModalType = 'contact' | 'profile' | 'membership' | 'billing' | 'notifications' | null;

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

export default function MoreScreen() {
  const { t } = useTranslation();
  const { user, profile: userProfile, signOut, updateProfile, loading: authLoading } = useAuthStore();
  const navigation = useNavigation<any>();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
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

  // Load user's avatar URL
  useEffect(() => {
    const loadUserAvatar = async () => {
      if (user?.id) {
        try {
          const avatarUrl = await imageUploadService.getUserAvatarUrl(user.id);
          setAvatarUrl(avatarUrl);
        } catch (error) {
          console.error('Error loading user avatar:', error);
        }
      }
    };

    loadUserAvatar();
  }, [user?.id]);

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      // Map existing gender values to new format
      let mappedGender = '';
      if (userProfile.gender) {
        const existingGender = userProfile.gender.toLowerCase();
        if (existingGender.includes('male') || existingGender === 'm' || existingGender === 'man') {
          mappedGender = 'mens';
        } else if (existingGender.includes('female') || existingGender === 'f' || existingGender === 'woman') {
          mappedGender = 'womens';
        } else if (existingGender === 'mens' || existingGender === 'womens') {
          mappedGender = existingGender;
        }
      }
      
      setProfile({
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        gender: mappedGender,
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
      Alert.alert(t('common.success'), t('common.profileUpdateSuccess'));
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert(t('common.error'), t('common.profileUpdateError'));
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

  const handleAvatarPress = () => {
    const options = [t('more.takePhoto'), t('more.chooseFromLibrary'), t('common.cancel')];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
          title: t('more.selectProfilePhoto'),
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleTakePhoto();
          } else if (buttonIndex === 1) {
            handleChoosePhoto();
          }
        }
      );
    } else {
      // For Android, show Alert with options
      Alert.alert(
        t('more.selectProfilePhoto'),
        t('more.choosePhotoMethod'),
        [
          { text: t('more.takePhoto'), onPress: handleTakePhoto },
          { text: t('more.chooseFromLibrary'), onPress: handleChoosePhoto },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    }
  };

  const handleTakePhoto = async () => {
    try {
      setUploadingImage(true);
      const result = await imageUploadService.takePhoto();
      
      if (result && !result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.photoTakeError');
      
      if (errorMessage.includes('permission')) {
        Alert.alert(
          t('more.permissionRequired'), 
          t('more.cameraPermissionMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('more.openSettings'), onPress: () => Linking.openSettings() }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChoosePhoto = async () => {
    try {
      setUploadingImage(true);
      const result = await imageUploadService.pickImage();
      
      if (result && !result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error choosing photo:', error);
      const errorMessage = error instanceof Error ? error.message : t('more.failedSelectPhoto');
      
      if (errorMessage.includes('permission')) {
        Alert.alert(
          t('more.permissionRequired'), 
          t('more.photoPermissionMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('more.openSettings'), onPress: () => Linking.openSettings() }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user?.id || !userProfile?.first_name || !userProfile?.last_name) {
      Alert.alert(t('common.error'), t('common.userInfoMissing'));
      return;
    }

    try {
      const result = await imageUploadService.uploadUserImage(
        uri,
        userProfile.first_name,
        userProfile.last_name,
        user.id
      );

      if (result.success) {
        // Refresh the avatar URL to show the new image
        const newAvatarUrl = await imageUploadService.getUserAvatarUrl(user.id);
        setAvatarUrl(newAvatarUrl);
        
        Alert.alert(t('common.success'), t('common.photoUpdateSuccess'));
      } else {
        Alert.alert(t('common.error'), result.error || t('common.imageUploadError'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(t('common.error'), t('common.imageUploadError'));
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOut'),
      t('more.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('auth.signOut'), 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      id: 'contact',
      title: t('more.contactUs'),
      icon: '📞',
      description: t('more.getInTouchWithUs'),
      onPress: () => setActiveModal('contact'),
    },
    {
      id: 'profile',
      title: t('more.personalInformation'),
      icon: '👤',
      description: t('more.manageProfile'),
      onPress: () => setActiveModal('profile'),
    },
    {
      id: 'membership',
      title: t('more.myMembership'),
      icon: '💎',
      description: t('more.viewMembershipDetails'),
      onPress: () => setActiveModal('membership'),
    },
    {
      id: 'billing',
      title: t('more.billing'),
      icon: '💳',
      description: t('more.paymentMethodsHistory'),
      onPress: () => setActiveModal('billing'),
    },
    {
      id: 'notifications',
      title: t('more.notifications'),
      icon: '🔔',
      description: t('more.notificationPreferences'),
      onPress: () => setActiveModal('notifications'),
    },
  ];

  const renderContactModal = () => (
    <Modal
      visible={activeModal === 'contact'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setActiveModal(null)}
    >
      <RNSafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('more.contactUs')}</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('https://maps.google.com/?q=Av+Moliere+46,+Granada,+Miguel+Hidalgo,+11529+Ciudad+de+México,+CDMX')}
          >
            <Text style={styles.contactIcon}>📍</Text>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>{t('more.visitUs')}</Text>
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
              <Text style={styles.contactLabel}>{t('more.whatsappDirectMessage')}</Text>
              <Text style={styles.contactText}>+52 56 3423 4298</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('https://chat.whatsapp.com/IL8Ho3Zcu9G0KdYuBp1B7K')}
          >
            <Text style={styles.contactIcon}>👥</Text>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>{t('more.whatsappClubGroup')}</Text>
              <Text style={styles.contactText}>{t('more.joinCommunityChat')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('https://www.instagram.com/the_pickle_co')}
          >
            <Text style={styles.contactIcon}>📸</Text>
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>{t('more.instagram')}</Text>
              <Text style={styles.contactText}>@the_pickle_co</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );

  const renderProfileModal = () => (
    <Modal
      visible={activeModal === 'profile'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setActiveModal(null)}
    >
      <RNSafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('more.personalInformation')}</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('more.firstName')}</Text>
            <TextInput
              style={styles.textInput}
              value={profile.firstName}
              onChangeText={(text) => setProfile(prev => ({ ...prev, firstName: text }))}
              placeholder={t('more.enterFirstName')}
              placeholderTextColor="#64748B"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('more.lastName')}</Text>
            <TextInput
              style={styles.textInput}
              value={profile.lastName}
              onChangeText={(text) => setProfile(prev => ({ ...prev, lastName: text }))}
              placeholder={t('more.enterLastName')}
              placeholderTextColor="#64748B"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('more.email')}</Text>
            <TextInput
              style={styles.textInput}
              value={profile.email}
              onChangeText={(text) => setProfile(prev => ({ ...prev, email: text }))}
              placeholder={t('more.enterEmail')}
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('more.phone')}</Text>
            <CountryCodePicker
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              phoneNumber={phoneNumber}
              onChangePhoneNumber={setPhoneNumber}
              placeholder={t('more.phoneNumber')}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('more.playMensWomens')}</Text>
            <View style={styles.genderButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  profile.gender === 'mens' && styles.genderButtonActive
                ]}
                onPress={() => setProfile(prev => ({ ...prev, gender: 'mens' }))}
              >
                <Text style={[
                  styles.genderButtonText,
                  profile.gender === 'mens' && styles.genderButtonTextActive
                ]}>
                  {t('more.mens')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  profile.gender === 'womens' && styles.genderButtonActive
                ]}
                onPress={() => setProfile(prev => ({ ...prev, gender: 'womens' }))}
              >
                <Text style={[
                  styles.genderButtonText,
                  profile.gender === 'womens' && styles.genderButtonTextActive
                ]}>
                  {t('more.womens')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{t('more.saveChanges')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );

  const renderMembershipModal = () => (
    <Modal
      visible={activeModal === 'membership'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setActiveModal(null)}
    >
      <RNSafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('more.myMembership')}</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {activeMembership ? (
            <View style={styles.membershipCard}>
              <View style={styles.membershipHeader}>
                <Text style={styles.membershipType}>
                  {activeMembership.membership_types?.name || t('more.activeMembership')}
                </Text>
                <View style={[styles.membershipStatus, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.membershipStatusText}>{t('more.active')}</Text>
                </View>
              </View>
              
              <View style={styles.membershipDetails}>
                <View style={styles.membershipDetailRow}>
                  <Text style={styles.membershipDetailLabel}>{t('more.locationColon')}</Text>
                  <Text style={styles.membershipDetailValue}>
                    {activeMembership.locations?.name || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.membershipDetailRow}>
                  <Text style={styles.membershipDetailLabel}>{t('more.startDate')}</Text>
                  <Text style={styles.membershipDetailValue}>
                    {new Date(activeMembership.start_date).toLocaleDateString()}
                  </Text>
                </View>
                
                {activeMembership.end_date && (
                  <View style={styles.membershipDetailRow}>
                    <Text style={styles.membershipDetailLabel}>{t('more.endDate')}</Text>
                    <Text style={styles.membershipDetailValue}>
                      {new Date(activeMembership.end_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                <View style={styles.membershipDetailRow}>
                  <Text style={styles.membershipDetailLabel}>{t('more.monthlyCost')}</Text>
                  <Text style={styles.membershipDetailValue}>
                    ${activeMembership.membership_types?.cost_mxn?.toLocaleString()} MXN
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyMembershipContainer}>
              <Text style={styles.emptyMembershipEmoji}>💎</Text>
              <Text style={styles.emptyMembershipTitle}>{t('more.noActiveMembership')}</Text>
              <Text style={styles.emptyMembershipText}>
                {t('more.noActiveMembershipText')}
              </Text>
              <TouchableOpacity
                style={styles.viewMembershipsButton}
                onPress={() => {
                  setActiveModal(null);
                  navigation.navigate('Membership');
                }}
              >
                <Text style={styles.viewMembershipsButtonText}>{t('more.viewMemberships')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {membershipHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>{t('more.membershipHistory')}</Text>
              {membershipHistory.map((membership: any, index: number) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyItemType}>
                      {membership.membership_types?.name || t('more.membership')}
                    </Text>
                    <View style={[
                      styles.membershipStatus,
                      { backgroundColor: membership.status === 'active' ? '#10B981' : '#6B7280' }
                    ]}>
                      <Text style={styles.membershipStatusText}>
                        {membership.status}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.historyItemDates}>
                    {new Date(membership.start_date).toLocaleDateString()} - 
                    {membership.end_date 
                      ? new Date(membership.end_date).toLocaleDateString()
                      : t('more.present')
                    }
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );

  const renderBillingModal = () => (
    <Modal
      visible={activeModal === 'billing'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setActiveModal(null)}
    >
      <RNSafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('more.billing')}</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.billingSection}>
            <Text style={styles.billingSectionTitle}>{t('more.paymentMethods')}</Text>
            <PaymentMethodsManager userId={user?.id} />
          </View>

          <View style={styles.billingSection}>
            <Text style={styles.billingSectionTitle}>{t('more.paymentHistory')}</Text>
            <PaymentHistory userId={user?.id} />
          </View>
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );

  const renderNotificationsModal = () => (
    <Modal
      visible={activeModal === 'notifications'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setActiveModal(null)}
    >
      <RNSafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setActiveModal(null)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('more.notifications')}</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.notificationDescription}>
            {t('more.notificationDescription')}
          </Text>

          <View style={styles.notificationItem}>
            <View style={styles.notificationItemLeft}>
              <Text style={styles.notificationItemIcon}>📧</Text>
              <View style={styles.notificationItemContent}>
                <Text style={styles.notificationItemTitle}>{t('more.emailNotifications')}</Text>
                <Text style={styles.notificationItemDescription}>
                  {t('more.receiveUpdatesEmail')}
                </Text>
              </View>
            </View>
            <Switch
              value={profile.emailNotifications}
              onValueChange={() => handleNotificationToggle('emailNotifications')}
              trackColor={{ false: '#E5E7EB', true: '#2A62A2' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.notificationItem}>
            <View style={styles.notificationItemLeft}>
              <Text style={styles.notificationItemIcon}>📱</Text>
              <View style={styles.notificationItemContent}>
                <Text style={styles.notificationItemTitle}>{t('more.smsNotifications')}</Text>
                <Text style={styles.notificationItemDescription}>
                  {t('more.receiveUpdatesSMS')}
                </Text>
              </View>
            </View>
            <Switch
              value={profile.smsNotifications}
              onValueChange={() => handleNotificationToggle('smsNotifications')}
              trackColor={{ false: '#E5E7EB', true: '#2A62A2' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.notificationItem}>
            <View style={styles.notificationItemLeft}>
              <Text style={styles.notificationItemIcon}>💬</Text>
              <View style={styles.notificationItemContent}>
                <Text style={styles.notificationItemTitle}>{t('more.whatsappNotifications')}</Text>
                <Text style={styles.notificationItemDescription}>
                  {t('more.receiveUpdatesWhatsApp')}
                </Text>
              </View>
            </View>
            <Switch
              value={profile.whatsappNotifications}
              onValueChange={() => handleNotificationToggle('whatsappNotifications')}
              trackColor={{ false: '#E5E7EB', true: '#2A62A2' }}
              thumbColor="#ffffff"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')} Preferences</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.pageTitle}>{t('navigation.more')}</Text>
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

      {/* User Info */}
      <View style={styles.userSection}>
        <TouchableOpacity 
          style={styles.userAvatarContainer} 
          onPress={handleAvatarPress}
          disabled={uploadingImage}
        >
          <View style={styles.userAvatar}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.userAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.userAvatarText}>
                {userProfile?.first_name?.[0]?.toUpperCase() || 'U'}
                {userProfile?.last_name?.[0]?.toUpperCase() || ''}
              </Text>
            )}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            )}
          </View>
          <View style={styles.cameraIcon}>
            <Text style={styles.cameraIconText}>📷</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {userProfile?.first_name} {userProfile?.last_name}
          </Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemDescription}>{item.description}</Text>
                </View>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutIcon}>🚪</Text>
          <Text style={styles.signOutText}>{t('account.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      {renderContactModal()}
      {renderProfileModal()}
      {renderMembershipModal()}
      {renderBillingModal()}
      {renderNotificationsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A62A2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cameraIconText: {
    fontSize: 10,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(42, 98, 162, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  menuContainer: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#64748B',
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#94A3B8',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    fontSize: 24,
    color: '#64748B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
  },
  modalContent: {
    flex: 1,
    padding: 20,
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
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Profile modal styles
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
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  genderButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#2A62A2',
    backgroundColor: '#F0F7FF',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  genderButtonTextActive: {
    color: '#2A62A2',
    fontWeight: '600',
  },
  // Membership modal styles
  membershipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membershipType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
    textTransform: 'capitalize',
  },
  membershipStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membershipStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  membershipDetails: {},
  membershipDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membershipDetailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  membershipDetailValue: {
    fontSize: 14,
    color: '#020817',
    fontWeight: '600',
  },
  emptyMembershipContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyMembershipEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyMembershipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 8,
  },
  emptyMembershipText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  viewMembershipsButton: {
    backgroundColor: '#2A62A2',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  viewMembershipsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  historySection: {
    marginTop: 20,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 16,
  },
  historyItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyItemType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020817',
    textTransform: 'capitalize',
  },
  historyItemDates: {
    fontSize: 12,
    color: '#64748B',
  },
  // Billing modal styles
  billingSection: {
    marginBottom: 24,
  },
  billingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 16,
  },
  // Notifications modal styles
  notificationDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notificationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  notificationItemContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 2,
  },
  notificationItemDescription: {
    fontSize: 13,
    color: '#64748B',
  },
});
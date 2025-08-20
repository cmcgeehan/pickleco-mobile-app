import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { fetchMembershipTypes, fetchUserActiveMemberships, MembershipType } from '@/lib/membershipService';
import MembershipCard from '@/components/MembershipCard';
import MembershipCheckoutWizard from '@/components/MembershipCheckoutWizard';
import ActiveMembershipCard from '@/components/ActiveMembershipCard';
import MembershipHero from '@/components/MembershipHero';
import MembershipFAQ from '@/components/MembershipFAQ';

export default function MembershipScreen() {
  const { user, profile } = useAuthStore();
  const navigation = useNavigation<any>();
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [activeMemberships, setActiveMemberships] = useState([]);
  const [selectedMembership, setSelectedMembership] = useState<MembershipType | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const [types, userMemberships] = await Promise.all([
        fetchMembershipTypes(),
        fetchUserActiveMemberships(user.id)
      ]);
      
      // Filter out admin membership types for regular users
      const filteredTypes = types.filter(type => 
        type.name !== 'admin' && type.cost_mxn !== null && type.cost_mxn >= 0
      );
      
      // Sort membership types in the desired order: pay_to_play, standard, ultimate
      const sortedTypes = filteredTypes.sort((a, b) => {
        const order = { 'pay_to_play': 0, 'standard': 1, 'ultimate': 2 };
        return (order[a.name] ?? 999) - (order[b.name] ?? 999);
      });
      
      setMembershipTypes(sortedTypes);
      setActiveMemberships(userMemberships);
    } catch (error) {
      console.error('Error loading membership data:', error);
      Alert.alert('Error', 'Failed to load membership information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleMembershipSelect = (membership: MembershipType) => {
    setSelectedMembership(membership);
    setShowCheckout(true);
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
    setSelectedMembership(null);
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setSelectedMembership(null);
    loadData(); // Refresh data to show new membership
  };

  const handlePayToPlaySelect = () => {
    navigation.navigate('Calendar');
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to view memberships</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2A62A2" />
        <Text style={styles.loadingText}>Loading memberships...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.pageTitle}>Membership</Text>
          </View>
          
          <View style={styles.centerSection}>
            <Image 
              source={{ uri: 'https://omqdrgqzlksexruickvh.supabase.co/storage/v1/object/public/email-images/thePickleCoLogoBlue.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.rightSection}>
            <TouchableOpacity style={styles.languageSwitcher}>
              <Text style={styles.languageText}>EN</Text>
              <Text style={styles.languageArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* Hero Section */}
      <MembershipHero />

      {/* Active Memberships */}
      {activeMemberships.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Active Memberships</Text>
          {activeMemberships.map((membership) => (
            <ActiveMembershipCard
              key={membership.id}
              membership={membership}
            />
          ))}
        </View>
      )}

      {/* Available Memberships */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {activeMemberships.length > 0 ? 'Other Available Plans' : 'Choose Your Membership'}
        </Text>
        
        {membershipTypes.map((membership) => (
          <MembershipCard
            key={membership.id}
            membership={membership}
            onSelect={() => handleMembershipSelect(membership)}
            onPayToPlaySelect={handlePayToPlaySelect}
            isSelected={selectedMembership?.id === membership.id}
          />
        ))}
      </View>

      {/* FAQ Section */}
      <MembershipFAQ />

      {/* Checkout Wizard */}
      {selectedMembership && (
        <MembershipCheckoutWizard
          visible={showCheckout}
          membershipType={selectedMembership}
          onClose={handleCheckoutClose}
          onSuccess={handleCheckoutSuccess}
        />
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
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
  languageSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A62A2',
    marginRight: 4,
  },
  languageArrow: {
    fontSize: 10,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
  },
});
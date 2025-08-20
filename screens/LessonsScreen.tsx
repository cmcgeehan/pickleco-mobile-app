import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CoachesSection from '../components/CoachesSection';
import LessonBookingWizard from '../components/LessonBookingWizard';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function LessonsScreen() {
  const { session, user } = useAuthStore();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLessonWizard, setShowLessonWizard] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);

  useEffect(() => {
    if (user && session) {
      loadCoaches();
    }
  }, [user, session]);

  const loadCoaches = async () => {
    if (!user) {
      console.log('No user available for loading coaches');
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    console.log('Loading coaches from Supabase...');

    try {
      const { data: coaches, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          coaching_rate,
          bio,
          description,
          specialties,
          dupr_rating
        `)
        .eq('is_coach', true)
        .is('deleted_at', null)
        .order('first_name');

      if (error) {
        console.error('Supabase error loading coaches:', error);
        throw error;
      }

      console.log('Coaches data received from Supabase:', coaches);
      
      // Filter out coaches without names and transform data
      const transformedCoaches = coaches?.filter(
        (coach: any) => coach.first_name && coach.last_name
      ).map((coach: any) => ({
        id: coach.id,
        first_name: coach.first_name,
        last_name: coach.last_name,
        coaching_rate: coach.coaching_rate || 0,
        bio: coach.bio,
        description: coach.description,
        specialties: coach.specialties || [],
        dupr_rating: coach.dupr_rating,
      })) || [];

      console.log('Transformed coaches:', transformedCoaches);
      setCoaches(transformedCoaches);
    } catch (error) {
      console.error('Error loading coaches:', error);
      setCoaches([]);
      Alert.alert('Error', 'Failed to load coaches. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCoaches();
  };

  const handleCoachPress = (coach: any) => {
    // TODO: Navigate to coach detail or booking screen
    console.log('Coach pressed:', coach);
  };

  const handleBookLesson = (coach: any) => {
    setSelectedCoach(coach);
    setShowLessonWizard(true);
  };

  const handleLessonWizardSuccess = () => {
    // Optionally refresh coaches or navigate somewhere
    loadCoaches();
  };

  if (isLoading) {
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
            <Text style={styles.pageTitle}>Lessons</Text>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2A62A2']}
            tintColor="#2A62A2"
          />
        }
      >

        {/* Coaches Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Coaches</Text>
            <Text style={styles.sectionDescription}>Professional instruction for all skill levels</Text>
          </View>
          <CoachesSection 
            coaches={coaches} 
            onCoachPress={handleCoachPress}
            onBookLesson={handleBookLesson}
          />
        </View>

        {/* Future sections can be added here */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Group Clinics</Text>
            <Text style={styles.sectionDescription}>Join our group training sessions</Text>
          </View>
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonIcon}>🏓</Text>
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
            <Text style={styles.comingSoonText}>
              Group clinics and training programs will be available here.
            </Text>
          </View>
        </View>

      </ScrollView>
      
      <LessonBookingWizard
        visible={showLessonWizard}
        onClose={() => setShowLessonWizard(false)}
        onSuccess={handleLessonWizardSuccess}
        initialCoachId={selectedCoach?.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
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
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  comingSoonIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
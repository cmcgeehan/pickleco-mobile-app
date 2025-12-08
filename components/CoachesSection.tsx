import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { imageUploadService } from '@/lib/imageUploadService';
import { useFeatureFlag } from '@/stores/featureFlagsStore';

const { width } = Dimensions.get('window');

interface Coach {
  id: string;
  first_name: string;
  last_name: string;
  coaching_rate: number;
  bio?: string;
  description?: string;
  specialties?: string[];
  dupr_rating?: number;
}

interface CoachesSectionProps {
  coaches?: Coach[];
  onCoachPress?: (coach: Coach) => void;
  onBookLesson?: (coach: Coach) => void;
}

export default function CoachesSection({
  coaches = [],
  onCoachPress,
  onBookLesson
}: CoachesSectionProps) {
  const { t } = useTranslation();
  const lessonBookingEnabled = useFeatureFlag('lessonBookingEnabled');
  // Safety check to ensure coaches is always an array
  const safeCoaches = Array.isArray(coaches) ? coaches : [];
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [coachAvatars, setCoachAvatars] = useState<Record<string, string | null>>({});

  // Load coach avatars when coaches change
  useEffect(() => {
    const loadCoachAvatars = async () => {
      const avatarPromises = safeCoaches.map(async (coach) => {
        try {
          const avatarUrl = await imageUploadService.getUserAvatarUrl(coach.id);
          return { coachId: coach.id, avatarUrl };
        } catch (error) {
          console.error(`Error loading avatar for coach ${coach.id}:`, error);
          return { coachId: coach.id, avatarUrl: null };
        }
      });

      const avatarResults = await Promise.all(avatarPromises);
      const avatarMap = avatarResults.reduce((acc, { coachId, avatarUrl }) => {
        acc[coachId] = avatarUrl;
        return acc;
      }, {} as Record<string, string | null>);

      setCoachAvatars(avatarMap);
    };

    if (safeCoaches.length > 0) {
      loadCoachAvatars();
    }
  }, [safeCoaches]);

  const toggleCardFlip = (coachId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(coachId)) {
        newSet.delete(coachId);
      } else {
        newSet.add(coachId);
      }
      return newSet;
    });
  };

  const renderCoach = (coach: Coach) => {
    // Add safety checks for required fields
    if (!coach || !coach.first_name || !coach.last_name) {
      return null;
    }

    const isFlipped = flippedCards.has(coach.id);

    return (
      <View key={coach.id} style={styles.cardContainer}>
        <View style={[styles.coachCard, isFlipped && styles.flippedCard]}>
          {!isFlipped ? (
            // Front of card
            <>
              {/* Coach Image */}
              <View style={styles.coachImageContainer}>
                {coachAvatars[coach.id] ? (
                  <Image
                    source={{ uri: coachAvatars[coach.id] || undefined }}
                    style={styles.coachImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>
                      {coach.first_name[0]}{coach.last_name[0]}
                    </Text>
                  </View>
                )}
              </View>
            
              {/* Coach Info */}
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>
                  {coach.first_name} {coach.last_name}
                </Text>
                
                <View style={styles.coachDetails}>
                  <Text style={styles.duprRating}>
                    {t('common.duprRating')}: {coach.dupr_rating || 'N/A'}
                  </Text>
                  <Text style={styles.coachingRate}>
                    ${coach.coaching_rate}{t('common.perHour')}
                  </Text>
                </View>
                
                {coach.bio && (
                  <Text style={styles.coachBio} numberOfLines={2}>
                    {coach.bio}
                  </Text>
                )}
                
                {coach.specialties && coach.specialties.length > 0 && (
                  <View style={styles.specialtiesContainer}>
                    {coach.specialties.slice(0, 2).map((specialty, index) => (
                      <View key={index} style={styles.specialtyTag}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                    {coach.specialties.length > 2 && (
                      <Text style={styles.moreSpecialties}>
                        +{coach.specialties.length - 2} {t('common.more')}
                      </Text>
                    )}
                  </View>
                )}
                
                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => toggleCardFlip(coach.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.infoButtonText}>{t('common.info')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.bookButton, !lessonBookingEnabled && styles.disabledButton]}
                    onPress={() => {
                      if (lessonBookingEnabled && onBookLesson) {
                        onBookLesson(coach);
                      } else {
                        Alert.alert(t('common.comingSoon'), t('common.lessonBookingMessage'));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bookButtonText, !lessonBookingEnabled && styles.disabledButtonText]}>{t('common.book')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // Back of card - Description
            <View style={styles.cardBack}>
              <View style={styles.cardBackHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => toggleCardFlip(coach.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.coachNameBack}>
                  {coach.first_name} {coach.last_name}
                </Text>
              </View>
              
              <ScrollView style={styles.descriptionContainer} showsVerticalScrollIndicator={false}>
                {(coach.description || coach.bio) ? (
                  <Text style={styles.description}>
                    {coach.description || coach.bio}
                  </Text>
                ) : (
                  <Text style={styles.noDescription}>
                    {t('common.noDescriptionAvailable')}
                  </Text>
                )}
                
                {coach.specialties && coach.specialties.length > 0 && (
                  <View style={styles.specialtiesSection}>
                    <Text style={styles.specialtiesTitle}>{t('common.specialties')}:</Text>
                    <View style={styles.specialtiesContainer}>
                      {coach.specialties.map((specialty, index) => (
                        <View key={index} style={styles.specialtyTag}>
                          <Text style={styles.specialtyText}>{specialty}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => toggleCardFlip(coach.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.infoButtonText}>← Back</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.bookButton, !lessonBookingEnabled && styles.disabledButton]}
                  onPress={() => {
                    if (lessonBookingEnabled && onBookLesson) {
                      onBookLesson(coach);
                    } else {
                      Alert.alert(t('common.comingSoon'), t('common.lessonBookingMessage'));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bookButtonText, !lessonBookingEnabled && styles.disabledButtonText]}>{t('common.book')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (safeCoaches.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏓</Text>
          <Text style={styles.emptyTitle}>No Coaches Available</Text>
          <Text style={styles.emptyText}>
            Our coaches will be listed here soon.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.coachesScroll}
        style={styles.coachesContainer}
      >
        {safeCoaches.map(renderCoach)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
  },
  coachesContainer: {
    paddingLeft: 20,
  },
  coachesScroll: {
    paddingRight: 20,
  },
  cardContainer: {
    marginRight: 16,
    width: width * 0.6,
    height: 380,
  },
  coachCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  flippedCard: {
    // Style for flipped state if needed
  },
  coachImageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#F1F5F9',
  },
  coachImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748B',
  },
  coachInfo: {
    padding: 16,
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#020817',
    marginBottom: 8,
  },
  coachDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  duprRating: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  coachingRate: {
    fontSize: 13,
    color: '#2A62A2',
    fontWeight: '600',
  },
  coachBio: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  specialtyTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specialtyText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  moreSpecialties: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  infoButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#2A62A2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    backgroundColor: '#E2E8F0',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#94A3B8',
  },
  cardBack: {
    padding: 16,
    flex: 1,
  },
  cardBackHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  coachNameBack: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#020817',
    flex: 1,
  },
  backButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 12,
    color: '#64748B',
  },
  descriptionContainer: {
    flex: 1,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#020817',
    lineHeight: 20,
    marginBottom: 16,
  },
  noDescription: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  specialtiesSection: {
    marginTop: 16,
  },
  specialtiesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#020817',
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    height: 350,
    justifyContent: 'center',
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
    lineHeight: 20,
  },
});
import { supabase } from './supabase';
import i18n from '../i18n/i18n';

export interface MembershipType {
  id: number;
  name: string;
  description: string | null;
  cost_mxn: number;
  stripe_product_id: string | null;
  features: string[];
  discounts: MembershipDiscount[];
  displayName?: string;
}

export interface MembershipDiscount {
  eventType: string;
  discountPercentage: number;
}

export interface Location {
  id: number;
  name: string;
  address: string | null;
  open: boolean;
  timezone: string;
  description: string;
}

export interface UserMembership {
  id: string;
  user_id: string;
  membership_type_id: number;
  location_id: number;
  status: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  membership_types: {
    id: number;
    name: string;
    description: string | null;
    cost_mxn: number;
  };
  locations: {
    id: number;
    name: string;
    address: string | null;
  };
}

// Helper function to get display name for membership types
const getDisplayName = (name: string): string => {
  const displayNames: Record<string, string> = {
    'standard': 'Standard',
    'ultimate': 'Ultimate',
    'pay_to_play': 'Pay to Play',
    'admin': 'Admin'
  };
  return displayNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
};

// Helper function to get description for membership types
const getDescription = (name: string): string => {
  const descriptions: Record<string, string> = {
    'pay_to_play': 'Perfect for occasional players',
    'standard': 'Perfect for regular players',
    'ultimate': 'Premium Experience with Maximum Benefits'
  };
  return descriptions[name] || '';
};

// Helper function to get translation key for a feature
export const getFeatureTranslationKey = (feature: string): string => {
  const translationKeys: Record<string, string> = {
    'Open Play Access': 'membershipFeatures.openPlayAccess',
    'League Play Access': 'membershipFeatures.leaguePlayAccess',
    'Court Reservations Access': 'membershipFeatures.courtReservationsAccess',
    'Lessons Access': 'membershipFeatures.lessonsAccess',
    'Clinics Access': 'membershipFeatures.clinicsAccess',
    'No Guest Passes': 'membershipFeatures.noGuestPasses',
    'No Early Club Access': 'membershipFeatures.noEarlyClubAccess',
    'Free Open Play': 'membershipFeatures.freeOpenPlay',
    '15% off League Play': 'membershipFeatures.discountLeaguePlay',
    '15% off Court Reservations': 'membershipFeatures.discountCourtReservations',
    '15% off Lessons': 'membershipFeatures.discountLessons',
    '15% off Clinics': 'membershipFeatures.discountClinics',
    'Two Guest Passes per Month': 'membershipFeatures.twoGuestPasses',
    'Early Access to the Club and Pre-Launch Events': 'membershipFeatures.earlyAccess',
    'Free League Play': 'membershipFeatures.freeLeaguePlay',
    '33% off Court Reservations': 'membershipFeatures.largeDiscountCourtReservations',
    '33% off Lessons': 'membershipFeatures.largeDiscountLessons',
    '33% off Clinics': 'membershipFeatures.largeDiscountClinics',
    'Four Guest Passes per Month': 'membershipFeatures.fourGuestPasses',
    'Full Access': 'membershipFeatures.fullAccess',
    'Administrative Tools': 'membershipFeatures.adminTools',
    'All Features Included': 'membershipFeatures.allFeaturesIncluded',
    'Access to facilities': 'membershipFeatures.basicAccess'
  };
  return translationKeys[feature] || feature;
};

// Helper function to get features for membership types
const getFeatures = (name: string): string[] => {
  const features: Record<string, string[]> = {
    'pay_to_play': [
      'Open Play Access',
      'League Play Access',
      'Court Reservations Access',
      'Lessons Access',
      'Clinics Access',
      'No Guest Passes',
      'No Early Club Access'
    ],
    'standard': [
      'Free Open Play',
      '15% off League Play',
      '15% off Court Reservations',
      '15% off Lessons',
      '15% off Clinics',
      'Two Guest Passes per Month',
      'Early Access to the Club and Pre-Launch Events'
    ],
    'ultimate': [
      'Free Open Play',
      'Free League Play',
      '33% off Court Reservations',
      '33% off Lessons',
      '33% off Clinics',
      'Four Guest Passes per Month',
      'Early Access to the Club and Pre-Launch Events'
    ],
    'admin': [
      'Full Access',
      'Administrative Tools',
      'All Features Included'
    ]
  };
  return features[name] || ['Access to facilities'];
};

// Helper function to format price for membership types
const getFormattedPrice = (name: string, cost_mxn: number): number => {
  const prices: Record<string, number> = {
    'standard': 1000,
    'ultimate': 2000,
    'pay_to_play': 0
  };
  return prices[name] !== undefined ? prices[name] : cost_mxn;
};

// Fetch all available membership types with their discounts
export const fetchMembershipTypes = async (): Promise<MembershipType[]> => {
  try {
    // Fetch membership types
    const { data: membershipTypes, error: membershipError } = await supabase
      .from('membership_types')
      .select(`
        id,
        name,
        description,
        cost_mxn,
        stripe_product_id
      `)
      .is('deleted_at', null)
      .order('cost_mxn', { ascending: true });

    if (membershipError) {
      console.error('Error fetching membership types:', membershipError);
      throw membershipError;
    }

    if (!membershipTypes) {
      return [];
    }

    // Fetch discounts for each membership type
    const membershipTypesWithDiscounts = await Promise.all(
      membershipTypes.map(async (membership) => {
        const { data: discounts, error: discountError } = await supabase
          .from('membership_event_discounts')
          .select(`
            discount_percentage,
            event_types (
              name
            )
          `)
          .eq('membership_type_id', membership.id);

        if (discountError) {
          console.error('Error fetching discounts:', discountError);
        }

        const formattedDiscounts: MembershipDiscount[] = (discounts || []).map(discount => ({
          eventType: (discount.event_types as any)?.name || 'Unknown',
          discountPercentage: discount.discount_percentage
        }));

        return {
          ...membership,
          displayName: getDisplayName(membership.name),
          description: getDescription(membership.name),
          cost_mxn: getFormattedPrice(membership.name, membership.cost_mxn),
          features: getFeatures(membership.name),
          discounts: formattedDiscounts
        };
      })
    );

    return membershipTypesWithDiscounts;
  } catch (error) {
    console.error('Error in fetchMembershipTypes:', error);
    throw error;
  }
};

// Fetch available locations
export const fetchLocations = async (): Promise<Location[]> => {
  try {
    const { data: locations, error } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        address,
        open,
        timezone,
        description
      `)
      .eq('show_location', true)
      .is('deleted_at', null)
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }

    return (locations || []) as Location[];
  } catch (error) {
    console.error('Error in fetchLocations:', error);
    throw error;
  }
};

// Get user's active memberships
export const fetchUserActiveMemberships = async (userId: string): Promise<UserMembership[]> => {
  try {
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        membership_type_id,
        location_id,
        status,
        start_date,
        end_date,
        created_at,
        updated_at,
        membership_types (
          id,
          name,
          description,
          cost_mxn
        ),
        locations (
          id,
          name,
          address
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching user memberships:', error);
      throw error;
    }

    return (memberships || []) as unknown as UserMembership[];
  } catch (error) {
    console.error('Error in fetchUserActiveMemberships:', error);
    throw error;
  }
};

// Get user's membership history
export const fetchUserMembershipHistory = async (userId: string): Promise<UserMembership[]> => {
  try {
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        membership_type_id,
        location_id,
        status,
        start_date,
        end_date,
        created_at,
        updated_at,
        membership_types (
          id,
          name,
          description,
          cost_mxn
        ),
        locations (
          id,
          name,
          address
        )
      `)
      .eq('user_id', userId)
      .neq('status', 'active')
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching membership history:', error);
      throw error;
    }

    return (memberships || []) as unknown as UserMembership[];
  } catch (error) {
    console.error('Error in fetchUserMembershipHistory:', error);
    throw error;
  }
};

// Validate checkout data
export interface CheckoutValidation {
  valid: boolean;
  totalAmount: number;
  currency: string;
  stripeProductId: string | null;
  errors: string[];
}

export const validateCheckout = async (
  membershipTypeId: number,
  locationId: number,
  userId: string
): Promise<CheckoutValidation> => {
  try {
    const errors: string[] = [];

    // Validate membership type
    const { data: membershipType, error: membershipError } = await supabase
      .from('membership_types')
      .select('id, cost_mxn, stripe_product_id, name')
      .eq('id', membershipTypeId)
      .is('deleted_at', null)
      .maybeSingle();

    if (membershipError || !membershipType) {
      errors.push('Invalid membership type selected');
    }

    // Validate location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('show_location', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (locationError || !location) {
      errors.push('Invalid location selected');
    }

    // Check if user already has active membership at this location
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (existingMembership) {
      errors.push('You already have an active membership at this location');
    }

    return {
      valid: errors.length === 0,
      totalAmount: membershipType?.cost_mxn || 0,
      currency: 'mxn',
      stripeProductId: membershipType?.stripe_product_id || null,
      errors
    };
  } catch (error) {
    console.error('Error validating checkout:', error);
    return {
      valid: false,
      totalAmount: 0,
      currency: 'mxn',
      stripeProductId: null,
      errors: ['An error occurred during validation']
    };
  }
};

// Create membership after successful payment
export const createMembership = async (
  userId: string,
  membershipTypeId: number,
  locationId: number,
  paymentIntentId: string
): Promise<UserMembership | null> => {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Monthly memberships

    const { data: membership, error } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        membership_type_id: membershipTypeId,
        location_id: locationId,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        metadata: {
          payment_intent_id: paymentIntentId,
          created_via: 'mobile_app'
        }
      })
      .select(`
        id,
        user_id,
        membership_type_id,
        location_id,
        status,
        start_date,
        end_date,
        created_at,
        updated_at,
        membership_types (
          id,
          name,
          description,
          cost_mxn
        ),
        locations (
          id,
          name,
          address
        )
      `)
      .single();

    if (error) {
      console.error('Error creating membership:', error);
      throw error;
    }

    return membership as unknown as UserMembership;
  } catch (error) {
    console.error('Error in createMembership:', error);
    throw error;
  }
};
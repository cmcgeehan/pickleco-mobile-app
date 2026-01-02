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

// Hardcoded membership IDs (aligned with web)
export const MEMBERSHIP_IDS = {
  pay_to_play: 16,
  standard: 15,
  ultimate: 1,
} as const;

// Hardcoded membership structure (aligned with web)
// Only prices are fetched dynamically from the database
const HARDCODED_MEMBERSHIPS: Omit<MembershipType, 'cost_mxn' | 'discounts'>[] = [
  {
    id: MEMBERSHIP_IDS.pay_to_play,
    name: 'pay_to_play',
    displayName: 'Pay to Play',
    description: 'Perfect for occasional players',
    stripe_product_id: null,
    features: [
      'Open Play Access',
      'League Play Access',
      'Court Reservations Access',
      'Lessons Access',
      'Clinics Access',
      'No Guest Passes',
      'No Early Club Access'
    ],
  },
  {
    id: MEMBERSHIP_IDS.standard,
    name: 'standard',
    displayName: 'Standard',
    description: 'Perfect for regular players',
    stripe_product_id: null,
    features: [
      'Free Open Play',
      '15% off League Play',
      '15% off Court Reservations',
      '15% off Lessons',
      '15% off Clinics',
      'Two Guest Passes per Month',
      'Early Access to the Club and Pre-Launch Events'
    ],
  },
  {
    id: MEMBERSHIP_IDS.ultimate,
    name: 'ultimate',
    displayName: 'Ultimate',
    description: 'Premium Experience with Maximum Benefits',
    stripe_product_id: null,
    features: [
      'Free Open Play',
      'Free League Play',
      '33% off Court Reservations',
      '33% off Lessons',
      '33% off Clinics',
      'Four Guest Passes per Month',
      'Early Access to the Club and Pre-Launch Events'
    ],
  },
];

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

// Fetch all available membership types with their discounts
// Uses hardcoded structure, only fetches prices dynamically from database
export const fetchMembershipTypes = async (): Promise<MembershipType[]> => {
  try {
    // Fetch only prices from database (aligned with web approach)
    const { data: dbPrices, error: priceError } = await supabase
      .from('membership_types')
      .select('name, cost_mxn, stripe_product_id')
      .is('deleted_at', null);

    if (priceError) {
      console.error('Error fetching membership prices:', priceError);
      // Continue with fallback prices if DB fetch fails
    }

    // Create a price lookup map from database
    const priceMap: Record<string, { cost_mxn: number; stripe_product_id: string | null }> = {};
    if (dbPrices) {
      dbPrices.forEach(item => {
        priceMap[item.name] = {
          cost_mxn: item.cost_mxn,
          stripe_product_id: item.stripe_product_id
        };
      });
    }

    // Fallback prices if not in database
    const fallbackPrices: Record<string, number> = {
      pay_to_play: 0,
      standard: 1000,
      ultimate: 2000,
    };

    // Fetch discounts for each hardcoded membership type
    const membershipTypesWithPrices = await Promise.all(
      HARDCODED_MEMBERSHIPS.map(async (membership) => {
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

        // Get price from database or use fallback
        const dbData = priceMap[membership.name];
        const cost_mxn = dbData?.cost_mxn ?? fallbackPrices[membership.name] ?? 0;
        const stripe_product_id = dbData?.stripe_product_id ?? membership.stripe_product_id;

        return {
          ...membership,
          cost_mxn,
          stripe_product_id,
          discounts: formattedDiscounts
        };
      })
    );

    return membershipTypesWithPrices;
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
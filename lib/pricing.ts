import { supabase } from './supabase';

export interface MembershipDiscount {
  membershipType: string;
  discountPercentage: number;
}

export interface PricingCalculation {
  basePrice: number;
  courtCost: number;
  coachCost: number;
  discountAmount: number;
  finalPrice: number;
  discountPercentage: number;
  membershipType?: string;
  paddleFee?: number;
}

// Guest fee per hour (matches web app)
export const GUEST_FEE_PER_HOUR = 200;

// Paddle rental fee per session (matches web app)
export const PADDLE_RENTAL_FEE = 50;

// Get user's active membership
export const getUserMembership = async (userId: string) => {
  try {
    const { data: membership, error } = await supabase
      .from('memberships')
      .select(`
        id,
        membership_type_id,
        status,
        start_date,
        end_date,
        membership_types (
          id,
          name,
          cost_mxn
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching membership:', error);
      return null;
    }

    return membership;
  } catch (error) {
    console.error('Error getting user membership:', error);
    return null;
  }
};

// Get membership discount for a specific event type
export const getMembershipDiscount = async (membershipTypeId: number, eventTypeId: string) => {
  try {
    const { data: discount, error } = await supabase
      .from('membership_event_discounts')
      .select('discount_percentage')
      .eq('membership_type_id', membershipTypeId)
      .eq('event_type_id', eventTypeId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching membership discount:', error);
      return 0;
    }

    return discount?.discount_percentage || 0;
  } catch (error) {
    console.error('Error getting membership discount:', error);
    return 0;
  }
};

// Get the court cost for a lesson based on user's membership
// This matches the web app's getEventPriceByName('Lesson', userId) logic
export const getLessonCourtPrice = async (userId: string): Promise<number> => {
  try {
    // Get the Lesson event type and its base cost
    const { data: eventType, error: eventTypeError } = await supabase
      .from('event_types')
      .select('id, cost_mxn')
      .eq('name', 'Lesson')
      .single();

    if (eventTypeError || !eventType) {
      console.warn('Lesson event type not found for court price');
      return 0;
    }

    const baseCourtPrice = eventType.cost_mxn ?? 0;

    // Check for active membership
    const now = new Date().toISOString();
    const { data: membership } = await supabase
      .from('memberships')
      .select('membership_type_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .lt('created_at', now)
      .or(`end_date.is.null,end_date.gt.${now}`)
      .maybeSingle();

    if (!membership?.membership_type_id) {
      return baseCourtPrice;
    }

    // Check for membership-specific price
    const { data: discount } = await supabase
      .from('membership_event_discounts')
      .select('price_mxn')
      .eq('membership_type_id', membership.membership_type_id)
      .eq('event_type_id', eventType.id)
      .maybeSingle();

    if (discount?.price_mxn !== null && discount?.price_mxn !== undefined) {
      return discount.price_mxn;
    }

    return baseCourtPrice;
  } catch (error) {
    console.error('Error getting lesson court price:', error);
    return 0;
  }
};

// Calculate lesson pricing with court cost + coach rate + membership discount
// Matches web formula: total = (courtPrice + coachRate) * hours + guestFee
export const calculateLessonPrice = async (
  userId: string,
  coachRate: number,
  durationHours: number = 1,
  guestCount: number = 0,
  rentPaddle: boolean = false
): Promise<PricingCalculation> => {
  try {
    // Get court price (already membership-adjusted)
    const courtPricePerHour = await getLessonCourtPrice(userId);

    const courtCost = courtPricePerHour * durationHours;
    const coachCost = coachRate * durationHours;
    const guestFee = guestCount * GUEST_FEE_PER_HOUR * durationHours;
    const paddleFee = rentPaddle ? PADDLE_RENTAL_FEE : 0;
    const basePrice = courtCost + coachCost + guestFee;
    const finalPrice = basePrice + paddleFee;

    // Get membership name for display
    const membership = await getUserMembership(userId);
    const membershipName = (membership?.membership_types && membership.membership_types.length > 0)
      ? membership.membership_types[0].name
      : 'No Membership';

    return {
      basePrice,
      courtCost,
      coachCost,
      discountAmount: 0, // Discount is already baked into courtPricePerHour
      finalPrice,
      discountPercentage: 0,
      membershipType: membershipName,
      paddleFee,
    };
  } catch (error) {
    console.error('Error calculating lesson price:', error);
    const coachCost = coachRate * durationHours;
    return {
      basePrice: coachCost,
      courtCost: 0,
      coachCost,
      discountAmount: 0,
      finalPrice: coachCost,
      discountPercentage: 0,
      paddleFee: 0,
    };
  }
};

// Calculate court reservation pricing with membership discount
export const calculateCourtPrice = async (
  userId: string,
  courtHourlyRate: number,
  durationHours: number = 1
): Promise<PricingCalculation> => {
  const basePrice = courtHourlyRate * durationHours;

  try {
    // Get user's membership
    const membership = await getUserMembership(userId);

    if (!membership || !membership.membership_types || membership.membership_types.length === 0) {
      return {
        basePrice,
        courtCost: basePrice,
        coachCost: 0,
        discountAmount: 0,
        finalPrice: basePrice,
        discountPercentage: 0,
        membershipType: 'No Membership'
      };
    }

    // Get court reservation event type ID
    const { data: eventType } = await supabase
      .from('event_types')
      .select('id')
      .ilike('name', '%court%')
      .or('name.ilike.%reservation%')
      .limit(1)
      .maybeSingle();

    if (!eventType) {
      console.warn('Court reservation event type not found, using base price');
      return {
        basePrice,
        courtCost: basePrice,
        coachCost: 0,
        discountAmount: 0,
        finalPrice: basePrice,
        discountPercentage: 0,
        membershipType: membership.membership_types[0].name
      };
    }

    // Get membership discount
    const discountPercentage = await getMembershipDiscount(membership.membership_type_id, eventType.id);
    const discountAmount = basePrice * discountPercentage / 100;
    const finalPrice = Math.max(0, basePrice - discountAmount);

    return {
      basePrice,
      courtCost: finalPrice,
      coachCost: 0,
      discountAmount,
      finalPrice,
      discountPercentage,
      membershipType: membership.membership_types[0].name
    };
  } catch (error) {
    console.error('Error calculating court price:', error);
    return {
      basePrice,
      courtCost: basePrice,
      coachCost: 0,
      discountAmount: 0,
      finalPrice: basePrice,
      discountPercentage: 0
    };
  }
};

// Format price for display
export const formatPrice = (priceInCents: number): string => {
  return `$${(priceInCents / 100).toFixed(2)}`;
};

// Format pricing calculation for display
export const formatPricingDisplay = (pricing: PricingCalculation) => {
  return {
    basePrice: formatPrice(pricing.basePrice * 100), // Convert to cents for formatting
    discountAmount: formatPrice(pricing.discountAmount * 100),
    finalPrice: formatPrice(pricing.finalPrice * 100),
    discountPercentage: `${pricing.discountPercentage}%`,
    membershipType: pricing.membershipType || 'No Membership'
  };
};

// Calculate pricing for a single additional hour (for add hour buttons)
export const calculateSingleHourPricing = async (
  userId: string,
  hourlyRate: number,
  eventType: 'lesson' | 'court'
): Promise<{ basePrice: number; finalPrice: number; discountAmount: number; discountPercentage: number }> => {
  try {
    let pricingResult: PricingCalculation;
    
    if (eventType === 'lesson') {
      pricingResult = await calculateLessonPrice(userId, hourlyRate, 1);
    } else {
      pricingResult = await calculateCourtPrice(userId, hourlyRate, 1);
    }
    
    return {
      basePrice: pricingResult.basePrice,
      finalPrice: pricingResult.finalPrice,
      discountAmount: pricingResult.discountAmount,
      discountPercentage: pricingResult.discountPercentage
    };
  } catch (error) {
    console.error('Error calculating single hour pricing:', error);
    return {
      basePrice: hourlyRate,
      finalPrice: hourlyRate,
      discountAmount: 0,
      discountPercentage: 0
    };
  }
};

// Update auth store to fetch membership data
export const updateAuthStoreProfileWithMembership = async (userId: string) => {
  try {
    const membership = await getUserMembership(userId);
    return {
      active_membership: membership,
      membership_history: [] // TODO: Implement membership history if needed
    };
  } catch (error) {
    console.error('Error updating profile with membership:', error);
    return {
      active_membership: null,
      membership_history: []
    };
  }
};
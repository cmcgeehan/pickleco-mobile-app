/**
 * Input validation and sanitization utilities
 */

// Phone number validation
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Name validation (no special characters except spaces, hyphens, apostrophes)
export const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-ZÀ-ÿ\s\-\']+$/;
  return nameRegex.test(name) && name.trim().length >= 2 && name.trim().length <= 50;
};

// Sanitize string input (remove potentially dangerous characters)
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>\"'&]/g, '') // Remove basic HTML/JS injection chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 255); // Limit length
};

// Sanitize phone number (keep only digits and +)
export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d\+\-\(\)\s]/g, '').trim();
};

// Validate membership type
export const validateMembershipType = (type: string): boolean => {
  const validTypes = ['pay_to_play', 'standard', 'ultimate'];
  return validTypes.includes(type);
};

// Validate user ID format (UUID)
export const validateUserId = (userId: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
};

// Validate event ID format
export const validateEventId = (eventId: string): boolean => {
  return validateUserId(eventId); // Same format as UUID
};

// Validate numeric input
export const validateNumber = (value: any, min?: number, max?: number): boolean => {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

// Validate date string (ISO format)
export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes('T'); // Ensure ISO format
};

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Content Security Policy helper for external URLs
export const validateExternalUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      'thepickleco.mx',
      'www.thepickleco.mx',
      'api.stripe.com',
      'maps.google.com',
      'api.whatsapp.com',
      'chat.whatsapp.com',
      'www.instagram.com',
      'images.unsplash.com',
      'omqdrgqzlksexruickvh.supabase.co'
    ];
    
    return allowedHosts.some(host => 
      urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
};
/**
 * Security configuration and utilities
 */
import { RateLimiter, validateExternalUrl } from './validation';

// Security constants
export const SECURITY_CONFIG = {
  // Request timeouts
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  AUTH_TIMEOUT: 45000, // 45 seconds for auth requests
  UPLOAD_TIMEOUT: 120000, // 2 minutes for file uploads
  
  // Rate limiting
  API_RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60000, // 1 minute
  },
  
  AUTH_RATE_LIMIT: {
    MAX_REQUESTS: 5,
    WINDOW_MS: 300000, // 5 minutes
  },
  
  UPLOAD_RATE_LIMIT: {
    MAX_REQUESTS: 10,
    WINDOW_MS: 300000, // 5 minutes
  },
  
  // File upload security
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'webp'],
  
  // Content Security Policy
  ALLOWED_DOMAINS: [
    'thepickleco.mx',
    'www.thepickleco.mx',
    'api.stripe.com',
    'maps.google.com',
    'api.whatsapp.com',
    'chat.whatsapp.com',
    'www.instagram.com',
    'images.unsplash.com',
    'omqdrgqzlksexruickvh.supabase.co',
    'exp.host' // For Expo push notifications
  ],
  
  // Session management
  SESSION_CHECK_INTERVAL: 300000, // 5 minutes
  IDLE_TIMEOUT: 3600000, // 1 hour
};

// Rate limiters for different types of requests
export const rateLimiters = {
  api: new RateLimiter(
    SECURITY_CONFIG.API_RATE_LIMIT.MAX_REQUESTS,
    SECURITY_CONFIG.API_RATE_LIMIT.WINDOW_MS
  ),
  auth: new RateLimiter(
    SECURITY_CONFIG.AUTH_RATE_LIMIT.MAX_REQUESTS,
    SECURITY_CONFIG.AUTH_RATE_LIMIT.WINDOW_MS
  ),
  upload: new RateLimiter(
    SECURITY_CONFIG.UPLOAD_RATE_LIMIT.MAX_REQUESTS,
    SECURITY_CONFIG.UPLOAD_RATE_LIMIT.WINDOW_MS
  ),
};

/**
 * Check if user can make a request based on rate limiting
 */
export const canMakeRequest = (
  type: 'api' | 'auth' | 'upload',
  userId: string
): boolean => {
  return rateLimiters[type].canMakeRequest(userId);
};

/**
 * Validate file upload security
 */
export const validateFileUpload = (file: {
  size?: number;
  type?: string;
  uri: string;
}): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size && file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds maximum allowed size (10MB)'
    };
  }
  
  // Check file extension
  const extension = file.uri.split('.').pop()?.toLowerCase();
  if (!extension || !SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.includes(extension)) {
    return {
      valid: false,
      error: 'File type not allowed. Please use JPG, PNG, or WebP images.'
    };
  }
  
  return { valid: true };
};

/**
 * Sanitize URLs for external links
 */
export const sanitizeExternalUrl = (url: string): string | null => {
  if (!validateExternalUrl(url)) {
    console.warn('Blocked potentially unsafe external URL:', url);
    return null;
  }
  return url;
};

/**
 * Create secure headers for API requests
 */
export const getSecureHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    // Add security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
};

/**
 * Security monitoring - log security events
 */
export const logSecurityEvent = (
  event: 'rate_limit_exceeded' | 'invalid_file_upload' | 'unsafe_url_blocked' | 'auth_failure',
  details: Record<string, any>
) => {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    ...details,
    // Don't log sensitive information
    sanitized: true
  };
  
  if (__DEV__) {
    console.warn('Security Event:', logEntry);
  }
  
  // In production, you might want to send these to a monitoring service
  // Example: securityMonitoring.log(logEntry);
};

/**
 * Validate session and check for potential security issues
 */
export const validateSession = (session: any): {
  valid: boolean;
  reason?: string;
} => {
  if (!session) {
    return { valid: false, reason: 'No session' };
  }
  
  if (!session.access_token) {
    return { valid: false, reason: 'No access token' };
  }
  
  // Check if token is expired (with some buffer time)
  if (session.expires_at && Date.now() / 1000 > session.expires_at - 60) {
    return { valid: false, reason: 'Token expired' };
  }
  
  return { valid: true };
};

/**
 * Clean sensitive data from objects for logging
 */
export const sanitizeForLogging = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'access_token',
    'refresh_token',
    'client_secret',
    'authorization',
    'cookie',
    'session'
  ];
  
  const sanitized = { ...obj };
  
  Object.keys(sanitized).forEach(key => {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  });
  
  return sanitized;
};
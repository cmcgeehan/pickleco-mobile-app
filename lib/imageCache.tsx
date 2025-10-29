/**
 * Image caching and optimization utilities
 */
import { Image, ImageProps } from 'react-native';
import { imageUploadService } from './imageUploadService';

interface CachedImage {
  uri: string;
  timestamp: number;
  size?: number;
}

class ImageCacheService {
  private cache = new Map<string, CachedImage>();
  private maxCacheSize = 50; // Maximum number of cached images
  private maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get cached image URI or load from service
   */
  async getCachedImageUri(userId: string): Promise<string | null> {
    const cacheKey = `user_avatar_${userId}`;
    const cached = this.cache.get(cacheKey);

    // Check if cached and not expired
    if (cached && Date.now() - cached.timestamp < this.maxCacheAge) {
      return cached.uri;
    }

    try {
      // Load from service
      const uri = await imageUploadService.getUserAvatarUrl(userId);
      
      if (uri) {
        // Cache the result
        this.cache.set(cacheKey, {
          uri,
          timestamp: Date.now()
        });
        
        // Cleanup old cache entries
        this.cleanupCache();
      }

      return uri;
    } catch (error) {
      console.error('Error loading cached image:', error);
      return null;
    }
  }

  /**
   * Preload multiple images for better UX
   */
  async preloadImages(userIds: string[]): Promise<void> {
    const promises = userIds.map(userId => this.getCachedImageUri(userId));
    await Promise.allSettled(promises);
  }

  /**
   * Clear expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, cached]) => {
      if (now - cached.timestamp > this.maxCacheAge) {
        this.cache.delete(key);
      }
    });

    // If still too many entries, remove oldest ones
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.cache.size - this.maxCacheSize);
      
      sortedEntries.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Prefetch image to improve loading performance
   */
  async prefetchImage(uri: string): Promise<void> {
    try {
      await Image.prefetch(uri);
    } catch (error) {
      console.warn('Failed to prefetch image:', uri, error);
    }
  }

  /**
   * Get optimized image props with proper error handling
   */
  getOptimizedImageProps(uri: string | null): Partial<ImageProps> {
    if (!uri) {
      return {};
    }

    return {
      source: { uri },
      resizeMode: 'cover',
      loadingIndicatorSource: require('../assets/images/placeholder.png'), // Add placeholder
      onError: (error) => {
        console.warn('Image load error:', uri, error.nativeEvent?.error);
      }
    };
  }
}

export const imageCacheService = new ImageCacheService();

// Higher-order component for optimized image loading
export const OptimizedImage = ({ source, ...props }: ImageProps) => {
  if (!source || (typeof source === 'object' && !Array.isArray(source) && !source.uri)) {
    return null;
  }

  return (
    <Image
      {...props}
      {...(typeof source === 'object' && !Array.isArray(source) && source.uri 
        ? imageCacheService.getOptimizedImageProps(source.uri)
        : { source }
      )}
    />
  );
};
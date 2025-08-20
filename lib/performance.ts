/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private memoryWarningThreshold = 100 * 1024 * 1024; // 100MB

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End timing and record the metric
   */
  endTiming(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations in development
    if (__DEV__ && duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Monitor memory usage (if available)
   */
  checkMemoryUsage(): void {
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const limit = memory.jsHeapSizeLimit;

      if (used > this.memoryWarningThreshold) {
        console.warn(`High memory usage detected: ${(used / 1024 / 1024).toFixed(2)}MB used`);
      }

      if (__DEV__) {
        console.log(`Memory usage: ${(used / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB (limit: ${(limit / 1024 / 1024).toFixed(2)}MB)`);
      }
    }
  }

  /**
   * Report performance summary
   */
  getPerformanceSummary(): {
    totalMetrics: number;
    slowOperations: PerformanceMetric[];
    averageDuration: number;
  } {
    const completedMetrics = this.getMetrics();
    const slowOperations = completedMetrics.filter(m => (m.duration || 0) > 1000);
    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = completedMetrics.length > 0 ? totalDuration / completedMetrics.length : 0;

    return {
      totalMetrics: completedMetrics.length,
      slowOperations,
      averageDuration
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order function to automatically time async functions
 */
export const withPerformanceTracking = <T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T => {
  return (async (...args: any[]) => {
    performanceMonitor.startTiming(name);
    try {
      const result = await fn(...args);
      return result;
    } finally {
      performanceMonitor.endTiming(name);
    }
  }) as T;
};

/**
 * Debounce function to prevent excessive calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T => {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: any[]) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  }) as T;
};

/**
 * Throttle function to limit call frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

/**
 * Lazy loading helper for components
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  return React.lazy(() => {
    performanceMonitor.startTiming('lazy_load_component');
    return importFn().finally(() => {
      performanceMonitor.endTiming('lazy_load_component');
    });
  });
};

/**
 * Memory cleanup utility
 */
export class MemoryManager {
  private cleanupTasks: (() => void)[] = [];

  /**
   * Register a cleanup task
   */
  registerCleanup(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Run all cleanup tasks
   */
  cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    this.cleanupTasks = [];
  }

  /**
   * Auto-cleanup on low memory
   */
  setupAutoCleanup(): void {
    // Check memory periodically
    const checkInterval = setInterval(() => {
      performanceMonitor.checkMemoryUsage();
    }, 30000); // Every 30 seconds

    this.registerCleanup(() => {
      clearInterval(checkInterval);
    });
  }
}

export const memoryManager = new MemoryManager();

// React import for lazy loading
import React from 'react';
/**
 * Crash reporting and error monitoring for The Pickle Co mobile app
 * Provides comprehensive error tracking and diagnostics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CrashReport {
  id: string;
  timestamp: string;
  type: 'javascript' | 'native' | 'network' | 'auth' | 'startup';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: {
    component?: string;
    screen?: string;
    action?: string;
    userId?: string;
    sessionId: string;
  };
  deviceInfo: {
    platform: string;
    version: string;
    model?: string;
    memory?: number;
  };
  appInfo: {
    version: string;
    buildNumber: string;
    environment: string;
  };
  breadcrumbs: Breadcrumb[];
}

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

class CrashReporter {
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private maxBreadcrumbs = 50;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.addBreadcrumb('session', 'Session started', 'info');
  }

  /**
   * Report a JavaScript error
   */
  reportError(error: Error, context: Partial<CrashReport['context']> = {}): string {
    const reportId = this.generateReportId();
    
    const report: CrashReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      type: 'javascript',
      severity: this.determineSeverity(error, context),
      message: error.message,
      stack: error.stack,
      context: {
        sessionId: this.sessionId,
        ...context
      },
      deviceInfo: this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
      breadcrumbs: [...this.breadcrumbs]
    };

    this.processCrashReport(report);
    return reportId;
  }

  /**
   * Report a startup failure
   */
  reportStartupFailure(message: string, context: Record<string, any> = {}): string {
    const reportId = this.generateReportId();
    
    const report: CrashReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      type: 'startup',
      severity: 'critical',
      message: `Startup failure: ${message}`,
      context: {
        sessionId: this.sessionId,
        ...context
      },
      deviceInfo: this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
      breadcrumbs: [...this.breadcrumbs]
    };

    this.processCrashReport(report);
    return reportId;
  }

  /**
   * Report an authentication error
   */
  reportAuthError(error: Error, context: Record<string, any> = {}): string {
    const reportId = this.generateReportId();
    
    const report: CrashReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      type: 'auth',
      severity: 'high',
      message: `Auth error: ${error.message}`,
      stack: error.stack,
      context: {
        sessionId: this.sessionId,
        ...context
      },
      deviceInfo: this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
      breadcrumbs: [...this.breadcrumbs]
    };

    this.processCrashReport(report);
    return reportId;
  }

  /**
   * Add a breadcrumb for tracking user actions
   */
  addBreadcrumb(category: string, message: string, level: Breadcrumb['level'] = 'info', data?: Record<string, any>): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);
    
    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Set user context for crash reports
   */
  setUserContext(userId: string, additionalContext: Record<string, any> = {}): void {
    this.addBreadcrumb('user', `User context set: ${userId}`, 'info', additionalContext);
  }

  /**
   * Clear all breadcrumbs (useful for sensitive operations)
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
    this.addBreadcrumb('system', 'Breadcrumbs cleared', 'info');
  }

  /**
   * Process and store the crash report
   */
  private processCrashReport(report: CrashReport): void {
    // Log to console for debugging
    if (__DEV__) {
      console.error('🚨 Crash Report Generated:', report);
    }

    // Store locally for later upload
    this.storeReportLocally(report);

    // Send to monitoring service if available
    this.sendToMonitoringService(report);
  }

  /**
   * Store crash report locally using AsyncStorage
   */
  private async storeReportLocally(report: CrashReport): Promise<void> {
    try {
      const storageKey = `crash_report_${report.id}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(report));
      
      // Keep track of crash report keys
      const existingKeys = await AsyncStorage.getItem('crash_report_keys') || '[]';
      const keys = JSON.parse(existingKeys);
      keys.push(storageKey);
      
      // Keep only last 10 crash reports to avoid storage bloat
      if (keys.length > 10) {
        const oldKeys = keys.splice(0, keys.length - 10);
        for (const oldKey of oldKeys) {
          await AsyncStorage.removeItem(oldKey);
        }
      }
      
      await AsyncStorage.setItem('crash_report_keys', JSON.stringify(keys));
    } catch (error) {
      console.error('Failed to store crash report locally:', error);
    }
  }

  /**
   * Send crash report to monitoring service
   */
  private sendToMonitoringService(report: CrashReport): void {
    // In a production app, you would send this to a service like:
    // - Sentry
    // - Bugsnag  
    // - Crashlytics
    // - Custom logging endpoint
    
    if (__DEV__) {
      console.log('📡 Would send crash report to monitoring service:', report.id);
    }
    
    // For now, just log critical errors
    if (report.severity === 'critical') {
      console.error('CRITICAL ERROR REPORTED:', {
        id: report.id,
        message: report.message,
        timestamp: report.timestamp
      });
    }
  }

  /**
   * Determine error severity based on error and context
   */
  private determineSeverity(error: Error, context: Partial<CrashReport['context']>): CrashReport['severity'] {
    const message = error.message.toLowerCase();
    
    // Critical errors that prevent app from functioning
    if (message.includes('network error') || 
        message.includes('connection') ||
        message.includes('auth') ||
        context.component === 'App' ||
        context.component === 'AuthProvider') {
      return 'critical';
    }
    
    // High severity errors that impact user experience
    if (message.includes('payment') ||
        message.includes('stripe') ||
        message.includes('checkout') ||
        context.screen === 'MembershipScreen') {
      return 'high';
    }
    
    // Medium severity for UI errors
    if (message.includes('render') ||
        message.includes('component') ||
        context.component) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): CrashReport['deviceInfo'] {
    return {
      platform: 'ios', // or detect dynamically
      version: '1.0.0', // get from app config
      model: 'unknown', // would use react-native-device-info in production
      memory: undefined // would use react-native-device-info in production
    };
  }

  /**
   * Get app information
   */
  private getAppInfo(): CrashReport['appInfo'] {
    return {
      version: '1.0.0',
      buildNumber: '5',
      environment: __DEV__ ? 'development' : 'production'
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get stored crash reports for uploading
   */
  async getStoredCrashReports(): Promise<CrashReport[]> {
    try {
      const keysJson = await AsyncStorage.getItem('crash_report_keys') || '[]';
      const keys = JSON.parse(keysJson);
      
      const reports: CrashReport[] = [];
      for (const key of keys) {
        const reportJson = await AsyncStorage.getItem(key);
        if (reportJson) {
          reports.push(JSON.parse(reportJson));
        }
      }
      
      return reports;
    } catch (error) {
      console.error('Failed to retrieve stored crash reports:', error);
      return [];
    }
  }

  /**
   * Clear all stored crash reports
   */
  async clearStoredCrashReports(): Promise<void> {
    try {
      const keysJson = await AsyncStorage.getItem('crash_report_keys') || '[]';
      const keys = JSON.parse(keysJson);
      
      for (const key of keys) {
        await AsyncStorage.removeItem(key);
      }
      
      await AsyncStorage.removeItem('crash_report_keys');
    } catch (error) {
      console.error('Failed to clear stored crash reports:', error);
    }
  }
}

// Global crash reporter instance
export const crashReporter = new CrashReporter();

// Enhanced error boundary hook
export function useErrorBoundaryHandler() {
  return {
    reportError: (error: Error, context?: Record<string, any>) => {
      return crashReporter.reportError(error, context);
    },
    addBreadcrumb: (category: string, message: string, level?: Breadcrumb['level']) => {
      crashReporter.addBreadcrumb(category, message, level);
    }
  };
}
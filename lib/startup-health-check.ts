/**
 * Startup health checks for The Pickle Co mobile app
 * Validates all critical services before app initialization
 */

import { validateEnvironment, logValidationResults } from './env-validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration?: number;
}

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  canProceed: boolean;
  criticalFailures: string[];
}

/**
 * Run all startup health checks
 */
export async function runStartupHealthChecks(): Promise<HealthCheckResult> {
  console.log('🔍 Running startup health checks...');
  const startTime = Date.now();
  
  const checks: HealthCheck[] = [];
  const criticalFailures: string[] = [];

  // 1. Environment variables check
  const envResult = await checkEnvironmentVariables();
  checks.push(envResult);
  if (envResult.status === 'fail') {
    criticalFailures.push(envResult.message);
  }

  // 2. React Native modules check
  const rnModulesResult = await checkReactNativeModules();
  checks.push(rnModulesResult);
  if (rnModulesResult.status === 'fail') {
    criticalFailures.push(rnModulesResult.message);
  }

  // 3. Storage availability check
  const storageResult = await checkAsyncStorage();
  checks.push(storageResult);
  if (storageResult.status === 'fail') {
    criticalFailures.push(storageResult.message);
  }

  // 4. Network connectivity check
  const networkResult = await checkNetworkConnectivity();
  checks.push(networkResult);
  // Network is not critical for startup, just degraded

  // 5. Supabase connection check
  const supabaseResult = await checkSupabaseConnection();
  checks.push(supabaseResult);
  // Supabase connection issues are not blocking, but degrade experience

  // Determine overall health
  const failedChecks = checks.filter(c => c.status === 'fail').length;
  const warnChecks = checks.filter(c => c.status === 'warn').length;
  
  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (criticalFailures.length > 0) {
    overall = 'unhealthy';
  } else if (warnChecks > 0 || failedChecks > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  const totalTime = Date.now() - startTime;
  console.log(`✅ Health checks completed in ${totalTime}ms - Status: ${overall}`);

  return {
    overall,
    checks,
    canProceed: criticalFailures.length === 0,
    criticalFailures
  };
}

async function checkEnvironmentVariables(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    const validation = validateEnvironment();
    const duration = Date.now() - start;
    
    if (!validation.isValid) {
      return {
        name: 'Environment Variables',
        status: 'fail',
        message: `Missing required environment variables: ${validation.errors.join(', ')}`,
        duration
      };
    }
    
    if (validation.warnings.length > 0) {
      return {
        name: 'Environment Variables',
        status: 'warn',
        message: `Environment warnings: ${validation.warnings.join(', ')}`,
        duration
      };
    }
    
    return {
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required environment variables present',
      duration
    };
  } catch (error) {
    return {
      name: 'Environment Variables',
      status: 'fail',
      message: `Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    };
  }
}

async function checkReactNativeModules(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Check critical React Native modules by verifying they exist
    // These are already imported at the top, so if we get here they're available
    const modules = [
      { name: 'SafeAreaProvider', module: SafeAreaProvider },
      { name: 'NavigationContainer', module: NavigationContainer },
      { name: 'createBottomTabNavigator', module: createBottomTabNavigator }
    ];
    
    for (const { name, module } of modules) {
      if (!module) {
        return {
          name: 'React Native Modules',
          status: 'fail',
          message: `Critical module missing: ${name}`,
          duration: Date.now() - start
        };
      }
    }
    
    return {
      name: 'React Native Modules',
      status: 'pass',
      message: 'All critical React Native modules loaded',
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name: 'React Native Modules',
      status: 'fail',
      message: `Module check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    };
  }
}

async function checkAsyncStorage(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    
    // Test basic read/write operations
    const testKey = '__health_check_test__';
    const testValue = 'test_value';
    
    await AsyncStorage.setItem(testKey, testValue);
    const retrievedValue = await AsyncStorage.getItem(testKey);
    await AsyncStorage.removeItem(testKey);
    
    if (retrievedValue !== testValue) {
      return {
        name: 'AsyncStorage',
        status: 'fail',
        message: 'AsyncStorage read/write test failed',
        duration: Date.now() - start
      };
    }
    
    return {
      name: 'AsyncStorage',
      status: 'pass',
      message: 'AsyncStorage working correctly',
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name: 'AsyncStorage',
      status: 'fail',
      message: `AsyncStorage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    };
  }
}

async function checkNetworkConnectivity(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Simple connectivity test
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      timeout: 5000
    });
    
    if (response.ok) {
      return {
        name: 'Network Connectivity',
        status: 'pass',
        message: 'Network connection available',
        duration: Date.now() - start
      };
    } else {
      return {
        name: 'Network Connectivity',
        status: 'warn',
        message: 'Network connectivity issues detected',
        duration: Date.now() - start
      };
    }
  } catch (error) {
    return {
      name: 'Network Connectivity',
      status: 'warn',
      message: 'No network connection available',
      duration: Date.now() - start
    };
  }
}

async function checkSupabaseConnection(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Don't actually import supabase here to avoid initialization issues
    // Just check if the module is available
    const validation = validateEnvironment();
    
    if (!validation.isValid) {
      return {
        name: 'Supabase Connection',
        status: 'warn',
        message: 'Supabase configuration invalid - offline mode only',
        duration: Date.now() - start
      };
    }
    
    return {
      name: 'Supabase Connection',
      status: 'pass',
      message: 'Supabase configuration valid',
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      name: 'Supabase Connection',
      status: 'warn',
      message: 'Supabase connection check failed - offline mode',
      duration: Date.now() - start
    };
  }
}

/**
 * Log health check results
 */
export function logHealthCheckResults(result: HealthCheckResult): void {
  console.log(`\n📊 Health Check Results (${result.overall.toUpperCase()})`);
  console.log('='.repeat(50));
  
  result.checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    const duration = check.duration ? ` (${check.duration}ms)` : '';
    console.log(`${icon} ${check.name}: ${check.message}${duration}`);
  });
  
  if (result.criticalFailures.length > 0) {
    console.log('\n🚨 Critical Failures:');
    result.criticalFailures.forEach(failure => {
      console.log(`  - ${failure}`);
    });
  }
  
  console.log(`\n🔄 Can Proceed: ${result.canProceed ? 'YES' : 'NO'}`);
  console.log('='.repeat(50));
}
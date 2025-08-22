import React, { useState, useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import PlayScreen from './screens/PlayScreen';
import LessonsScreen from './screens/LessonsScreen';
import CalendarScreen from './screens/CalendarScreen';
import MoreScreen from './screens/MoreScreen';
import MembershipScreen from './screens/MembershipScreen';
import ActionModal from './components/ActionModal';
import CourtReservationWizard from './components/CourtReservationWizard';
import LessonBookingWizard from './components/LessonBookingWizard';
import { AuthProvider } from './components/AuthProvider';
import { useAuthStore } from './stores/authStore';
import LoginScreen from './screens/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { performanceMonitor, memoryManager } from './lib/performance';
import { runStartupHealthChecks, logHealthCheckResults } from './lib/startup-health-check';
import { crashReporter } from './lib/crash-reporter';

const Tab = createBottomTabNavigator();

// Component that has access to navigation for modal actions
function ActionModalWrapper({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const navigation = useNavigation<any>();
  const [showCourtWizard, setShowCourtWizard] = useState(false);
  const [showLessonWizard, setShowLessonWizard] = useState(false);
  
  const handleViewAllEvents = () => {
    navigation.navigate('Calendar');
  };

  const handleBookLesson = () => {
    setShowLessonWizard(true);
  };

  const handleReserveCourt = () => {
    setShowCourtWizard(true);
  };

  const handleWizardSuccess = () => {
    // Optionally navigate to a specific screen after successful booking
    navigation.navigate('Calendar');
  };

  return (
    <>
      <ActionModal
        visible={visible}
        onClose={onClose}
        onViewAllEvents={handleViewAllEvents}
        onBookLesson={handleBookLesson}
        onReserveCourt={handleReserveCourt}
      />
      
      <CourtReservationWizard
        visible={showCourtWizard}
        onClose={() => setShowCourtWizard(false)}
        onSuccess={handleWizardSuccess}
      />
      
      <LessonBookingWizard
        visible={showLessonWizard}
        onClose={() => setShowLessonWizard(false)}
        onSuccess={handleWizardSuccess}
      />
    </>
  );
}

function MainApp() {
  const { user } = useAuthStore()
  const [showActionModal, setShowActionModal] = useState(false)

  useEffect(() => {
    // Run startup health checks
    const initializeApp = async () => {
      try {
        crashReporter.addBreadcrumb('app', 'Starting app initialization', 'info');
        
        // Initialize performance monitoring and memory management
        memoryManager.setupAutoCleanup();
        performanceMonitor.startTiming('app_initialization');
        
        // Run health checks
        const healthResult = await runStartupHealthChecks();
        logHealthCheckResults(healthResult);
        
        if (!healthResult.canProceed) {
          crashReporter.reportStartupFailure('Critical health checks failed', {
            failures: healthResult.criticalFailures,
            checks: healthResult.checks
          });
        }
        
        crashReporter.addBreadcrumb('app', 'App initialization completed', 'info');
      } catch (error) {
        console.error('App initialization error:', error);
        crashReporter.reportStartupFailure(
          error instanceof Error ? error.message : 'Unknown initialization error',
          { error: String(error) }
        );
      }
    };

    initializeApp();
    
    return () => {
      performanceMonitor.endTiming('app_initialization');
      memoryManager.cleanup();
    };
  }, []);

  if (!user) {
    return <LoginScreen />
  }

  // Empty component for plus tab
  const PlusTabScreen = () => null;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              if (route.name === 'Plus') {
                return (
                  <View style={styles.plusIconContainer}>
                    <Text style={styles.plusIcon}>+</Text>
                  </View>
                );
              }
              return (
                <Text style={{ fontSize: size - 4, color }}>
                  {route.name === 'Home' ? '🏠' : 
                   route.name === 'Membership' ? '💎' : 
                   route.name === 'Calendar' ? '📅' : 
                   route.name === 'More' ? '☰' : '❓'}
                </Text>
              );
            },
            tabBarActiveTintColor: '#2A62A2',
            tabBarInactiveTintColor: '#64748B',
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
            },
            tabBarButton: route.name === 'Plus' ? (props) => (
              <TouchableOpacity
                onPress={() => setShowActionModal(true)}
                style={styles.plusTabButton}
                accessible={props.accessible}
                accessibilityRole={props.accessibilityRole}
                accessibilityState={props.accessibilityState}
                accessibilityLabel={props.accessibilityLabel}
              />
            ) : undefined,
        })}
      >
        <Tab.Screen name="Home" component={PlayScreen} />
        <Tab.Screen name="Membership" component={MembershipScreen} />
        <Tab.Screen 
          name="Plus" 
          component={PlusTabScreen}
          options={{
            tabBarLabel: '',
          }}
        />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
      
      <ActionModalWrapper
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
      />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  try {
    // Use test key for development, live key for production
    const stripePublishableKey = process.env.EXPO_PUBLIC_TEST_STRIPE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    console.log('App initialization - Stripe key available:', !!stripePublishableKey);

    // For now, proceed without Stripe if key is missing (development mode)
    // This allows the app to function for testing basic features
    if (!stripePublishableKey) {
      console.warn('Stripe publishable key is missing. Payment features will be disabled.');
      return (
        <ErrorBoundary>
          <SafeAreaProvider>
            <AuthProvider>
              <MainApp />
            </AuthProvider>
          </SafeAreaProvider>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StripeProvider
            publishableKey={stripePublishableKey}
            merchantIdentifier="merchant.com.pickleco.mobile"
            urlScheme="picklemobile"
          >
            <AuthProvider>
              <MainApp />
            </AuthProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Critical error during app initialization:', error);
    // Return a minimal error screen
    return (
      <SafeAreaProvider>
        <View style={styles.screen}>
          <Text style={styles.title}>App Initialization Error</Text>
          <Text style={styles.subtitle}>Please restart the app or contact support if this persists.</Text>
        </View>
      </SafeAreaProvider>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2A62A2',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  plusTabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A62A2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  plusIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
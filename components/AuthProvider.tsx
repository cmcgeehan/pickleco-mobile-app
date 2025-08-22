import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, initialized, loading } = useAuthStore()
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Starting initialization...')
        await initialize()
        console.log('AuthProvider: Initialization completed successfully')
      } catch (error) {
        console.error('AuthProvider: Initialization failed:', error)
        setInitError(error instanceof Error ? error.message : 'Failed to initialize authentication')
      }
    }

    initializeAuth()
  }, [])

  if (initError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Authentication Error</Text>
        <Text style={styles.errorDetail}>
          Unable to initialize authentication. Please check your internet connection and restart the app.
        </Text>
      </View>
    )
  }

  if (!initialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A62A2" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
})
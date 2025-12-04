import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import CountryCodePicker, { 
  DEFAULT_COUNTRY, 
  getFullPhoneNumber,
  type Country 
} from '@/components/CountryCodePicker'

export default function LoginScreen() {
  const { signIn, signUp, loading } = useAuthStore()
  const { t } = useTranslation()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY)

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.emailPasswordRequired'))
      return false
    }

    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      Alert.alert(t('common.error'), t('auth.nameRequired'))
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert(t('common.error'), t('auth.validEmailRequired'))
      return false
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordMinLength'))
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      if (isSignUp) {
        // Combine country code with phone number
        const fullPhoneNumber = phoneNumber ? getFullPhoneNumber(selectedCountry, phoneNumber) : null
        
        await signUp(email, password, {
          first_name: firstName,
          last_name: lastName,
          phone: fullPhoneNumber,
        })
        Alert.alert(t('common.success'), t('auth.accountCreatedSuccess'))
      } else {
        await signIn(email, password)
        Alert.alert(t('common.success'), t('auth.welcomeBack'))
      }
    } catch (error) {
      console.error('Auth error:', error)
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Authentication failed'
      )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.languageSwitcherContainer}>
            <LanguageSwitcher />
          </View>
          
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: 'https://omqdrgqzlksexruickvh.supabase.co/storage/v1/object/public/email-images/thePickleCoLogoBlue.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>
            {isSignUp ? 'Join The Pickle Co.' : 'Welcome Back to The Pickle Co.'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Sign up to start playing at Mexico City\'s largest pickleball club' : 'Sign in to your account'}
          </Text>

          {isSignUp && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter first name"
                  placeholderTextColor="#64748B"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter last name"
                  placeholderTextColor="#64748B"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone (Optional)</Text>
                <CountryCodePicker
                  selectedCountry={selectedCountry}
                  onSelectCountry={setSelectedCountry}
                  phoneNumber={phoneNumber}
                  onChangePhoneNumber={setPhoneNumber}
                  placeholder="Phone number"
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#64748B"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isSignUp ? t('auth.signUp') : t('auth.signIn')}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.footerLink}>
                {isSignUp ? t('auth.signIn') : t('auth.signUp')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  languageSwitcherContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A62A2',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#020817',
    backgroundColor: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#2A62A2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 4,
  },
  footerLink: {
    fontSize: 14,
    color: '#2A62A2',
    fontWeight: '600',
  },
})
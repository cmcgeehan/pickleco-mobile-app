import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase configuration:', {
  url: supabaseUrl ? 'configured' : 'missing',
  key: supabaseAnonKey ? 'configured' : 'missing'
})

// Use fallback values for App Store review to prevent crashes
const fallbackUrl = 'https://omqdrgqzlksexruickvh.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcWRyZ3F6bGtzZXhydWlja3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1MTMzMTgsImV4cCI6MjA0ODA4OTMxOH0.K2hDhY4Y0J8hZUmuYpdBOV7AQMdXJb2AWCtahQJKJPE';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables, using fallback configuration:', {
    EXPO_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey
  });
  console.warn('This should only happen in App Store review builds');
}

export const supabase = createClient(
  supabaseUrl || fallbackUrl, 
  supabaseAnonKey || fallbackKey, 
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          gender: string | null
          role: string | null
          created_at: string
          updated_at: string
          email_notifications: boolean
          sms_notifications: boolean
          whatsapp_notifications: boolean
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          gender?: string | null
          role?: string | null
          email_notifications?: boolean
          sms_notifications?: boolean
          whatsapp_notifications?: boolean
        }
        Update: {
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          gender?: string | null
          role?: string | null
          email_notifications?: boolean
          sms_notifications?: boolean
          whatsapp_notifications?: boolean
        }
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          type: string
          status: string
          created_at: string
          updated_at: string
          start_date: string
          end_date: string | null
        }
      }
    }
  }
}
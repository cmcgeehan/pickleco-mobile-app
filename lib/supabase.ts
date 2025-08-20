import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
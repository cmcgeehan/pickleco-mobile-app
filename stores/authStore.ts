import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { updateAuthStoreProfileWithMembership } from '@/lib/pricing'
import { useNotificationStore } from './notificationStore'

interface UserProfile {
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
  email_verified: boolean
  has_signed_waiver: boolean
  active_membership?: any | null
  membership_history?: any[]
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  initialized: boolean
  loading: boolean
  
  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return
    
    set({ loading: true })
    
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        set({ initialized: true, loading: false })
        return
      }

      if (session?.user) {
        set({ 
          user: session.user, 
          session,
        })
        
        // Fetch user profile
        await get().refreshProfile()
        
        // Initialize notifications for authenticated user
        useNotificationStore.getState().initialize(session.user.id)
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        set({ 
          user: session?.user ?? null, 
          session 
        })

        if (session?.user) {
          await get().refreshProfile()
          // Initialize notifications for authenticated user
          useNotificationStore.getState().initialize(session.user.id)
        } else {
          set({ profile: null })
          // Cleanup notifications on sign out
          useNotificationStore.getState().cleanup()
        }
      })

    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ initialized: true, loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      set({ 
        user: data.user, 
        session: data.session,
      })

      // Profile will be fetched by auth state change listener
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email: string, password: string, userData: any) => {
    set({ loading: true })
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) throw error

      if (data.user) {
        set({ 
          user: data.user, 
          session: data.session,
        })

        // Create/update user profile in the users table
        // This upsert will create the profile if it doesn't exist or update if it does
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          // Don't throw here as the user is already created in auth
        }

        // Refresh profile to get the updated data
        await get().refreshProfile()
      }

    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    set({ loading: true })
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error

      set({ 
        user: null, 
        profile: null, 
        session: null 
      })

      // Cleanup notifications on sign out
      useNotificationStore.getState().cleanup()

    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  refreshProfile: async () => {
    const { session } = get()
    
    if (!session?.user) {
      return
    }

    try {
      console.log('Refreshing profile for user:', session.user.id)
      
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          gender,
          role,
          created_at,
          updated_at,
          email_notifications,
          sms_notifications,
          whatsapp_notifications,
          has_signed_waiver,
          is_coach,
          coaching_rate,
          bio,
          dupr_rating,
          specialties
        `)
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        throw error
      }

      // Fetch membership data
      const membershipData = await updateAuthStoreProfileWithMembership(session.user.id)
      
      // Add email from auth user and membership data
      const profileWithDefaults = {
        ...profile,
        email: session.user.email,
        ...membershipData
      }
      
      console.log('Profile data received:', profileWithDefaults)
      set({ profile: profileWithDefaults })

    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { session } = get()
    
    if (!session?.user) {
      throw new Error('Not authenticated')
    }

    set({ loading: true })

    try {
      console.log('Updating profile with:', updates)
      
      // Use direct Supabase client as recommended in mobile-direct-api-usage.md
      const { data: profile, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .select(`
          id,
          first_name,
          last_name,
          phone,
          gender,
          role,
          created_at,
          updated_at,
          email_notifications,
          sms_notifications,
          whatsapp_notifications,
          has_signed_waiver,
          is_coach,
          coaching_rate,
          bio,
          dupr_rating,
          specialties
        `)
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        throw error
      }

      // Fetch membership data for updated profile
      const membershipData = await updateAuthStoreProfileWithMembership(session.user.id)
      
      // Add email from auth user and membership data
      const profileWithDefaults = {
        ...profile,
        email: session.user.email,
        ...membershipData
      }
      
      console.log('Profile updated successfully:', profileWithDefaults)
      set({ profile: profileWithDefaults })

    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },
}))
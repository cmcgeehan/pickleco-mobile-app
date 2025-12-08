import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

/**
 * Feature Flags Store
 *
 * This store manages feature flags that can be controlled:
 * 1. Via OTA updates - Change the DEFAULT values below and push an OTA update
 * 2. Via Supabase - Create a 'feature_flags' table and override values remotely
 *
 * For App Store review, all features should be ENABLED by default.
 * After approval, you can disable features via OTA update or remote config.
 */

// DEFAULT VALUES - Change these and push OTA update to toggle features
// For App Store review, all should be true
const DEFAULT_FLAGS = {
  lessonBookingEnabled: true,    // Enable/disable lesson booking with coaches
  courtReservationEnabled: true, // Enable/disable court reservations
  groupClinicsEnabled: true,     // Enable/disable group clinics section
}

interface FeatureFlags {
  lessonBookingEnabled: boolean
  courtReservationEnabled: boolean
  groupClinicsEnabled: boolean
}

interface FeatureFlagsState {
  flags: FeatureFlags
  loading: boolean
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  refreshFlags: () => Promise<void>
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: { ...DEFAULT_FLAGS },
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    set({ loading: true })

    try {
      // Start with default values (can be changed via OTA updates)
      set({ flags: { ...DEFAULT_FLAGS } })

      // Try to fetch remote overrides from Supabase
      // This allows toggling features without any app update
      await get().refreshFlags()

    } catch (error) {
      console.log('Feature flags: Using defaults (remote fetch failed)', error)
    } finally {
      set({ initialized: true, loading: false })
    }
  },

  refreshFlags: async () => {
    try {
      // Try to fetch from Supabase feature_flags table
      // Table structure: id, flag_name (string), enabled (boolean), updated_at
      const { data, error } = await supabase
        .from('feature_flags')
        .select('flag_name, enabled')

      if (error) {
        // Table might not exist yet - that's fine, use defaults
        console.log('Feature flags: Remote config not available, using defaults')
        return
      }

      if (data && data.length > 0) {
        const remoteFlags = { ...get().flags }

        data.forEach((flag: { flag_name: string; enabled: boolean }) => {
          if (flag.flag_name in remoteFlags) {
            (remoteFlags as any)[flag.flag_name] = flag.enabled
          }
        })

        set({ flags: remoteFlags })
        console.log('Feature flags: Loaded remote config', remoteFlags)
      }
    } catch (error) {
      console.log('Feature flags: Error fetching remote config', error)
    }
  },
}))

// Convenience hook for checking individual flags
export const useFeatureFlag = (flagName: keyof FeatureFlags): boolean => {
  const flags = useFeatureFlagsStore((state) => state.flags)
  return flags[flagName]
}

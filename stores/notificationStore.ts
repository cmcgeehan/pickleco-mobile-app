import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { 
  requestNotificationPermissions, 
  getUserPushToken as getStoredPushToken 
} from '@/lib/notificationService';

interface NotificationState {
  isInitialized: boolean;
  hasPermissions: boolean;
  pushToken: string | null;
  
  // Actions
  initialize: (userId?: string) => Promise<void>;
  registerPushToken: (userId: string, token: string) => Promise<void>;
  cleanup: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  isInitialized: false,
  hasPermissions: false,
  pushToken: null,

  initialize: async (userId?: string) => {
    if (get().isInitialized) return;
    
    try {
      console.log('🔔 Initializing notifications...');
      
      // Only request permissions on physical devices
      if (!Device.isDevice) {
        console.log('📱 Running on simulator, skipping push notifications');
        set({ isInitialized: true });
        return;
      }

      // Request notification permissions
      const hasPermissions = await requestNotificationPermissions();
      
      if (!hasPermissions) {
        console.log('❌ Notification permissions denied');
        set({ isInitialized: true, hasPermissions: false });
        return;
      }

      // Get stored push token
      const token = await getStoredPushToken();
      
      if (token && userId) {
        // Register/update the token in database
        await get().registerPushToken(userId, token);
        set({ pushToken: token });
      }

      set({ 
        isInitialized: true, 
        hasPermissions,
        pushToken: token 
      });
      
      console.log('✅ Notifications initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      set({ isInitialized: true });
    }
  },

  registerPushToken: async (userId: string, token: string) => {
    try {
      const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown';
      const platform = Platform.OS as 'ios' | 'android' | 'web';

      // Deactivate old tokens for this device
      await supabase
        .from('user_push_tokens')
        .update({ active: false })
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('platform', platform);

      // Insert new token
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: token,
          device_id: deviceId,
          platform,
          active: true,
        }, {
          onConflict: 'user_id,device_id,platform'
        });

      if (error) {
        console.error('❌ Error registering push token:', error);
        throw error;
      }

      console.log('✅ Push token registered successfully');
      
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      throw error;
    }
  },

  cleanup: () => {
    set({
      isInitialized: false,
      hasPermissions: false,
      pushToken: null,
    });
  },
}));
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  eventId: string;
  eventName: string;
  eventType: 'lesson' | 'reservation';
  startTime: string;
  courtName?: string;
  coachName?: string;
}

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    // Get push token for the device
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'ae973377-0305-4b4f-841a-aab23f516107',
    });
    
    // Push token retrieved successfully
    
    // Store token for future use
    await AsyncStorage.setItem('expoPushToken', token.data);
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Schedule a local notification
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  scheduledTime: Date,
  data?: NotificationData
) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as unknown as Record<string, unknown>,
        sound: true,
      },
      trigger: {
        date: scheduledTime,
      } as any,
    });
    
    console.log('Scheduled notification:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Cancel a scheduled notification
export const cancelNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('Cancelled notification:', notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};

// Format notification messages
export const formatEventNotification = (
  eventName: string,
  eventType: 'lesson' | 'reservation',
  timeUntil: '24 hours' | '1 hour',
  startTime: string,
  courtName?: string,
  coachName?: string
) => {
  const timeStr = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (eventType === 'lesson') {
    return {
      title: `Lesson Reminder - ${timeUntil}`,
      body: `Your lesson with ${coachName} starts in ${timeUntil} at ${timeStr}${courtName ? ` on ${courtName}` : ''}`,
    };
  } else {
    return {
      title: `Court Reservation - ${timeUntil}`,
      body: `Your ${courtName} reservation starts in ${timeUntil} at ${timeStr}`,
    };
  }
};

// Get user's push token
export const getUserPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('expoPushToken');
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

// Update app.json configuration helper
export const getAppConfigForNotifications = () => {
  return {
    expo: {
      // ... other config
      notification: {
        icon: './assets/icon.png', // Notification icon
        color: '#2A62A2', // Notification color (your app's primary color)
        androidMode: 'default',
        androidCollapsedTitle: 'Pickle Co Reminders',
      },
      plugins: [
        [
          'expo-notifications',
          {
            icon: './assets/icon.png',
            color: '#2A62A2',
            sounds: ['./assets/notification.wav'], // Optional custom sound
          },
        ],
      ],
    },
  };
};
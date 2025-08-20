/**
 * Hourly Notification Worker
 * 
 * This function should be deployed as a serverless function (Vercel, Netlify, AWS Lambda)
 * or run as a cron job to check for upcoming events and send notifications.
 * 
 * Schedule: Run every hour
 * Purpose: Send 24-hour and 1-hour notifications for upcoming events
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || 'https://omqdrgqzlksexruickvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for admin operations

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EventRegistrationWithDetails {
  id: string;
  user_id: string;
  events: {
    id: string;
    name: string;
    description_en: string;
    description_es: string;
    start_time: string;
    end_time: string;
    coach_id?: string;
    users?: {
      first_name: string;
      last_name: string;
    };
    event_courts?: Array<{
      courts: {
        name: string;
      };
    }>;
  };
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Send push notification via Expo Push API
const sendExpoPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

// Get events that need notifications
const getEventsNeedingNotifications = async () => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1Hour = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  try {
    // Get event registrations for events starting in 24 hours (±1 hour window)
    const { data: events24h, error: error24h } = await supabase
      .from('event_registrations')
      .select(`
        id,
        user_id,
        events!inner (
          id,
          name,
          description_en,
          description_es,
          start_time,
          end_time,
          coach_id,
          users:coach_id (
            first_name,
            last_name
          ),
          event_courts (
            courts (
              name
            )
          )
        ),
        users (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .gte('events.start_time', in23Hours.toISOString())
      .lte('events.start_time', in24Hours.toISOString())
      .is('deleted_at', null);

    if (error24h) {
      console.error('Error fetching 24-hour events:', error24h);
    }

    // Get event registrations for events starting in 1 hour (±1 hour window)
    const { data: events1h, error: error1h } = await supabase
      .from('event_registrations')
      .select(`
        id,
        user_id,
        events!inner (
          id,
          name,
          description_en,
          description_es,
          start_time,
          end_time,
          coach_id,
          users:coach_id (
            first_name,
            last_name
          ),
          event_courts (
            courts (
              name
            )
          )
        ),
        users (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .gte('events.start_time', in1Hour.toISOString())
      .lte('events.start_time', in2Hours.toISOString())
      .is('deleted_at', null);

    if (error1h) {
      console.error('Error fetching 1-hour events:', error1h);
    }

    return {
      events24h: (events24h || []) as EventRegistrationWithDetails[],
      events1h: (events1h || []) as EventRegistrationWithDetails[],
    };
  } catch (error) {
    console.error('Error in getEventsNeedingNotifications:', error);
    return { events24h: [], events1h: [] };
  }
};

// Check if notification was already sent
const wasNotificationSent = async (eventRegistrationId: string, type: '24_hour' | '1_hour') => {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('event_registration_id', eventRegistrationId)
    .eq('notification_type', type)
    .eq('status', 'sent')
    .maybeSingle();

  if (error) {
    console.error('Error checking notification status:', error);
    return false;
  }

  return !!data;
};

// Log notification attempt
const logNotification = async (
  eventRegistrationId: string,
  type: '24_hour' | '1_hour',
  pushToken: string,
  status: 'sent' | 'failed',
  errorMessage?: string
) => {
  const { error } = await supabase
    .from('notification_logs')
    .insert({
      event_registration_id: eventRegistrationId,
      notification_type: type,
      push_token: pushToken,
      status,
      error_message: errorMessage,
    });

  if (error) {
    console.error('Error logging notification:', error);
  }
};

// Get user's push token (you'd need to store this when users register for notifications)
const getUserPushToken = async (userId: string): Promise<string | null> => {
  // This assumes you store push tokens in a user_push_tokens table
  // You'll need to create this table and update it when users register/login
  const { data, error } = await supabase
    .from('user_push_tokens')
    .select('push_token')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching push token:', error);
    return null;
  }

  return data?.push_token || null;
};

// Process notifications for a list of events
const processNotifications = async (
  events: EventRegistrationWithDetails[],
  type: '24_hour' | '1_hour'
) => {
  for (const eventReg of events) {
    try {
      // Check if we already sent this notification
      const alreadySent = await wasNotificationSent(eventReg.id, type);
      if (alreadySent) {
        console.log(`Notification already sent for event ${eventReg.events.id}, type ${type}`);
        continue;
      }

      // Get user's push token
      const pushToken = await getUserPushToken(eventReg.user_id);
      if (!pushToken) {
        console.log(`No push token found for user ${eventReg.user_id}`);
        continue;
      }

      // Format notification content
      const event = eventReg.events;
      const court = event.event_courts?.[0]?.courts?.name;
      const coach = event.users ? `${event.users.first_name} ${event.users.last_name}` : undefined;
      
      const timeStr = new Date(event.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const timeUntil = type === '24_hour' ? '24 hours' : '1 hour';
      
      let title: string;
      let body: string;

      if (coach) {
        // Lesson notification
        title = `Lesson Reminder - ${timeUntil}`;
        body = `Your lesson with ${coach} starts in ${timeUntil} at ${timeStr}${court ? ` on ${court}` : ''}`;
      } else {
        // Court reservation notification
        title = `Court Reservation - ${timeUntil}`;
        body = `Your ${court || 'court'} reservation starts in ${timeUntil} at ${timeStr}`;
      }

      // Send push notification
      await sendExpoPushNotification(pushToken, title, body, {
        eventId: event.id,
        eventRegistrationId: eventReg.id,
        type,
      });

      // Log successful notification
      await logNotification(eventReg.id, type, pushToken, 'sent');
      
      console.log(`Sent ${type} notification for event ${event.id} to user ${eventReg.user_id}`);
      
    } catch (error) {
      console.error(`Error processing notification for event ${eventReg.events.id}:`, error);
      
      // Log failed notification
      const pushToken = await getUserPushToken(eventReg.user_id);
      if (pushToken) {
        await logNotification(
          eventReg.id,
          type,
          pushToken,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }
};

// Main worker function
export const notificationWorker = async () => {
  console.log('🔔 Starting notification worker at', new Date().toISOString());

  try {
    // Get events needing notifications
    const { events24h, events1h } = await getEventsNeedingNotifications();

    console.log(`Found ${events24h.length} events needing 24-hour notifications`);
    console.log(`Found ${events1h.length} events needing 1-hour notifications`);

    // Process 24-hour notifications
    if (events24h.length > 0) {
      await processNotifications(events24h, '24_hour');
    }

    // Process 1-hour notifications
    if (events1h.length > 0) {
      await processNotifications(events1h, '1_hour');
    }

    console.log('✅ Notification worker completed successfully');
    return { success: true, processed24h: events24h.length, processed1h: events1h.length };
    
  } catch (error) {
    console.error('❌ Notification worker failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// For Vercel deployment
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await notificationWorker();
  res.status(200).json(result);
}

// For local testing
if (require.main === module) {
  notificationWorker().then(console.log).catch(console.error);
}
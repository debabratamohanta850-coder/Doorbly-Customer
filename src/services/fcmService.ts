import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import { getSupabase } from '../lib/supabaseClient';
import { CustomerNotificationItem } from '../types/supabase';

export type BookingEventType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'SEARCHING_PARTNER'
  | 'PARTNER_ASSIGNED'
  | 'PARTNER_ACCEPTED'
  | 'PARTNER_ON_THE_WAY'
  | 'PARTNER_ARRIVED'
  | 'SERVICE_STARTED'
  | 'SERVICE_COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'INVOICE_GENERATED'
  | 'BOOKING_CANCELLED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'SCHEDULED_REMINDER'
  | 'SUPPORT_RESPONSE'
  | 'ANNOUNCEMENT'
  | 'GENERAL';

export interface BookingPushNotification {
  id: string;
  eventType: BookingEventType;
  bookingId?: string;
  serviceName?: string;
  title: string;
  body: string;
  isRead?: boolean;
  receivedAt: Date;
}

export interface FCMConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
  vapidKey?: string;
}

const STORAGE_KEY_FCM_TOKEN = 'doorbly_fcm_device_token';
const STORAGE_KEY_NOTIFICATIONS = 'doorbly_customer_notifications_v1';
const STORAGE_KEY_FIREBASE_CONFIG = 'doorbly_firebase_config_v2';

export const DEFAULT_FIREBASE_CONFIG: FCMConfig = {
  apiKey: 'AIzaSyDgF1AvQ5eQtuAfnCtqezLPLNHLoPJ9i1I',
  authDomain: 'doorbly-b0bba.firebaseapp.com',
  projectId: 'doorbly-b0bba',
  storageBucket: 'doorbly-b0bba.firebasestorage.app',
  messagingSenderId: '977376808906',
  appId: '1:977376808906:web:caf01942d3773fb85d4933'
};

// Read Firebase credentials from custom saved config, Vite environment, or Doorbly default firebaseConfig
export function getFirebaseConfig(): FCMConfig {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.apiKey && parsed?.projectId && parsed?.appId) {
          return parsed as FCMConfig;
        }
      }
    } catch {}
  }

  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
  const apiKey = metaEnv.VITE_FIREBASE_API_KEY?.trim() || DEFAULT_FIREBASE_CONFIG.apiKey;
  const projectId = metaEnv.VITE_FIREBASE_PROJECT_ID?.trim() || DEFAULT_FIREBASE_CONFIG.projectId;
  const messagingSenderId =
    metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || DEFAULT_FIREBASE_CONFIG.messagingSenderId;
  const appId = metaEnv.VITE_FIREBASE_APP_ID?.trim() || DEFAULT_FIREBASE_CONFIG.appId;
  const authDomain = metaEnv.VITE_FIREBASE_AUTH_DOMAIN?.trim() || DEFAULT_FIREBASE_CONFIG.authDomain;
  const storageBucket =
    metaEnv.VITE_FIREBASE_STORAGE_BUCKET?.trim() || DEFAULT_FIREBASE_CONFIG.storageBucket;
  const vapidKey = metaEnv.VITE_FIREBASE_VAPID_KEY?.trim();

  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
    messagingSenderId,
    appId,
    vapidKey
  };
}

export function saveFirebaseConfig(config: FCMConfig): boolean {
  if (!config.apiKey || !config.projectId || !config.appId) return false;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        STORAGE_KEY_FIREBASE_CONFIG,
        JSON.stringify({
          apiKey: config.apiKey.trim(),
          authDomain: (config.authDomain || `${config.projectId.trim()}.firebaseapp.com`).trim(),
          projectId: config.projectId.trim(),
          storageBucket: (config.storageBucket || `${config.projectId.trim()}.firebasestorage.app`).trim(),
          messagingSenderId: config.messagingSenderId.trim(),
          appId: config.appId.trim(),
          vapidKey: config.vapidKey?.trim() || undefined
        })
      );
    } catch {}
  }
  return true;
}

export function resetFirebaseConfig(): FCMConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    } catch {}
  }
  return getFirebaseConfig();
}

export function isFcmConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

let firebaseApp: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;
const notificationListeners: Array<(notif: BookingPushNotification) => void> = [];
const centerListeners: Array<() => void> = [];

export function getFirebaseAppInstance(): FirebaseApp | null {
  const config = getFirebaseConfig();
  if (!config) return null;
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  }
  return firebaseApp;
}

/**
 * Initialize Firebase and FCM messaging instance
 */
export async function initFCM(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      return null;
    }

    const app = getFirebaseAppInstance();
    if (!app) {
      return null;
    }

    if (!messagingInstance) {
      messagingInstance = getMessaging(app);

      onMessage(messagingInstance, (payload) => {
        const eventType = parseBookingEventType(payload);
        const notification: BookingPushNotification = {
          id: payload.messageId || `fcm-${Date.now()}`,
          eventType,
          bookingId: payload.data?.bookingId,
          serviceName: payload.data?.serviceName,
          title: payload.notification?.title || payload.data?.title || getDefaultTitleForEvent(eventType),
          body: payload.notification?.body || payload.data?.body || 'Your booking status has been updated.',
          isRead: false,
          receivedAt: new Date()
        };

        notifyListeners(notification);

        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          document.visibilityState !== 'visible'
        ) {
          try {
            new Notification(notification.title, {
              body: notification.body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: notification.bookingId || 'doorbly-booking'
            });
          } catch (e) {
            console.warn('Could not display system notification:', e);
          }
        }
      });
    }

    return messagingInstance;
  } catch (err) {
    console.warn('FCM initialization note:', err);
    return null;
  }
}

/**
 * Request notification permissions and register device token in Supabase
 */
export async function requestFCMToken(userId?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const messaging = await initFCM();
    if (!messaging) return null;

    const config = getFirebaseConfig();

    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(config?.apiKey || '')}&projectId=${encodeURIComponent(config?.projectId || '')}&messagingSenderId=${encodeURIComponent(config?.messagingSenderId || '')}&appId=${encodeURIComponent(config?.appId || '')}`;
        swRegistration = await navigator.serviceWorker.register(swUrl);
      } catch (swErr) {
        console.warn('Service worker registration note:', swErr);
      }
    }

    const token = await getToken(messaging, {
      vapidKey: config?.vapidKey || undefined,
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      localStorage.setItem(STORAGE_KEY_FCM_TOKEN, token);
      if (userId) {
        await saveDeviceTokenToSupabase(userId, token);
      }
      return token;
    }

    return null;
  } catch (err) {
    console.warn('FCM token request note:', err);
    return null;
  }
}

/**
 * Persist FCM Token to Supabase Customer Profile (supports multiple devices safely)
 */
export async function saveDeviceTokenToSupabase(userId: string, token: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !userId || !token) return;

  try {
    const { error: dError } = await supabase
      .from('doorbly_customer_profiles')
      .update({ fcm_token: token, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (dError) {
      await supabase
        .from('customer_profiles')
        .update({ fcm_token: token, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
  } catch (err) {
    console.warn('Could not persist FCM token to Supabase profile:', err);
  }
}

/**
 * Subscribe to incoming booking push notifications
 */
export function subscribeBookingNotifications(
  listener: (notification: BookingPushNotification) => void
): () => void {
  notificationListeners.push(listener);
  return () => {
    const idx = notificationListeners.indexOf(listener);
    if (idx !== -1) notificationListeners.splice(idx, 1);
  };
}

export function subscribeNotificationCenter(listener: () => void): () => void {
  centerListeners.push(listener);
  return () => {
    const idx = centerListeners.indexOf(listener);
    if (idx !== -1) centerListeners.splice(idx, 1);
  };
}

function notifyCenterListeners() {
  centerListeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

function notifyListeners(notif: BookingPushNotification) {
  saveLocalNotification(notif);
  notificationListeners.forEach((listener) => {
    try {
      listener(notif);
    } catch (e) {
      console.error('Error in notification listener:', e);
    }
  });
  notifyCenterListeners();
}

function getLocalNotifications(customerId?: string): CustomerNotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!raw) return [];
    const parsed: CustomerNotificationItem[] = JSON.parse(raw);
    if (!customerId) return parsed;
    return parsed.filter((n) => !n.customer_id || n.customer_id === customerId);
  } catch {
    return [];
  }
}

function saveLocalNotification(notif: BookingPushNotification, customerId: string = 'local') {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalNotifications();
    const item: CustomerNotificationItem = {
      id: notif.id,
      customer_id: customerId,
      booking_id: notif.bookingId || null,
      event_type: notif.eventType,
      title: notif.title,
      body: notif.body,
      is_read: false,
      created_at: notif.receivedAt.toISOString()
    };
    const updated = [item, ...existing.filter((x) => x.id !== item.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
  } catch {}
}

/**
 * Fetch real notifications for the authenticated customer from Supabase (with local event sync)
 */
export async function fetchCustomerNotifications(customerId: string): Promise<CustomerNotificationItem[]> {
  const supabase = getSupabase();
  const localItems = getLocalNotifications(customerId);

  if (!supabase || !customerId) return localItems;

  try {
    const { data, error } = await supabase
      .from('doorbly_notifications')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const dbIds = new Set(data.map((d: any) => d.id));
      const merged = [
        ...(data as CustomerNotificationItem[]),
        ...localItems.filter((l) => !dbIds.has(l.id))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return merged;
    }
  } catch {}

  return localItems;
}

export async function markNotificationAsRead(notificationId: string, customerId?: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const existing = getLocalNotifications();
      const updated = existing.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    } catch {}
  }

  const supabase = getSupabase();
  if (supabase && customerId) {
    try {
      await supabase
        .from('doorbly_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('customer_id', customerId);
    } catch {}
  }
  notifyCenterListeners();
}

export async function markAllNotificationsAsRead(customerId?: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const existing = getLocalNotifications();
      const updated = existing.map((n) =>
        !customerId || n.customer_id === customerId || n.customer_id === 'local'
          ? { ...n, is_read: true }
          : n
      );
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    } catch {}
  }

  const supabase = getSupabase();
  if (supabase && customerId) {
    try {
      await supabase
        .from('doorbly_notifications')
        .update({ is_read: true })
        .eq('customer_id', customerId)
        .eq('is_read', false);
    } catch {}
  }
  notifyCenterListeners();
}

function parseBookingEventType(payload: any): BookingEventType {
  const raw = (payload.data?.eventType || payload.data?.status || payload.notification?.title || '').toUpperCase();
  if (raw.includes('REFUND_COMPLET') || raw.includes('REFUNDED')) return 'REFUND_COMPLETED';
  if (raw.includes('REFUND')) return 'REFUND_INITIATED';
  if (raw.includes('CANCEL')) return 'BOOKING_CANCELLED';
  if (raw.includes('INVOICE')) return 'INVOICE_GENERATED';
  if (raw.includes('PAYMENT_COMPLET') || raw.includes('PAID')) return 'PAYMENT_COMPLETED';
  if (raw.includes('PAYMENT')) return 'PAYMENT_PENDING';
  if (raw.includes('COMPLET')) return 'SERVICE_COMPLETED';
  if (raw.includes('START')) return 'SERVICE_STARTED';
  if (raw.includes('ARRIV')) return 'PARTNER_ARRIVED';
  if (raw.includes('WAY') || raw.includes('ROUTE')) return 'PARTNER_ON_THE_WAY';
  if (raw.includes('ACCEPT')) return 'PARTNER_ACCEPTED';
  if (raw.includes('PARTNER') || raw.includes('ASSIGN')) return 'PARTNER_ASSIGNED';
  if (raw.includes('SEARCH')) return 'SEARCHING_PARTNER';
  if (raw.includes('REMIND')) return 'SCHEDULED_REMINDER';
  if (raw.includes('SUPPORT')) return 'SUPPORT_RESPONSE';
  if (raw.includes('CONFIRM') || raw.includes('CREAT') || raw.includes('PENDING')) return 'BOOKING_CREATED';
  return 'GENERAL';
}

function getDefaultTitleForEvent(eventType: BookingEventType): string {
  switch (eventType) {
    case 'BOOKING_CREATED':
    case 'BOOKING_CONFIRMED':
      return 'Booking Confirmed';
    case 'SEARCHING_PARTNER':
      return 'Finding a Doorbly Agent';
    case 'PARTNER_ASSIGNED':
      return 'Doorbly Agent Assigned';
    case 'PARTNER_ACCEPTED':
      return 'Agent Accepted Your Booking';
    case 'PARTNER_ON_THE_WAY':
      return 'Agent On The Way';
    case 'PARTNER_ARRIVED':
      return 'Agent Has Arrived';
    case 'SERVICE_STARTED':
      return 'Service Started';
    case 'SERVICE_COMPLETED':
      return 'Service Completed';
    case 'PAYMENT_PENDING':
      return 'Payment Pending';
    case 'PAYMENT_COMPLETED':
      return 'Payment Completed';
    case 'INVOICE_GENERATED':
      return 'Tax Invoice Ready';
    case 'BOOKING_CANCELLED':
      return 'Booking Cancelled';
    case 'REFUND_INITIATED':
      return 'Refund Initiated';
    case 'REFUND_COMPLETED':
      return 'Refund Completed';
    case 'SCHEDULED_REMINDER':
      return 'Scheduled Service Reminder';
    case 'SUPPORT_RESPONSE':
      return 'Doorbly Support Update';
    default:
      return 'Doorbly Update';
  }
}

/**
 * Helper to dispatch a notification internally and persist to Supabase doorbly_notifications
 */
export async function dispatchBookingNotification(
  notification: Omit<BookingPushNotification, 'id' | 'receivedAt'>,
  customerId?: string
): Promise<void> {
  const fullNotif: BookingPushNotification = {
    id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...notification,
    isRead: false,
    receivedAt: new Date()
  };

  if (customerId) {
    saveLocalNotification(fullNotif, customerId);
  }
  notifyListeners(fullNotif);

  const supabase = getSupabase();
  if (supabase && customerId) {
    try {
      await supabase.from('doorbly_notifications').insert({
        customer_id: customerId,
        booking_id: notification.bookingId || null,
        event_type: notification.eventType,
        title: notification.title,
        body: notification.body,
        is_read: false
      });
      notifyCenterListeners();
    } catch {}
  }
}

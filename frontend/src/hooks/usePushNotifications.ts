import { useCallback, useEffect, useState } from 'react';

const PUSH_SUBSCRIPTION_KEY = 'seduclog_push_subscribed';
const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

// VAPID public key — must match the server's VAPID private key.
// Replace with the real key generated via web-push CLI in production.
const VAPID_PUBLIC_KEY =
  process.env.REACT_APP_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export interface UsePushNotificationsResult {
  /** Current permission state, or 'unsupported' when the browser lacks Web Push. */
  permission: NotificationPermission | 'unsupported';
  /** True while the subscription request is in flight. */
  subscribing: boolean;
  /** Request notification permission and subscribe to push. */
  requestPermission: () => Promise<void>;
  /** Send a local notification (for testing or status change events). */
  notify: (title: string, body: string, tag?: string) => void;
}

/**
 * Sets up Web Push notifications for the authenticated requester.
 *
 * On login / mount this hook:
 *  1. Checks existing notification permission.
 *  2. If granted and a service worker is available, registers a push subscription
 *     and sends the endpoint to the backend.
 *  3. Exposes `requestPermission()` to prompt the user on first access.
 *
 * Notes:
 *  - Web Push requires HTTPS in production.
 *  - Service Worker registration is expected at `/sw.js`.
 *  - The backend endpoint `POST /api/notifications/subscribe` receives the
 *    serialised PushSubscription (not implemented in this MVP — stored client-side).
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    supported ? Notification.permission : 'unsupported',
  );
  const [subscribing, setSubscribing] = useState(false);

  /** Registers a push subscription if VAPID key is configured. */
  const subscribe = useCallback(async (registration: ServiceWorkerRegistration): Promise<void> => {
    if (!VAPID_PUBLIC_KEY) return; // VAPID not configured; skip server push, use local only.

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // In production: POST the subscription to the backend.
      await fetch(`${API_BASE}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });

      localStorage.setItem(PUSH_SUBSCRIPTION_KEY, 'true');
    } catch (err) {
      // Non-fatal: push subscription failed (e.g., browser blocks, missing VAPID).
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[PushNotifications] Subscription failed:', err);
      }
    }
  }, []);

  /** Attempt auto-subscription when permission is already granted. */
  useEffect(() => {
    if (!supported || Notification.permission !== 'granted') return;
    if (localStorage.getItem(PUSH_SUBSCRIPTION_KEY)) return;

    navigator.serviceWorker.ready
      .then((reg) => subscribe(reg))
      .catch(() => { /* service worker not available in dev */ });
  }, [supported, subscribe]);

  const requestPermission = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setSubscribing(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await subscribe(registration);
      }
    } finally {
      setSubscribing(false);
    }
  }, [supported, subscribe]);

  const notify = useCallback((title: string, body: string, tag?: string): void => {
    if (!supported || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready
      .then((reg) => {
        void reg.showNotification(title, { body, tag, icon: '/logo192.png' });
      })
      .catch(() => {
        // Fallback: plain Notification API when service worker isn't ready.
        new Notification(title, { body, tag, icon: '/logo192.png' });
      });
  }, [supported]);

  return { permission, subscribing, requestPermission, notify };
}

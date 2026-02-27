const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Fetch the VAPID public key from the backend.
 * @returns {Promise<string|null>}
 */
async function getVapidPublicKey() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/notifications/vapid-public-key`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

/**
 * Convert a VAPID public key string to a Uint8Array.
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Request notification permission and subscribe to Web Push.
 * @param {string} userId - The ID of the current user.
 * @returns {Promise<boolean>} True if subscribed successfully.
 */
export async function subscribeToPushNotifications(userId) {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser.');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission denied.');
    return false;
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    console.warn('VAPID public key not available.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${BACKEND_URL}/api/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription }),
    });

    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

/**
 * Unsubscribe from Web Push notifications.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function unsubscribeFromPushNotifications(userId) {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }

    await fetch(`${BACKEND_URL}/api/notifications/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}

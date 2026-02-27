import { useState, useEffect } from 'react';
import { subscribeToPushNotifications } from '../services/pushNotification';

/**
 * NotificationPermission prompts the user to allow push notifications.
 * Shows once per session when permission has not been decided.
 *
 * @param {{ userId: string }} props
 */
export default function NotificationPermission({ userId }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  async function handleAllow() {
    setVisible(false);
    await subscribeToPushNotifications(userId);
  }

  function handleDeny() {
    setVisible(false);
  }

  return (
    <div className="notification-banner" role="alert" aria-live="polite">
      <p>
        Deseja receber notificações sobre atualizações da sua entrega?
      </p>
      <div className="notification-banner__actions">
        <button onClick={handleAllow} className="btn btn--primary">
          Permitir
        </button>
        <button onClick={handleDeny} className="btn btn--secondary">
          Agora não
        </button>
      </div>
    </div>
  );
}

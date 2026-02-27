import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const isOnline = useOnlineStatus();
  const { user, logout } = useAuth();

  return (
    <header style={styles.header}>
      <h1 style={styles.title}>SeducLog</h1>
      <div style={styles.right}>
        <span style={{ ...styles.badge, background: isOnline ? '#22c55e' : '#ef4444' }}>
          {isOnline ? '● Online' : '● Offline'}
        </span>
        {user && (
          <button onClick={logout} style={styles.logoutBtn}>
            Sair
          </button>
        )}
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1rem',
    height: 56,
    background: '#1e3a5f',
    color: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  title: { margin: 0, fontSize: '1.25rem', fontWeight: 700 },
  right: { display: 'flex', alignItems: 'center', gap: '1rem' },
  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#fff',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.5)',
    color: '#fff',
    padding: '0.25rem 0.75rem',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
};

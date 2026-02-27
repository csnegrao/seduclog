import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import NotificationBell from './components/NotificationBell';
import RequestList from './pages/RequestList';
import RequestDetail from './pages/RequestDetail';
import LoginPage from './pages/LoginPage';

export default function App() {
  const { user, logout } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  if (!user) return <LoginPage />;

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <h1
          style={{ margin: 0, fontSize: '1.2rem', color: '#2d3748', cursor: 'pointer' }}
          onClick={() => setSelectedRequestId(null)}
        >
          📦 SeducLog
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.85rem', color: '#718096' }}>
            {user.name} ({user.role})
          </span>
          <NotificationBell />
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#4a5568',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        {selectedRequestId ? (
          <RequestDetail
            requestId={selectedRequestId}
            onBack={() => setSelectedRequestId(null)}
          />
        ) : (
          <RequestList onSelect={setSelectedRequestId} />
        )}
      </main>
    </div>
  );
}


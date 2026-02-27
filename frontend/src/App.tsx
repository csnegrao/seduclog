import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DriverHome } from './pages/DriverHome';
import { ActiveDelivery } from './pages/ActiveDelivery';
import { DeliveryConfirmation } from './pages/DeliveryConfirmation';
import { Header } from './components/Header';
import { DeliveryOrder } from './types/driver.types';

type DriverScreen = 'home' | 'active' | 'confirm';

function DriverApp() {
  const { user } = useAuth();
  const [screen, setScreen] = useState<DriverScreen>('home');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);

  if (!user) return <LoginPage />;

  if (user.role !== 'DRIVER') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Acesso restrito</h2>
        <p>Este aplicativo é para entregadores.</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      {screen === 'home' && (
        <DriverHome
          onSelectOrder={(order) => {
            setSelectedOrder(order);
            setScreen('active');
          }}
        />
      )}
      {screen === 'active' && selectedOrder && (
        <ActiveDelivery
          order={selectedOrder}
          onBack={() => setScreen('home')}
          onConfirmDelivery={() => setScreen('confirm')}
        />
      )}
      {screen === 'confirm' && selectedOrder && (
        <DeliveryConfirmation
          order={selectedOrder}
          onBack={() => setScreen('active')}
          onDelivered={() => {
            setSelectedOrder(null);
            setScreen('home');
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DriverApp />
    </AuthProvider>
  );
}

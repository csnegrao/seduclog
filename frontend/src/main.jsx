import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { SocketProvider } from './contexts/SocketContext.jsx'
import { NotificationProvider } from './contexts/NotificationContext.jsx'

function Providers({ children }) {
  const { token } = useAuth();
  return (
    <SocketProvider token={token}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SocketProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Providers>
        <App />
      </Providers>
    </AuthProvider>
  </StrictMode>,
)


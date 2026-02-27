import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersManagement from './pages/admin/UsersManagement';
import SystemSettings from './pages/admin/SystemSettings';
import StockManagement from './pages/warehouse/StockManagement';
import OrderPreparation from './pages/warehouse/OrderPreparation';
import DeliveryRoute from './pages/driver/DeliveryRoute';
import MaterialRequest from './pages/requester/MaterialRequest';
import RequestHistory from './pages/requester/RequestHistory';
import ReportsDashboard from './pages/manager/ReportsDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected routes with Layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Admin */}
                <Route path="/users" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <UsersManagement />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SystemSettings />
                  </ProtectedRoute>
                } />

                {/* Warehouse */}
                <Route path="/stock" element={
                  <ProtectedRoute roles={['ADMIN', 'WAREHOUSE_OPERATOR']}>
                    <StockManagement />
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute roles={['ADMIN', 'WAREHOUSE_OPERATOR']}>
                    <OrderPreparation />
                  </ProtectedRoute>
                } />

                {/* Driver */}
                <Route path="/deliveries" element={
                  <ProtectedRoute roles={['ADMIN', 'DRIVER', 'WAREHOUSE_OPERATOR']}>
                    <DeliveryRoute />
                  </ProtectedRoute>
                } />

                {/* Requester */}
                <Route path="/requests" element={
                  <ProtectedRoute roles={['REQUESTER', 'ADMIN']}>
                    <MaterialRequest />
                  </ProtectedRoute>
                } />
                <Route path="/requests/history" element={
                  <ProtectedRoute roles={['REQUESTER', 'ADMIN']}>
                    <RequestHistory />
                  </ProtectedRoute>
                } />

                {/* Manager/Reports */}
                <Route path="/reports" element={
                  <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                    <ReportsDashboard />
                  </ProtectedRoute>
                } />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

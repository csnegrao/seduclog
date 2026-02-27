import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QueueDashboard from './pages/warehouse/QueueDashboard';
import PickingScreen from './pages/warehouse/PickingScreen';
import StockManagement from './pages/warehouse/StockManagement';
import InventoryPage from './pages/warehouse/InventoryPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route
                        path="warehouse/queue"
                        element={
                          <ProtectedRoute roles={['WAREHOUSE_OPERATOR', 'ADMIN']}>
                            <QueueDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="warehouse/picking"
                        element={
                          <ProtectedRoute roles={['WAREHOUSE_OPERATOR', 'ADMIN']}>
                            <PickingScreen />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="warehouse/stock"
                        element={
                          <ProtectedRoute roles={['WAREHOUSE_OPERATOR', 'ADMIN']}>
                            <StockManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="warehouse/inventory"
                        element={
                          <ProtectedRoute roles={['WAREHOUSE_OPERATOR', 'ADMIN']}>
                            <InventoryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/requests/NewRequest';
import RequestList from './pages/requests/RequestList';
import RequestDetail from './pages/requests/RequestDetail';
import OperatorRequests from './pages/operator/OperatorRequests';

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

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Requester routes */}
                <Route
                  path="/requests/new"
                  element={
                    <ProtectedRoute roles={['REQUESTER', 'ADMIN']}>
                      <NewRequest />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests/:id"
                  element={
                    <ProtectedRoute>
                      <RequestDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <ProtectedRoute roles={['REQUESTER', 'ADMIN']}>
                      <RequestList />
                    </ProtectedRoute>
                  }
                />

                {/* Operator routes */}
                <Route
                  path="/operator/requests"
                  element={
                    <ProtectedRoute roles={['WAREHOUSE_OPERATOR', 'ADMIN']}>
                      <OperatorRequests />
                    </ProtectedRoute>
                  }
                />

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

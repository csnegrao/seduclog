import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import type { AuthState } from '../types';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    isLoading: true,
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    authApi
      .me()
      .then(({ data }) => {
        setState({ user: data, token, isAuthenticated: true, isLoading: false });
      })
      .catch(() => logout());
  }, [logout]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setState({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

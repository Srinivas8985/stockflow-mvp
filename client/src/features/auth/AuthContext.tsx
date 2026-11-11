'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Organization, RegisterInput, LoginInput } from '@/types';
import { api, ApiClientError } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const initAuth = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_access_token') : null;
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.auth.getMe();
      if (response.data) {
        setUser(response.data.user);
        setOrganization(response.data.organization);
      }
    } catch {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('stockflow_access_token');
        localStorage.removeItem('stockflow_refresh_token');
      }
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.auth.login(input);
      if (response.data) {
        localStorage.setItem('stockflow_access_token', response.data.tokens.accessToken);
        localStorage.setItem('stockflow_refresh_token', response.data.tokens.refreshToken);
        setUser(response.data.user);
        setOrganization(response.data.organization);
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.auth.register(input);
      if (response.data) {
        localStorage.setItem('stockflow_access_token', response.data.tokens.accessToken);
        localStorage.setItem('stockflow_refresh_token', response.data.tokens.refreshToken);
        setUser(response.data.user);
        setOrganization(response.data.organization);
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('stockflow_refresh_token') || undefined : undefined;
    try {
      await api.auth.logout(refreshToken);
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('stockflow_access_token');
        localStorage.removeItem('stockflow_refresh_token');
      }
      setUser(null);
      setOrganization(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


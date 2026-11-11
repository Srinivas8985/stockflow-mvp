'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Organization, SignupInput, LoginInput } from '@/types';
import { api, ApiClientError } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const initAuth = useCallback(async () => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') : null;
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    try {
      const response = await api.auth.getMe();
      if (response.data) {
        setUser({
          id: response.data.id,
          organizationId: response.data.organizationId,
          name: response.data.name,
          email: response.data.email,
          createdAt: new Date().toISOString(),
        });
        setOrganization(response.data.organization);
      }
    } catch {
      // Invalid or expired token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('stockflow_token');
      }
      setToken(null);
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
        localStorage.setItem('stockflow_token', response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
        setOrganization(response.data.organization);
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Invalid email or password';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (input: SignupInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.auth.signup(input);
      if (response.data) {
        localStorage.setItem('stockflow_token', response.data.token);
        setToken(response.data.token);
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

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stockflow_token');
    }
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
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

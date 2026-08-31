import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDto } from '@clustro/shared';
import { api, setAccessToken } from '../services/api';

interface AuthContextType {
  user: UserDto | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (data: { name: string; username: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      // Try refresh endpoint first to get access token if cookie exists
      const { data: refreshData } = await api.post('/auth/refresh');
      if (refreshData?.accessToken && refreshData?.user) {
        setAccessToken(refreshData.accessToken);
        setUser(refreshData.user);
      }
    } catch (e) {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    const handleExpired = () => {
      setUser(null);
    };
    window.addEventListener('clustro:auth-expired', handleExpired);
    return () => window.removeEventListener('clustro:auth-expired', handleExpired);
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    const { data } = await api.post('/auth/login', { emailOrUsername, password });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
      setUser(data.user);
    }
  };

  const register = async (regData: { name: string; username: string; email: string; phone?: string; password: string }) => {
    const { data } = await api.post('/auth/register', regData);
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
      setUser(data.user);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

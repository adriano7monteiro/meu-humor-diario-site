import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import NotificationService from '../services/NotificationService';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  areNotificationsEnabled: () => Promise<boolean>;
  api: any;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const API_BASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://humor-cloud.preview.emergentagent.com';

console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    console.log('📡 Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API response error:', error);
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStoredUser() {
      try {
        console.log('📱 Loading stored user...');
        let storedToken: string | null = null;
        let storedUser: string | null = null;

        if (Platform.OS === 'web') {
          storedToken = localStorage.getItem('@token');
          storedUser = localStorage.getItem('@user');
        } else {
          storedToken = await AsyncStorage.getItem('@token');
          storedUser = await AsyncStorage.getItem('@user');
        }

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          api.defaults.headers.authorization = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error('❌ Error loading stored user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStoredUser();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const response = await api.post('/api/login', {
        email: email.toLowerCase().trim(),
        password,
      });

      const { access_token, user: userData } = response.data;

      setUser(userData);
      setToken(access_token);
      api.defaults.headers.authorization = `Bearer ${access_token}`;

      if (Platform.OS === 'web') {
        localStorage.setItem('@token', access_token);
        localStorage.setItem('@user', JSON.stringify(userData));
      } else {
        await AsyncStorage.setItem('@token', access_token);
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
      }

      setTimeout(async () => {
        try {
          await NotificationService.enableReminders();
        } catch {}
      }, 500);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Erro ao fazer login.';
      throw new Error(msg);
    }
  }

  async function signUp(name: string, email: string, password: string, confirmPassword: string) {
    try {
      const response = await api.post('/api/register', {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        confirm_password: confirmPassword,
      });

      const { access_token, user: userData } = response.data;

      setUser(userData);
      setToken(access_token);
      api.defaults.headers.authorization = `Bearer ${access_token}`;

      await AsyncStorage.setItem('@token', access_token);
      await AsyncStorage.setItem('@user', JSON.stringify(userData));

      setTimeout(async () => {
        try {
          await NotificationService.enableReminders();
        } catch {}
      }, 1000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Erro ao criar conta.';
      throw new Error(msg);
    }
  }

  async function signOut() {
    await AsyncStorage.multiRemove(['@token', '@user']);
    delete api.defaults.headers.authorization;
    await NotificationService.disableReminders();
    setUser(null);
    setToken(null);
  }

  async function enableNotifications(): Promise<boolean> {
    return await NotificationService.enableReminders();
  }

  async function disableNotifications(): Promise<void> {
    await NotificationService.disableReminders();
  }

  async function areNotificationsEnabled(): Promise<boolean> {
    return await NotificationService.areRemindersEnabled();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        signIn,
        signUp,
        signOut,
        enableNotifications,
        disableNotifications,
        areNotificationsEnabled,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

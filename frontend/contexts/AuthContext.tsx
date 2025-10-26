import React, { createContext, useContext, useEffect, useState } from 'react';
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  areNotificationsEnabled: () => Promise<boolean>;
  api: any; // Axios instance for API calls
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// For web, always use relative URLs that proxy through Expo
const API_BASE_URL = Platform.OS === 'web' ? '' : 'http://localhost:8001';
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🌐 Platform:', Platform.OS);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('📡 Making API request:', config.method?.toUpperCase(), config.url);
    console.log('📡 Full URL:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('📡 Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API response success:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ API response error details:');
    console.error('  - Message:', error.message);
    console.error('  - Code:', error.code);
    console.error('  - URL:', error.config?.url);
    console.error('  - Base URL:', error.config?.baseURL);
    console.error('  - Full URL:', error.config?.baseURL + error.config?.url);
    console.error('  - Method:', error.config?.method);
    console.error('  - Headers:', error.config?.headers);
    
    if (error.response) {
      console.error('  - Response Status:', error.response.status);
      console.error('  - Response Data:', error.response.data);
    } else {
      console.error('  - No response received');
    }
    
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data on app start
  useEffect(() => {
    console.log('🚀 AuthContext initializing...');
    // Use a simple timeout to simulate async loading and then set loading to false
    const initTimeout = setTimeout(() => {
      console.log('🚀 AuthContext finished initializing');
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(initTimeout);
  }, []);

  // Set auth header when user changes
  useEffect(() => {
    const token = user ? AsyncStorage.getItem('@token') : null;
    if (token) {
      token.then((t) => {
        if (t) {
          api.defaults.headers.authorization = `Bearer ${t}`;
        }
      });
    } else {
      delete api.defaults.headers.authorization;
    }
  }, [user]);

  async function loadStoredUser() {
    console.log('📱 Starting loadStoredUser...');
    
    // Set a definitive timeout to ensure loading state resolves
    const forceLoadingOff = setTimeout(() => {
      console.log('🚨 Force setting loading to false after 3 seconds');
      setLoading(false);
    }, 3000);
    
    try {
      console.log('📱 Attempting to load from AsyncStorage...');
      
      // For web, try localStorage as fallback if AsyncStorage fails
      let token = null;
      let userData = null;
      
      if (Platform.OS === 'web') {
        try {
          token = localStorage.getItem('@token');
          userData = localStorage.getItem('@user');
          console.log('📱 Web storage fallback:', { hasToken: !!token, hasUserData: !!userData });
        } catch (webError) {
          console.log('📱 Web storage failed, trying AsyncStorage:', webError);
        }
      }
      
      // If web fallback didn't work or we're not on web, try AsyncStorage
      if (!token && !userData) {
        try {
          token = await AsyncStorage.getItem('@token');
          userData = await AsyncStorage.getItem('@user');
          console.log('📱 AsyncStorage result:', { hasToken: !!token, hasUserData: !!userData });
        } catch (asyncError) {
          console.log('📱 AsyncStorage failed:', asyncError);
        }
      }
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          api.defaults.headers.authorization = `Bearer ${token}`;
          console.log('✅ User restored from storage:', parsedUser.email);
        } catch (parseError) {
          console.log('❌ Error parsing user data:', parseError);
          // Clear corrupted data
          if (Platform.OS === 'web') {
            localStorage.removeItem('@token');
            localStorage.removeItem('@user');
          }
          await AsyncStorage.multiRemove(['@token', '@user']);
        }
      } else {
        console.log('📱 No stored user data found');
      }
    } catch (error) {
      console.log('❌ Error loading stored user:', error);
    } finally {
      clearTimeout(forceLoadingOff);
      console.log('📱 Setting loading to false');
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      console.log('🔐 Iniciando login para:', email);
      const response = await api.post('/api/login', {
        email: email.toLowerCase().trim(),
        password,
      });

      console.log('✅ Login response received');
      const { access_token, user: userData } = response.data;

      // Set API authorization header immediately
      api.defaults.headers.authorization = `Bearer ${access_token}`;
      
      // Set user state immediately (this is critical for login success)
      setUser(userData);
      console.log('✅ User set in context:', userData.email);

      // Store credentials - but don't block the login process
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem('@token', access_token);
          localStorage.setItem('@user', JSON.stringify(userData));
          console.log('✅ Stored in localStorage');
        } else {
          await AsyncStorage.setItem('@token', access_token);
          await AsyncStorage.setItem('@user', JSON.stringify(userData));
          console.log('✅ Stored in AsyncStorage');
        }
      } catch (storageError) {
        console.warn('⚠️ Storage failed (non-critical):', storageError);
        // Don't throw error - storage failure shouldn't block login
      }

      // Auto-enable notifications in background (non-blocking)
      setTimeout(async () => {
        try {
          const result = await NotificationService.enableReminders();
          console.log('🔔 Notifications:', result ? 'enabled' : 'failed');
        } catch (error) {
          console.log('🔔 Notification error (non-critical):', error);
        }
      }, 500);
      
      console.log('🔐 SignIn completed successfully');
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Erro ao fazer login. Verifique suas credenciais.');
    }
  }

  async function signUp(name: string, email: string, password: string, confirmPassword: string) {
    try {
      console.log('👤 Starting registration for:', email);
      const response = await api.post('/api/register', {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        confirm_password: confirmPassword,
      });

      console.log('✅ Registration response:', response.data);
      const { access_token, user: userData } = response.data;

      // Store credentials with platform-specific approach
      try {
        await AsyncStorage.setItem('@token', access_token);
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
      } catch (storageError) {
        console.log('AsyncStorage error, trying web storage:', storageError);
        if (Platform.OS === 'web') {
          localStorage.setItem('@token', access_token);
          localStorage.setItem('@user', JSON.stringify(userData));
        }
      }

      api.defaults.headers.authorization = `Bearer ${access_token}`;
      setUser(userData);
      console.log('✅ User set in context after registration:', userData);
      
      // Auto-enable notifications for new users (optional, user can disable later)
      console.log('🔔 Attempting to enable notifications after registration...');
      setTimeout(async () => {
        try {
          const result = await NotificationService.enableReminders();
          console.log('🔔 Notification enable result:', result);
          if (result) {
            console.log('✅ Notifications enabled successfully');
          } else {
            console.log('❌ Failed to enable notifications');
          }
        } catch (error) {
          console.log('❌ Could not auto-enable notifications:', error);
        }
      }, 1000);
    } catch (error: any) {
      console.log('❌ Registration error:', error);
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          const errorMessage = error.response.data.detail[0]?.msg || 'Erro no cadastro';
          throw new Error(errorMessage);
        }
        throw new Error(error.response.data.detail);
      }
      throw new Error('Erro ao criar conta. Tente novamente.');
    }
  }

  async function signOut() {
    await AsyncStorage.removeItem('@token');
    await AsyncStorage.removeItem('@user');
    delete api.defaults.headers.authorization;
    
    // Disable notifications when signing out
    await NotificationService.disableReminders();
    
    setUser(null);
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
        signIn,
        signUp,
        signOut,
        enableNotifications,
        disableNotifications,
        areNotificationsEnabled,
        api, // Export the api instance
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
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('🏠 Index useEffect triggered - loading:', loading, 'user:', user);
    
    // Navigate based on authentication state
    if (!loading) {
      if (user) {
        console.log('🏠 Navigating to /home with user:', user.email);
        router.replace('/home');
      } else {
        console.log('🏠 Navigating to /welcome - no user');
        router.replace('/welcome');
      }
    }
  }, [user, loading, router]);

  // Fallback navigation after 3 seconds to prevent infinite loading
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      console.log('🚨 Fallback navigation triggered - forcing welcome');
      router.replace('/welcome');
    }, 3000);

    return () => clearTimeout(fallbackTimeout);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.loadingText}>Carregando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
});
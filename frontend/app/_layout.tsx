import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="home" />
          <Stack.Screen name="mood-tracker" />
          <Stack.Screen name="missions" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="emotional-progress" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="subscription" />
        </Stack>
        <StatusBar style="light" />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
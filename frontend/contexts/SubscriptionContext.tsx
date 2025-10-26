import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionStatus {
  has_subscription: boolean;
  status: string;
  days_remaining: number;
  is_trial: boolean;
  plan_name: string | null;
}

interface SubscriptionContextData {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextData>({} as SubscriptionContextData);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch real subscription status from API
  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setSubscriptionStatus(null);
    }
  }, [user]);

  async function refreshSubscription() {
    if (!user) return;
    
    try {
      setLoading(true);
      const { api } = await import('./AuthContext');
      const response = await api.get('/api/subscription/status');
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      // If error, assume no subscription
      setSubscriptionStatus({
        has_subscription: false,
        status: 'none',
        days_remaining: 0,
        is_trial: false,
        plan_name: null
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionStatus,
        loading,
        refreshSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

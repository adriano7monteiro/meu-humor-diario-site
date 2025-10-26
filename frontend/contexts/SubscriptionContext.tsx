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

  // Always return unlimited access - subscription checks disabled
  useEffect(() => {
    if (user) {
      setSubscriptionStatus({
        has_subscription: true,
        status: 'unlimited',
        days_remaining: 999,
        is_trial: false,
        plan_name: 'Acesso Completo'
      });
    } else {
      setSubscriptionStatus(null);
    }
  }, [user]);

  async function refreshSubscription() {
    // No-op - subscription checks disabled
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

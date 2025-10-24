import React from 'react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

// SubscriptionGuard is now a pass-through component - all features are available
export default function SubscriptionGuard({ 
  children, 
  fallbackMessage 
}: SubscriptionGuardProps) {
  // Always render children - subscription checks disabled
  return <>{children}</>;
}

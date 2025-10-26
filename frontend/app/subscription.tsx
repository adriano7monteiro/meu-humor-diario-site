import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { LinearGradient } from 'expo-linear-gradient';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  features: string[];
  plan_type: string;
}

interface SubscriptionStatus {
  has_subscription: boolean;
  status: string;
  days_remaining: number;
  is_trial: boolean;
  plan_name: string;
  end_date?: string;
}

export default function SubscriptionScreen() {
  const { user, api } = useAuth();
  const { refreshSubscriptionStatus } = useSubscription();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading subscription data...');
      
      // Load plans (no auth required)
      try {
        console.log('📋 Loading plans...');
        const plansResponse = await api.get('/api/subscription/plans');
        console.log('✅ Raw plans response:', plansResponse.data);
        
        // The API returns { plans: [...] } so access .plans
        const plansData = plansResponse.data.plans || [];
        console.log('✅ Plans data:', plansData.length, 'plans found');
        setPlans(plansData);
      } catch (plansError) {
        console.error('❌ Error loading plans:', plansError);
        Alert.alert('Erro', 'Falha ao carregar planos de assinatura');
      }
      
      // Load subscription status (auth required)
      try {
        console.log('👤 Loading subscription status...');
        const statusResponse = await api.get('/api/subscription/status');
        console.log('✅ Status loaded:', statusResponse.data);
        setSubscriptionStatus(statusResponse.data);
        
        // Log subscription status but don't auto-redirect
        if (statusResponse.data.has_subscription && statusResponse.data.status === 'active') {
          console.log('✅ User has active subscription:', statusResponse.data.plan_name);
        }
        
      } catch (statusError) {
        console.error('❌ Error loading subscription status:', statusError);
        // Don't show error for status, just continue without it
      }
      
    } catch (error: any) {
      console.error('❌ General error loading subscription data:', error);
    } finally {
      console.log('✅ Loading complete');
      setLoading(false);
    }
  };

  const handlePurchasePlan = async (planId: string) => {
    try {
      setProcessingPayment(planId);
      
      // Get current URL origin for success/cancel URLs
      const origin = Platform.OS === 'web' 
        ? window.location.origin 
        : 'https://app.emergent.sh'; // Fallback for mobile
      
      const checkoutData = {
        plan_id: planId,
        success_url: `${origin}/subscription?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscription`
      };

      const response = await api.post('/api/subscription/checkout', checkoutData);
      
      if (response.data.url) {
        // Redirect to Stripe checkout
        if (Platform.OS === 'web') {
          // Check if we're in an iframe (like Expo preview)
          const isInIframe = window !== window.parent;
          
          if (isInIframe) {
            // Open in new window/tab to avoid iframe restrictions
            const newWindow = window.open(response.data.url, '_blank', 'width=600,height=700');
            if (!newWindow) {
              Alert.alert(
                'Popup Bloqueado',
                'Por favor, permita popups para este site e tente novamente.',
                [
                  {
                    text: 'Tentar Novamente',
                    onPress: () => window.open(response.data.url, '_blank')
                  }
                ]
              );
            }
          } else {
            // Direct redirect if not in iframe
            window.location.href = response.data.url;
          }
        } else {
          // For mobile, you might want to use WebView or similar
          Alert.alert(
            'Redirecionamento para Pagamento',
            'Você será redirecionado para a página de pagamento do Stripe.',
            [
              {
                text: 'Cancelar',
                style: 'cancel'
              },
              {
                text: 'Continuar',
                onPress: () => {
                  // Open external URL (this would need proper handling in a real app)
                  console.log('Redirect to:', response.data.url);
                }
              }
            ]
          );
        }
      }
      
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      Alert.alert('Erro', 'Falha ao iniciar processo de pagamento');
    } finally {
      setProcessingPayment(null);
    }
  };

  const checkPaymentStatus = async (sessionId: string) => {
    try {
      console.log('🔍 Checking payment status for session:', sessionId);
      console.log('👤 Current user:', user);
      
      const response = await api.get(`/api/subscription/checkout/status/${sessionId}`);
      console.log('✅ Payment status response:', response.data);
      
      if (response.data.payment_status === 'paid') {
        console.log('💰 Payment confirmed! Redirecting to home...');
        
        // Refresh subscription context and local data
        await refreshSubscriptionStatus();
        await loadData();
        
        Alert.alert(
          'Pagamento Confirmado!',
          'Sua assinatura foi ativada com sucesso. Redirecionando para a tela inicial...',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('🏠 User clicked OK, redirecting to home');
                router.replace('/home');
              }
            }
          ]
        );
        
        // Auto redirect after 2 seconds even if user doesn't click OK
        setTimeout(() => {
          console.log('🏠 Auto redirecting to home after timeout');
          router.replace('/home');
        }, 2000);
        
      } else if (response.data.status === 'expired') {
        console.log('⏰ Payment session expired');
        Alert.alert('Sessão Expirada', 'A sessão de pagamento expirou. Tente novamente.');
      } else {
        console.log('⏳ Payment still processing:', response.data);
        Alert.alert('Processando', 'Seu pagamento está sendo processado. Aguarde alguns instantes.');
        
        // Check again after 3 seconds if still processing
        setTimeout(() => {
          checkPaymentStatus(sessionId);
        }, 3000);
      }
      
    } catch (error: any) {
      console.error('❌ Error checking payment status:', error);
      
      // If 403 error, user might not be authenticated, try to redirect anyway
      if (error.response?.status === 403) {
        console.log('🔐 Authentication error, but redirecting to home anyway');
        Alert.alert(
          'Redirecionando...',
          'Redirecionando para a tela principal.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/home')
            }
          ]
        );
        
        setTimeout(() => {
          router.replace('/home');
        }, 1500);
      } else {
        Alert.alert('Erro', 'Falha ao verificar status do pagamento');
      }
    }
  };

  // Check for session_id in URL (return from Stripe)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      if (sessionId) {
        console.log('🔙 Returned from Stripe with session:', sessionId);
        
        // Clear URL parameters immediately
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // If user is not authenticated, redirect to home with success message
        if (!user) {
          console.log('🔐 No user found after Stripe, assuming successful payment and redirecting to home');
          Alert.alert(
            'Pagamento Processado!',
            'Seu pagamento foi processado. Faça login para acessar sua assinatura.',
            [
              {
                text: 'Ir para Home',
                onPress: () => router.replace('/home')
              }
            ]
          );
          
          setTimeout(() => {
            router.replace('/home');
          }, 2000);
          
          return;
        }
        
        // Wait a bit for auth context to be fully loaded before checking payment
        const timeoutId = setTimeout(() => {
          checkPaymentStatus(sessionId);
        }, 1500);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [user]);

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'monthly':
        return 'calendar-outline';
      case 'quarterly':
        return 'calendar';
      case 'yearly':
        return 'calendar-sharp';
      default:
        return 'pricetag-outline';
    }
  };

  const getBadgeColor = (planType: string) => {
    switch (planType) {
      case 'monthly':
        return '#10B981';
      case 'quarterly':
        return '#3B82F6';
      case 'yearly':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assinatura</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Carregando planos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assinatura</Text>
        </View>

        {/* Current Subscription Status */}
        {subscriptionStatus && (
          <View style={styles.statusCard}>
            <LinearGradient
              colors={subscriptionStatus.is_trial ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
              style={styles.statusGradient}
            >
              <View style={styles.statusContent}>
                <Ionicons 
                  name={subscriptionStatus.is_trial ? "time-outline" : "checkmark-circle-outline"} 
                  size={32} 
                  color="white" 
                />
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusTitle}>
                    {subscriptionStatus.is_trial ? 'Período Gratuito' : 'Assinatura Ativa'}
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    {subscriptionStatus.days_remaining} dias restantes
                  </Text>
                  {subscriptionStatus.plan_name && (
                    <Text style={styles.planName}>{subscriptionStatus.plan_name}</Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Plans List */}
        <View style={styles.plansContainer}>
          <Text style={styles.sectionTitle}>Escolha seu Plano</Text>
          <Text style={styles.sectionSubtitle}>
            Continue aproveitando todos os recursos do app
          </Text>

          {plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planTitleContainer}>
                  <Ionicons 
                    name={getPlanIcon(plan.plan_type)} 
                    size={24} 
                    color={getBadgeColor(plan.plan_type)} 
                  />
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.plan_type === 'yearly' && (
                    <View style={[styles.badge, { backgroundColor: getBadgeColor(plan.plan_type) }]}>
                      <Text style={styles.badgeText}>MELHOR VALOR</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                <Text style={styles.planDuration}>
                  {plan.duration_months === 1 ? 'por mês' : 
                   plan.duration_months === 6 ? 'por 6 meses' : 'por ano'}
                </Text>
              </View>

              <Text style={styles.planDescription}>{plan.description}</Text>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color="#10B981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  processingPayment === plan.id && styles.purchaseButtonDisabled
                ]}
                onPress={() => handlePurchasePlan(plan.id)}
                disabled={processingPayment !== null}
              >
                {processingPayment === plan.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.purchaseButtonText}>Assinar Agora</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={20} color="#6B7280" />
          <Text style={styles.securityText}>
            Pagamentos seguros processados pelo Stripe
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusGradient: {
    padding: 20,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 4,
  },
  planName: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
    marginTop: 2,
  },
  plansContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planHeader: {
    marginBottom: 12,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  planDuration: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  planDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  securityText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});
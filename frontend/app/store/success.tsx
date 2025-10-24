import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<string>('checking');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  useEffect(() => {
    const sessionId = params.session_id as string;
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      setLoading(false);
      setPaymentStatus('error');
    }
  }, [params.session_id]);

  const pollPaymentStatus = async (sessionId: string, currentAttempts = 0) => {
    try {
      if (currentAttempts >= maxAttempts) {
        setPaymentStatus('timeout');
        setLoading(false);
        return;
      }

      const response = await api.get(`/api/payments/checkout/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === 'paid') {
        setPaymentStatus('success');
        setLoading(false);
        return;
      } else if (data.status === 'expired') {
        setPaymentStatus('expired');
        setLoading(false);
        return;
      }

      // Continue polling if still pending
      setAttempts(currentAttempts + 1);
      setTimeout(() => {
        pollPaymentStatus(sessionId, currentAttempts + 1);
      }, 2000);

    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus('error');
      setLoading(false);
    }
  };

  const handleGoToLibrary = () => {
    router.push('/library');
  };

  const handleGoToStore = () => {
    router.push('/store');
  };

  const handleRetry = () => {
    const sessionId = params.session_id as string;
    if (sessionId) {
      setLoading(true);
      setPaymentStatus('checking');
      setAttempts(0);
      pollPaymentStatus(sessionId);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.statusTitle}>Verificando pagamento...</Text>
          <Text style={styles.statusMessage}>
            Aguarde enquanto confirmamos seu pagamento
          </Text>
          <Text style={styles.attemptsText}>
            Tentativa {attempts + 1} de {maxAttempts}
          </Text>
        </View>
      );
    }

    switch (paymentStatus) {
      case 'success':
        return (
          <View style={styles.centerContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
            </View>
            <Text style={styles.successTitle}>Pagamento Confirmado! 🎉</Text>
            <Text style={styles.successMessage}>
              Parabéns! Seu ebook foi adicionado à sua biblioteca. 
              Você pode começar a ler agora mesmo.
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGoToLibrary}
              >
                <Ionicons name="library" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Ver na Biblioteca</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleGoToStore}
              >
                <Text style={styles.secondaryButtonText}>Continuar Comprando</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'expired':
        return (
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="time-outline" size={80} color="#F59E0B" />
            </View>
            <Text style={styles.errorTitle}>Sessão Expirada</Text>
            <Text style={styles.errorMessage}>
              A sessão de pagamento expirou. Por favor, tente novamente.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoToStore}
            >
              <Text style={styles.primaryButtonText}>Voltar à Loja</Text>
            </TouchableOpacity>
          </View>
        );

      case 'timeout':
        return (
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={80} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Tempo Limite Excedido</Text>
            <Text style={styles.errorMessage}>
              Não conseguimos confirmar o pagamento. Verifique seu email 
              para confirmação ou entre em contato com o suporte.
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRetry}
              >
                <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleGoToStore}
              >
                <Text style={styles.secondaryButtonText}>Voltar à Loja</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Erro na Verificação</Text>
            <Text style={styles.errorMessage}>
              Ocorreu um erro ao verificar o pagamento. Tente novamente.
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRetry}
              >
                <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleGoToStore}
              >
                <Text style={styles.secondaryButtonText}>Voltar à Loja</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/store')}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status do Pagamento</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22C55E',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  statusMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  attemptsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});
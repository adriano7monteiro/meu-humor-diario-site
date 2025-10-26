import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PricingPlan {
  name: string;
  maxEmployees: number;
  pricePerEmployee: number;
  features: string[];
  recommended?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'STARTER',
    maxEmployees: 50,
    pricePerEmployee: 15,
    features: [
      'Acesso básico ao app',
      'Chat com Dr. Ana (10 sessões/mês)',
      'Dashboard administrativo',
      'Relatórios mensais',
      'Suporte por email'
    ]
  },
  {
    name: 'BUSINESS',
    maxEmployees: 200,
    pricePerEmployee: 12,
    features: [
      'Tudo do Starter +',
      'Chat ilimitado com Dr. Ana',
      'Exercícios personalizados',
      'Relatórios detalhados',
      'Suporte prioritário',
      'Integração básica'
    ],
    recommended: true
  },
  {
    name: 'ENTERPRISE',
    maxEmployees: 999999,
    pricePerEmployee: 8,
    features: [
      'Tudo do Business +',
      'Dashboard executivo',
      'Integração completa',
      'Treinamentos para gestores',
      'Webinars mensais',
      'Account manager dedicado',
      'SLA garantido'
    ]
  }
];

export default function CorporatePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [employeeCount, setEmployeeCount] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    employees: '',
    message: ''
  });

  const calculatePrice = (plan: PricingPlan, employees: number) => {
    const monthlyPrice = plan.pricePerEmployee * employees;
    const annualPrice = monthlyPrice * 12 * 0.8; // 20% desconto anual
    return { monthlyPrice, annualPrice };
  };

  const getRecommendedPlan = (employees: number) => {
    if (employees <= 50) return pricingPlans[0];
    if (employees <= 200) return pricingPlans[1];
    return pricingPlans[2];
  };

  const handleEmployeeCountChange = (value: string) => {
    setEmployeeCount(value);
    const count = parseInt(value);
    if (count > 0) {
      const plan = getRecommendedPlan(count);
      setSelectedPlan(plan);
    }
  };

  const handleRequestQuote = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setContactForm(prev => ({ ...prev, employees: employeeCount }));
    setShowQuoteModal(true);
  };

  const submitQuoteRequest = async () => {
    try {
      // Aqui você integraria com seu backend para processar o orçamento
      console.log('Quote request:', {
        ...contactForm,
        selectedPlan: selectedPlan?.name,
        estimatedEmployees: employeeCount
      });

      Alert.alert(
        'Orçamento Solicitado! 🎉',
        'Recebemos sua solicitação. Nossa equipe entrará em contato em até 24 horas para agendar uma demonstração personalizada.',
        [{ text: 'OK', onPress: () => setShowQuoteModal(false) }]
      );

      // Reset form
      setContactForm({
        company: '',
        name: '',
        email: '',
        phone: '',
        employees: '',
        message: ''
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a solicitação. Tente novamente.');
    }
  };

  const renderPricingCard = (plan: PricingPlan) => {
    const employees = parseInt(employeeCount) || 100;
    const { monthlyPrice, annualPrice } = calculatePrice(plan, employees);
    const isSelected = selectedPlan?.name === plan.name;

    return (
      <View 
        key={plan.name}
        style={[
          styles.pricingCard,
          plan.recommended && styles.recommendedCard,
          isSelected && styles.selectedCard
        ]}
      >
        {plan.recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>RECOMENDADO</Text>
          </View>
        )}

        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planSubtitle}>
          Até {plan.maxEmployees === 999999 ? '∞' : plan.maxEmployees} funcionários
        </Text>

        <View style={styles.priceSection}>
          <Text style={styles.pricePerEmployee}>
            R$ {plan.pricePerEmployee}/funcionário/mês
          </Text>
          {employeeCount && (
            <View style={styles.calculatedPrice}>
              <Text style={styles.monthlyTotal}>
                R$ {monthlyPrice.toLocaleString('pt-BR')}/mês
              </Text>
              <Text style={styles.annualTotal}>
                R$ {annualPrice.toLocaleString('pt-BR')}/ano (20% OFF)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.featuresSection}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.quoteButton,
            plan.recommended && styles.recommendedButton
          ]}
          onPress={() => handleRequestQuote(plan)}
        >
          <Text style={[
            styles.quoteButtonText,
            plan.recommended && styles.recommendedButtonText
          ]}>
            Solicitar Orçamento
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Soluções Corporativas</Text>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Ionicons name="home" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          style={styles.heroSection}
        >
          <Text style={styles.heroTitle}>
            Transforme o Bem-Estar da Sua Empresa
          </Text>
          <Text style={styles.heroSubtitle}>
            Reduza absenteísmo, aumente produtividade e cuide da saúde mental dos seus colaboradores com nossa plataforma de IA.
          </Text>
          
          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>40%</Text>
              <Text style={styles.statLabel}>Redução Absenteísmo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>85%</Text>
              <Text style={styles.statLabel}>Satisfação Funcionários</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>ROI 3x</Text>
              <Text style={styles.statLabel}>Retorno Investimento</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por que Escolher Nossa Solução?</Text>
          
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <Ionicons name="trending-down" size={32} color="#EF4444" />
              <Text style={styles.benefitTitle}>Reduz Custos</Text>
              <Text style={styles.benefitText}>
                Economize até R$ 50.000/ano em licenças médicas e rotatividade
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <Ionicons name="people" size={32} color="#22C55E" />
              <Text style={styles.benefitTitle}>Engaja Equipes</Text>
              <Text style={styles.benefitText}>
                Melhore clima organizacional e retenção de talentos
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <Ionicons name="analytics" size={32} color="#3B82F6" />
              <Text style={styles.benefitTitle}>Dados Precisos</Text>
              <Text style={styles.benefitText}>
                Dashboard executivo com insights acionáveis sobre bem-estar
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <Ionicons name="shield-checkmark" size={32} color="#F59E0B" />
              <Text style={styles.benefitTitle}>Compliance</Text>
              <Text style={styles.benefitText}>
                Atenda normas de ESG e bem-estar corporativo
              </Text>
            </View>
          </View>
        </View>

        {/* Calculator Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calcule o Investimento</Text>
          
          <View style={styles.calculatorCard}>
            <Text style={styles.calculatorLabel}>
              Quantos funcionários sua empresa tem?
            </Text>
            <TextInput
              style={styles.employeeInput}
              placeholder="Ex: 100"
              value={employeeCount}
              onChangeText={handleEmployeeCountChange}
              keyboardType="numeric"
            />
            
            {selectedPlan && employeeCount && (
              <View style={styles.calculatorResult}>
                <Text style={styles.calculatorResultTitle}>
                  Plano Recomendado: {selectedPlan.name}
                </Text>
                <Text style={styles.calculatorResultPrice}>
                  R$ {calculatePrice(selectedPlan, parseInt(employeeCount)).monthlyPrice.toLocaleString('pt-BR')}/mês
                </Text>
                <Text style={styles.calculatorResultAnnual}>
                  R$ {calculatePrice(selectedPlan, parseInt(employeeCount)).annualPrice.toLocaleString('pt-BR')}/ano (20% desconto)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Pricing Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escolha o Plano Ideal</Text>
          
          <View style={styles.pricingGrid}>
            {pricingPlans.map(renderPricingCard)}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            style={styles.ctaCard}
          >
            <Text style={styles.ctaTitle}>Pronto para Começar?</Text>
            <Text style={styles.ctaText}>
              Agende uma demonstração gratuita e veja como podemos transformar o bem-estar na sua empresa
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => setShowQuoteModal(true)}
            >
              <Text style={styles.ctaButtonText}>Agendar Demonstração</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

      </ScrollView>

      {/* Quote Modal */}
      <Modal
        visible={showQuoteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solicitar Orçamento</Text>
              <TouchableOpacity
                onPress={() => setShowQuoteModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScrollView}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Empresa *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Nome da empresa"
                  value={contactForm.company}
                  onChangeText={(text) => setContactForm(prev => ({ ...prev, company: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome Completo *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Seu nome"
                  value={contactForm.name}
                  onChangeText={(text) => setContactForm(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Corporativo *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="email@empresa.com"
                  value={contactForm.email}
                  onChangeText={(text) => setContactForm(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="(11) 99999-9999"
                  value={contactForm.phone}
                  onChangeText={(text) => setContactForm(prev => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Número de Funcionários *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ex: 100"
                  value={contactForm.employees}
                  onChangeText={(text) => setContactForm(prev => ({ ...prev, employees: text }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mensagem (opcional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Conte-nos mais sobre suas necessidades..."
                  value={contactForm.message}
                  onChangeText={(text) => setContactForm(prev => ({ ...prev, message: text }))}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {selectedPlan && (
                <View style={styles.selectedPlanInfo}>
                  <Text style={styles.selectedPlanLabel}>Plano Selecionado:</Text>
                  <Text style={styles.selectedPlanName}>{selectedPlan.name}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitQuoteRequest}
              >
                <Text style={styles.submitButtonText}>Enviar Solicitação</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
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
  heroSection: {
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#E8EAFF',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#E8EAFF',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  benefitCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  calculatorCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calculatorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  employeeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  calculatorResult: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  calculatorResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 8,
  },
  calculatorResultPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  calculatorResultAnnual: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  pricingGrid: {
    gap: 16,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendedCard: {
    borderColor: '#4F46E5',
    transform: [{ scale: 1.02 }],
  },
  selectedCard: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: 24,
    right: 24,
    backgroundColor: '#4F46E5',
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 8,
  },
  planSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pricePerEmployee: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4F46E5',
    textAlign: 'center',
  },
  calculatedPrice: {
    marginTop: 12,
    alignItems: 'center',
  },
  monthlyTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  annualTotal: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  featuresSection: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  quoteButton: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  recommendedButton: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  quoteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  recommendedButtonText: {
    color: '#FFFFFF',
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  ctaCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 16,
    color: '#DCFCE7',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  formScrollView: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectedPlanInfo: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedPlanLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  selectedPlanName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
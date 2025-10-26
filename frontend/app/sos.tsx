import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const groundingTechnique = [
  { sense: '5 coisas que você VÊ', icon: 'eye', color: '#3B82F6' },
  { sense: '4 coisas que você TOCA', icon: 'hand-left', color: '#8B5CF6' },
  { sense: '3 coisas que você OUVE', icon: 'ear', color: '#EC4899' },
  { sense: '2 coisas que você CHEIRA', icon: 'nose', color: '#F59E0B' },
  { sense: '1 coisa que você SABOREIA', icon: 'restaurant', color: '#EF4444' },
];

const emergencyContacts = [
  {
    name: 'CVV - Centro de Valorização da Vida',
    number: '188',
    description: 'Apoio emocional e prevenção do suicídio',
    available: '24h - Ligação gratuita',
  },
  {
    name: 'CAPS - Centro de Atenção Psicossocial',
    number: '0800-273-8255',
    description: 'Atendimento em saúde mental',
    available: 'Horário comercial',
  },
];

const quickTips = [
  { icon: 'water', tip: 'Beba um copo de água gelada', color: '#3B82F6' },
  { icon: 'walk', tip: 'Dê uma caminhada de 5 minutos', color: '#22C55E' },
  { icon: 'musical-notes', tip: 'Ouça uma música calma', color: '#8B5CF6' },
  { icon: 'chatbubbles', tip: 'Converse com alguém', color: '#F59E0B' },
  { icon: 'book', tip: 'Leia algo inspirador', color: '#EC4899' },
  { icon: 'fitness', tip: 'Faça 10 respirações profundas', color: '#EF4444' },
];

const affirmations = [
  '"Isto também passará"',
  '"Eu sou mais forte do que penso"',
  '"Um passo de cada vez"',
  '"Eu mereço amor e cuidado"',
  '"Amanhã é um novo dia"',
  '"Eu não estou sozinho(a)"',
];

export default function SOSScreen() {
  const router = useRouter();
  const [currentAffirmation, setCurrentAffirmation] = useState(0);

  const handleCall = (number: string) => {
    Alert.alert(
      'Ligar para ajuda?',
      `Você será conectado ao ${number}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ligar', onPress: () => Linking.openURL(`tel:${number}`) }
      ]
    );
  };

  const goToDrAna = () => {
    router.push({
      pathname: '/chat',
      params: {
        fromSOS: 'true',
        context: 'crisis_support'
      }
    });
  };

  const goToBreathing = () => {
    router.push('/breathing');
  };

  const nextAffirmation = () => {
    setCurrentAffirmation((prev) => (prev + 1) % affirmations.length);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS - Apoio Imediato</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Emergency Banner */}
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.emergencyBanner}
        >
          <Ionicons name="alert-circle" size={48} color="#FFFFFF" />
          <Text style={styles.emergencyTitle}>Você não está sozinho(a)</Text>
          <Text style={styles.emergencyText}>
            Se você está em crise, busque ajuda profissional imediatamente
          </Text>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={goToDrAna}>
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="chatbubbles" size={28} color="#4F46E5" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Conversar com Dr. Ana</Text>
              <Text style={styles.actionDescription}>Chat terapêutico disponível agora</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={goToBreathing}>
            <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="leaf" size={28} color="#3B82F6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Exercício de Respiração</Text>
              <Text style={styles.actionDescription}>Acalme-se em 2 minutos</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contatos de Emergência</Text>
          {emergencyContacts.map((contact, index) => (
            <View key={index} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactDescription}>{contact.description}</Text>
                <Text style={styles.contactAvailable}>{contact.available}</Text>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(contact.number)}
              >
                <Ionicons name="call" size={24} color="#FFFFFF" />
                <Text style={styles.callButtonText}>{contact.number}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Grounding Technique */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Técnica 5-4-3-2-1 (Grounding)</Text>
          <Text style={styles.sectionSubtitle}>
            Use seus sentidos para voltar ao momento presente
          </Text>
          {groundingTechnique.map((item, index) => (
            <View key={index} style={styles.groundingItem}>
              <View style={[styles.groundingIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.groundingText}>{item.sense}</Text>
            </View>
          ))}
        </View>

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dicas Rápidas</Text>
          <View style={styles.tipsGrid}>
            {quickTips.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <Ionicons name={tip.icon} size={28} color={tip.color} />
                <Text style={styles.tipText}>{tip.tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Affirmations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Afirmação Positiva</Text>
          <TouchableOpacity
            style={styles.affirmationCard}
            onPress={nextAffirmation}
          >
            <Ionicons name="heart" size={32} color="#EC4899" />
            <Text style={styles.affirmationText}>
              {affirmations[currentAffirmation]}
            </Text>
            <Text style={styles.affirmationHint}>Toque para próxima</Text>
          </TouchableOpacity>
        </View>

        {/* Important Message */}
        <View style={styles.importantCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.importantText}>
            Lembre-se: Pedir ajuda é um sinal de coragem, não de fraqueza. 
            Você merece apoio e cuidado.
          </Text>
        </View>
      </ScrollView>
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
  scrollContainer: {
    padding: 20,
  },
  emergencyBanner: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  contactAvailable: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    padding: 12,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  groundingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  groundingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groundingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tipCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  tipText: {
    fontSize: 13,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 8,
  },
  affirmationCard: {
    backgroundColor: '#FCE7F3',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  affirmationText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#831843',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  affirmationHint: {
    fontSize: 12,
    color: '#9F1239',
    opacity: 0.7,
  },
  importantCard: {
    flexDirection: 'row',
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  importantText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    marginLeft: 12,
  },
});
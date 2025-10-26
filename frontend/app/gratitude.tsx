import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface GratitudeEntry {
  id: string;
  gratitudes: string[];
  reflection?: string;
  date: string;
}

export default function GratitudeScreen() {
  const { api } = useAuth();
  const router = useRouter();
  
  const [gratitudes, setGratitudes] = useState(['', '', '']);
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<GratitudeEntry | null>(null);
  const [history, setHistory] = useState<GratitudeEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadTodayEntry();
    loadHistory();
  }, []);

  const loadTodayEntry = async () => {
    try {
      const response = await api.get('/api/gratitude/today');
      if (response.data) {
        setTodayEntry(response.data);
        setGratitudes(response.data.gratitudes);
        setReflection(response.data.reflection || '');
      }
    } catch (error) {
      console.log('No entry for today');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/api/gratitude/history?limit=7');
      setHistory(response.data);
    } catch (error) {
      console.log('Error loading history');
    }
  };

  const handleSave = async () => {
    const filledGratitudes = gratitudes.filter(g => g.trim().length > 0);
    
    if (filledGratitudes.length === 0) {
      Alert.alert('Ops!', 'Escreva pelo menos uma gratidão');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/gratitude', {
        gratitudes: filledGratitudes,
        reflection: reflection.trim() || null
      });

      setLoading(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao salvar');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.push('/home');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short' 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diário de Gratidão</Text>
        <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
          <Ionicons 
            name={showHistory ? "close" : "time"} 
            size={24} 
            color="#4F46E5" 
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {!showHistory ? (
            <>
              {/* Info Card */}
              <View style={styles.infoCard}>
                <Ionicons name="heart" size={32} color="#F59E0B" />
                <Text style={styles.infoTitle}>Por que gratidão?</Text>
                <Text style={styles.infoText}>
                  Pesquisas mostram que praticar gratidão diariamente reduz estresse, 
                  melhora o sono e aumenta a felicidade.
                </Text>
                <View style={styles.rewardBadge}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.rewardText}>+10 Estrelas por dia</Text>
                </View>
              </View>

              {todayEntry && (
                <View style={styles.completedBanner}>
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  <Text style={styles.completedText}>
                    Você já registrou gratidão hoje! 🎉
                  </Text>
                </View>
              )}

              {/* Gratitude Inputs */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Hoje sou grato(a) por...
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Liste até 3 coisas pelas quais você é grato hoje
                </Text>

                {[0, 1, 2].map((index) => (
                  <View key={index} style={styles.inputContainer}>
                    <View style={styles.inputLabel}>
                      <Ionicons name="leaf" size={20} color="#22C55E" />
                      <Text style={styles.inputNumber}>{index + 1}.</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder={
                        index === 0 ? "Ex: Saúde da minha família" :
                        index === 1 ? "Ex: Um dia de sol" :
                        "Ex: Uma boa conversa"
                      }
                      value={gratitudes[index]}
                      onChangeText={(text) => {
                        const newGratitudes = [...gratitudes];
                        newGratitudes[index] = text;
                        setGratitudes(newGratitudes);
                      }}
                      maxLength={100}
                      editable={!todayEntry}
                    />
                  </View>
                ))}
              </View>

              {/* Reflection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Reflexão (Opcional)
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Como essas coisas te fazem sentir?
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Escreva seus pensamentos..."
                  value={reflection}
                  onChangeText={setReflection}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  editable={!todayEntry}
                />
              </View>

              {/* Save Button */}
              {!todayEntry && (
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="save" size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Salvar Gratidão</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* History Button */}
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => setShowHistory(!showHistory)}
              >
                <Ionicons name="time-outline" size={20} color="#64748B" />
                <Text style={styles.historyButtonText}>
                  {showHistory ? 'Voltar ao formulário' : 'Ver histórico dos últimos 7 dias'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Últimos 7 Dias</Text>
              {history.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="heart-dislike" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>Nenhum registro ainda</Text>
                </View>
              ) : (
                history.map((entry) => (
                  <View key={entry.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Ionicons name="calendar" size={20} color="#4F46E5" />
                      <Text style={styles.historyDate}>
                        {formatDate(entry.date)}
                      </Text>
                    </View>
                    {entry.gratitudes.map((g, i) => (
                      <View key={i} style={styles.historyItem}>
                        <Ionicons name="leaf" size={16} color="#22C55E" />
                        <Text style={styles.historyItemText}>{g}</Text>
                      </View>
                    ))}
                    {entry.reflection && (
                      <Text style={styles.historyReflection}>
                        "{entry.reflection}"
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
            </View>
            
            <Text style={styles.modalTitle}>
              Gratidão Registrada! 🌟
            </Text>
            
            <Text style={styles.modalMessage}>
              Você ganhou 10 estrelas por praticar gratidão!
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseSuccessModal}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
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
  infoCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 6,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 12,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 12,
  },
  inputNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 6,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  historyButtonText: {
    color: '#64748B',
    fontSize: 14,
    marginLeft: 8,
  },
  historyContainer: {
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyItemText: {
    fontSize: 14,
    color: '#1E293B',
    marginLeft: 8,
    flex: 1,
  },
  historyReflection: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalIconContainer: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

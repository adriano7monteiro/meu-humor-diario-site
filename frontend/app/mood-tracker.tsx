import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import SubscriptionGuard from '../components/SubscriptionGuard';
import axios from 'axios';
import Constants from 'expo-constants';

interface MoodOption {
  level: number;
  emoji: string;
  label: string;
  color: string;
}

const moodOptions: MoodOption[] = [
  { level: 1, emoji: '😢', label: 'Muito Triste', color: '#EF4444' },
  { level: 2, emoji: '😞', label: 'Triste', color: '#F97316' },
  { level: 3, emoji: '😐', label: 'Neutro', color: '#EAB308' },
  { level: 4, emoji: '😊', label: 'Feliz', color: '#22C55E' },
  { level: 5, emoji: '😄', label: 'Muito Feliz', color: '#16A34A' },
];

// For web, always use relative URLs that proxy through Expo
const API_BASE_URL = Platform.OS === 'web' ? '' : 'http://localhost:8001';
console.log('🌐 Mood Tracker API Base URL:', API_BASE_URL);

export default function MoodTrackerScreen() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayMood, setTodayMood] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDrAnaModal, setShowDrAnaModal] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadTodayMood();
  }, []);

  const loadTodayMood = async () => {
    try {
      const token = await import('@react-native-async-storage/async-storage')
        .then(module => module.default.getItem('@token'));
      
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/mood/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setTodayMood(response.data);
        setSelectedMood(response.data.mood_level);
        setDescription(response.data.description || '');
      }
    } catch (error) {
      console.log('Error loading today mood:', error);
    }
  };

  const saveMood = async () => {
    if (!selectedMood) {
      Alert.alert('Erro', 'Por favor, selecione seu humor');
      return;
    }

    setLoading(true);
    try {
      const token = await import('@react-native-async-storage/async-storage')
        .then(module => module.default.getItem('@token'));
      
      if (!token) {
        Alert.alert('Erro', 'Token de autenticação não encontrado');
        return;
      }

      const selectedMoodOption = moodOptions.find(m => m.level === selectedMood);
      
      const moodData = {
        mood_level: selectedMood,
        mood_emoji: selectedMoodOption?.emoji,
        description: description.trim() || null,
      };

      await axios.post(`${API_BASE_URL}/api/mood`, moodData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Stop loading before showing modal
      setLoading(false);

      console.log('🔍 Mood saved. Selected mood level:', selectedMood);

      // Check if user is feeling sad (level 1 or 2) and offer therapy chat
      if (selectedMood === 1 || selectedMood === 2) {
        console.log('💙 User is sad, showing Dr. Ana modal');
        setShowDrAnaModal(true);
      } else {
        console.log('😊 User mood is positive, redirecting to home');
        // Redirect immediately after successful save for positive moods
        router.replace('/home');
      }
    } catch (error: any) {
      console.log('Error saving mood:', error);
      Alert.alert('Erro', 'Não foi possível salvar o humor. Tente novamente.');
      setLoading(false);
    }
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <SubscriptionGuard>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Como você está?</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Date Info */}
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDate()}</Text>
              {todayMood && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {isEditing ? 'Editando' : 'Já registrado hoje'}
                  </Text>
                </View>
              )}
            </View>

            {/* Greeting */}
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Olá, {user?.name}!</Text>
              <Text style={styles.subGreetingText}>
                {todayMood 
                  ? 'Como você está se sentindo agora?' 
                  : 'Como foi seu dia hoje?'
                }
              </Text>
            </View>

            {/* Mood Selection */}
            <View style={styles.moodContainer}>
              <Text style={styles.sectionTitle}>Selecione seu humor:</Text>
              <View style={styles.moodOptions}>
                {moodOptions.map((mood) => (
                  <TouchableOpacity
                    key={mood.level}
                    style={[
                      styles.moodOption,
                      selectedMood === mood.level && {
                        backgroundColor: mood.color + '20',
                        borderColor: mood.color,
                      }
                    ]}
                    onPress={() => setSelectedMood(mood.level)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[
                      styles.moodLabel,
                      selectedMood === mood.level && { color: mood.color, fontWeight: '600' }
                    ]}>
                      {mood.label}
                    </Text>
                    <Text style={styles.moodLevel}>{mood.level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Como você se sentiu hoje? (opcional)</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Compartilhe seus pensamentos e sentimentos..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCounter}>
                {description.length}/500 caracteres
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedMood || loading) && styles.disabledButton
              ]}
              onPress={saveMood}
              disabled={!selectedMood || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {todayMood ? 'Atualizar Humor' : 'Registrar Humor'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Dr. Ana Modal */}
      <Modal
        visible={showDrAnaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDrAnaModal(false);
          router.replace('/home');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="heart" size={48} color="#4F46E5" />
            </View>
            
            <Text style={styles.modalTitle}>
              Percebemos que você não está muito bem 💙
            </Text>
            
            <Text style={styles.modalMessage}>
              Gostaria de conversar com a Dr. Ana, nossa terapeuta virtual? 
              Ela pode ajudar você a se sentir melhor.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowDrAnaModal(false);
                  router.replace('/home');
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Agora não</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  setShowDrAnaModal(false);
                  const selectedMoodOption = moodOptions.find(m => m.level === selectedMood);
                  router.push({
                    pathname: '/chat',
                    params: {
                      fromMood: 'true',
                      moodLevel: selectedMood?.toString() || '1',
                      moodEmoji: selectedMoodOption?.emoji || '😢',
                      moodLabel: selectedMoodOption?.label || 'Muito Triste'
                    }
                  });
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>Sim, quero conversar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SubscriptionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  greetingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subGreetingText: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  moodContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  moodOptions: {
    gap: 12,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  moodLabel: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  moodLevel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 120,
  },
  charCounter: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Dr. Ana Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalIconContainer: {
    backgroundColor: '#EEF2FF',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#4F46E5',
  },
  modalButtonSecondary: {
    backgroundColor: '#F1F5F9',
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondaryText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});
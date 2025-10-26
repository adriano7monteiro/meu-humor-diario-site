import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';

type ReminderType = 'mood' | 'water' | 'break' | 'sleep' | 'meditation' | 'gratitude';

interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  time: string;
  enabled: boolean;
  days: number[];
}

const reminderTypes: Record<ReminderType, { icon: any; color: string; defaultTitle: string }> = {
  mood: { icon: 'happy', color: '#F59E0B', defaultTitle: 'Registrar Humor' },
  water: { icon: 'water', color: '#3B82F6', defaultTitle: 'Beber Água' },
  break: { icon: 'cafe', color: '#8B5CF6', defaultTitle: 'Fazer uma Pausa' },
  sleep: { icon: 'moon', color: '#6366F1', defaultTitle: 'Hora de Dormir' },
  meditation: { icon: 'leaf', color: '#22C55E', defaultTitle: 'Meditar' },
  gratitude: { icon: 'heart', color: '#EC4899', defaultTitle: 'Gratidão Diária' },
};

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function RemindersScreen() {
  const { api } = useAuth();
  const router = useRouter();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    type: 'mood',
    title: '',
    time: '09:00',
    enabled: true,
    days: [0, 1, 2, 3, 4, 5, 6],
  });

  useEffect(() => {
    loadReminders();
    requestNotificationPermissions();
  }, []);

  const requestNotificationPermissions = async () => {
    const hasPermission = await NotificationService.requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permissão Necessária',
        'Para receber lembretes, você precisa permitir notificações. Ative nas configurações do seu dispositivo.'
      );
    }
  };

  const loadReminders = async () => {
    try {
      const response = await api.get('/api/reminders');
      setReminders(response.data);
    } catch (error) {
      console.log('Error loading reminders');
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (id: string, enabled: boolean) => {
    try {
      await api.patch(`/api/reminders/${id}`, { enabled });
      const reminder = reminders.find(r => r.id === id);
      
      if (reminder) {
        if (enabled) {
          // Schedule notification
          await NotificationService.scheduleReminder(
            reminder.id,
            reminder.title,
            reminder.time,
            reminder.days
          );
        } else {
          // Cancel notification
          await NotificationService.cancelReminderNotifications(reminder.id);
        }
      }
      
      setReminders(prev =>
        prev.map(r => r.id === id ? { ...r, enabled } : r)
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar lembrete');
    }
  };

  const deleteReminder = async (id: string) => {
    Alert.alert(
      'Deletar Lembrete',
      'Tem certeza que deseja deletar este lembrete?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/reminders/${id}`);
              // Cancel all notifications for this reminder
              await NotificationService.cancelReminderNotifications(id);
              setReminders(prev => prev.filter(r => r.id !== id));
            } catch (error) {
              Alert.alert('Erro', 'Erro ao deletar lembrete');
            }
          }
        }
      ]
    );
  };

  const createReminder = async () => {
    if (!newReminder.title?.trim()) {
      Alert.alert('Ops!', 'Digite um título para o lembrete');
      return;
    }

    try {
      const response = await api.post('/api/reminders', newReminder);
      const createdReminder = response.data;
      
      // Schedule notification if enabled
      if (createdReminder.enabled) {
        await NotificationService.scheduleReminder(
          createdReminder.id,
          createdReminder.title,
          createdReminder.time,
          createdReminder.days
        );
      }
      
      setReminders(prev => [...prev, createdReminder]);
      setShowModal(false);
      setNewReminder({
        type: 'mood',
        title: '',
        time: '09:00',
        enabled: true,
        days: [0, 1, 2, 3, 4, 5, 6],
      });
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar lembrete');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  const toggleDay = (day: number) => {
    setNewReminder(prev => {
      const days = prev.days || [];
      if (days.includes(day)) {
        return { ...prev, days: days.filter(d => d !== day) };
      } else {
        return { ...prev, days: [...days, day].sort() };
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lembretes</Text>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="notifications" size={28} color="#4F46E5" />
          <Text style={styles.infoTitle}>Crie Hábitos Saudáveis</Text>
          <Text style={styles.infoText}>
            Configure lembretes para manter sua rotina de autocuidado
          </Text>
        </View>

        {/* Reminders List */}
        {loading ? (
          <Text style={styles.loadingText}>Carregando...</Text>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alarm-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Nenhum lembrete ainda</Text>
            <Text style={styles.emptySubtext}>Toque no + para criar seu primeiro lembrete</Text>
          </View>
        ) : (
          reminders.map((reminder) => {
            const typeInfo = reminderTypes[reminder.type];
            return (
              <View key={reminder.id} style={styles.reminderCard}>
                <View style={[styles.reminderIcon, { backgroundColor: typeInfo.color + '20' }]}>
                  <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  <Text style={styles.reminderTime}>{reminder.time}</Text>
                  <View style={styles.reminderDays}>
                    {weekDays.map((day, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.dayBadge,
                          reminder.days.includes(index) && styles.dayBadgeActive
                        ]}
                      >
                        {day}
                      </Text>
                    ))}
                  </View>
                </View>
                <View style={styles.reminderActions}>
                  <Switch
                    value={reminder.enabled}
                    onValueChange={(value) => toggleReminder(reminder.id, value)}
                    trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                    thumbColor={reminder.enabled ? '#4F46E5' : '#9CA3AF'}
                  />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteReminder(reminder.id)}
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Lembrete</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Type Selection */}
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.typeGrid}>
                {(Object.keys(reminderTypes) as ReminderType[]).map((type) => {
                  const typeInfo = reminderTypes[type];
                  const isSelected = newReminder.type === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeCard,
                        isSelected && { borderColor: typeInfo.color, borderWidth: 2 }
                      ]}
                      onPress={() => setNewReminder(prev => ({
                        ...prev,
                        type,
                        title: typeInfo.defaultTitle
                      }))}
                    >
                      <Ionicons name={typeInfo.icon} size={28} color={typeInfo.color} />
                      <Text style={styles.typeText}>{typeInfo.defaultTitle}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title */}
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={newReminder.title}
                onChangeText={(text) => setNewReminder(prev => ({ ...prev, title: text }))}
                placeholder="Ex: Hora de beber água"
              />

              {/* Time */}
              <Text style={styles.label}>Horário</Text>
              <TextInput
                style={styles.input}
                value={newReminder.time}
                onChangeText={(text) => setNewReminder(prev => ({ ...prev, time: text }))}
                placeholder="09:00"
              />

              {/* Days */}
              <Text style={styles.label}>Dias da Semana</Text>
              <View style={styles.daysSelector}>
                {weekDays.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      newReminder.days?.includes(index) && styles.dayButtonActive
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        newReminder.days?.includes(index) && styles.dayButtonTextActive
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Create Button */}
              <TouchableOpacity style={styles.createButton} onPress={createReminder}>
                <Text style={styles.createButtonText}>Criar Lembrete</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <View style={styles.successModalIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
            </View>
            
            <Text style={styles.successModalTitle}>
              Lembrete Criado! ⏰
            </Text>
            
            <Text style={styles.successModalMessage}>
              Seu lembrete foi configurado com sucesso!
            </Text>

            <TouchableOpacity
              style={styles.successModalButton}
              onPress={handleCloseSuccessModal}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
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
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3730A3',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#3730A3',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginBottom: 8,
  },
  reminderDays: {
    flexDirection: 'row',
    gap: 4,
  },
  dayBadge: {
    fontSize: 10,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },
  dayBadgeActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  reminderActions: {
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '30%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeText: {
    fontSize: 11,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  daysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContainer: {
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
  successModalIconContainer: {
    marginBottom: 24,
  },
  successModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successModalButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  successModalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface UserStats {
  total_xp: number;
  current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
}

// For web, always use relative URLs that proxy through Expo
const API_BASE_URL = Platform.OS === 'web' ? '' : 'http://localhost:8001';
console.log('🌐 Profile API Base URL:', API_BASE_URL);

export default function ProfileScreen() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const { user, signOut, enableNotifications, disableNotifications, areNotificationsEnabled } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadUserStats();
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const enabled = await areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.log('Error checking notification status:', error);
    }
  };

  const toggleNotifications = async () => {
    setLoadingNotifications(true);
    try {
      if (notificationsEnabled) {
        await disableNotifications();
        setNotificationsEnabled(false);
        Alert.alert('Notificações Desabilitadas', 'Você não receberá mais lembretes diários.');
      } else {
        const success = await enableNotifications();
        if (success) {
          setNotificationsEnabled(true);
          Alert.alert(
            'Notificações Habilitadas! 🔔', 
            'Você receberá lembretes diários para registrar seu humor e completar missões:\n\n• 10:00 - Missões diárias\n• 18:00 - Registro de humor\n• 20:00 - Lembrete da noite'
          );
        } else {
          Alert.alert('Erro', 'Não foi possível ativar as notificações. Verifique as permissões do app.');
        }
      }
    } catch (error) {
      console.log('Error toggling notifications:', error);
      Alert.alert('Erro', 'Não foi possível alterar as configurações de notificação.');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const NotificationService = await import('../services/NotificationService');
      await NotificationService.default.sendImmediateNotification(
        '🎉 Notificação de Teste!',
        'Suas notificações estão funcionando perfeitamente! Este é um exemplo de como você receberá seus lembretes diários.'
      );
      Alert.alert('Enviado!', 'Notificação de teste enviada. Verifique na barra de notificações do seu dispositivo.');
    } catch (error) {
      console.log('Error sending test notification:', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação de teste.');
    }
  };

  const loadUserStats = async () => {
    setLoading(true);
    try {
      const token = await import('@react-native-async-storage/async-storage')
        .then(module => module.default.getItem('@token'));
      
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserStats(response.data);
    } catch (error) {
      console.log('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelTitle = (level: number) => {
    if (level <= 5) return 'Iniciante';
    if (level <= 10) return 'Aprendiz';
    if (level <= 20) return 'Praticante';
    if (level <= 35) return 'Experiente';
    if (level <= 50) return 'Veterano';
    return 'Mestre';
  };

  const getLevelColor = (level: number) => {
    if (level <= 5) return '#10B981';
    if (level <= 10) return '#3B82F6';
    if (level <= 20) return '#8B5CF6';
    if (level <= 35) return '#F59E0B';
    if (level <= 50) return '#EF4444';
    return '#7C3AED';
  };

  const getProgressPercentage = () => {
    if (!userStats) return 0;
    const currentLevelXP = (userStats.current_level - 1) * 100;
    const xpInCurrentLevel = userStats.total_xp - currentLevelXP;
    return Math.min((xpInCurrentLevel / 100) * 100, 100);
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão Necessária', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      Alert.alert(
        'Selecionar Foto',
        'Como você gostaria de adicionar uma foto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Galeria', onPress: () => openImagePicker('gallery') },
          { text: 'Câmera', onPress: () => openImagePicker('camera') },
        ]
      );
    } catch (error) {
      console.log('Error requesting permission:', error);
      Alert.alert('Erro', 'Não foi possível abrir o seletor de imagens.');
    }
  };

  const openImagePicker = async (type: 'gallery' | 'camera') => {
    setUploadingPhoto(true);
    
    try {
      let result;
      
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Necessária', 'Precisamos de permissão para usar a câmera.');
          setUploadingPhoto(false);
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        await uploadProfilePhoto(result.assets[0].base64, result.assets[0].mimeType);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadProfilePhoto = async (base64: string, mimeType?: string) => {
    try {
      const token = await import('@react-native-async-storage/async-storage')
        .then(module => module.default.getItem('@token'));
      
      if (!token) {
        Alert.alert('Erro', 'Você precisa estar logado para atualizar a foto.');
        return;
      }

      const imageType = mimeType || 'image/jpeg';
      const base64Image = `data:${imageType};base64,${base64}`;

      const response = await axios.put(
        `${API_BASE_URL}/api/profile/photo`,
        { profile_photo: base64Image },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update user in auth context
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('@user', JSON.stringify(response.data));

      Alert.alert('Sucesso!', 'Foto de perfil atualizada com sucesso!');
      
      // Refresh the screen to show new photo
      loadUserStats();
      
    } catch (error: any) {
      console.log('Error uploading photo:', error);
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          const errorMessage = error.response.data.detail[0]?.msg || 'Erro ao atualizar foto';
          Alert.alert('Erro', errorMessage);
        } else {
          Alert.alert('Erro', error.response.data.detail);
        }
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar a foto. Tente novamente.');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={uploadingPhoto}
          >
            <View style={styles.avatar}>
              {user?.profile_photo ? (
                <Image 
                  source={{ uri: user.profile_photo }} 
                  style={styles.profileImage}
                />
              ) : (
                <Ionicons name="person" size={40} color="#FFFFFF" />
              )}
              
              {/* Upload overlay */}
              <View style={styles.photoOverlay}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </View>
            {userStats && (
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(userStats.current_level) }]}>
                <Text style={styles.levelBadgeText}>{userStats.current_level}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {userStats && (
              <Text style={[styles.userLevel, { color: getLevelColor(userStats.current_level) }]}>
                {getLevelTitle(userStats.current_level)} • Nível {userStats.current_level}
              </Text>
            )}
            {user?.created_at && (
              <Text style={styles.joinDate}>
                Membro desde {formatJoinDate(user.created_at)}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        {userStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Suas Estatísticas</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="flame" size={24} color="#EF4444" />
                </View>
                <Text style={styles.statNumber}>{userStats.total_xp}</Text>
                <Text style={styles.statLabel}>XP Total</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="trophy" size={24} color={getLevelColor(userStats.current_level)} />
                </View>
                <Text style={styles.statNumber}>{userStats.current_level}</Text>
                <Text style={styles.statLabel}>Nível Atual</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="star" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statNumber}>{100 - (userStats.total_xp % 100)}</Text>
                <Text style={styles.statLabel}>XP para próximo</Text>
              </View>
            </View>

            {/* Level Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso do Nível</Text>
                <Text style={styles.progressNumbers}>
                  {userStats.total_xp % 100}/100 XP
                </Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar,
                    { 
                      width: `${getProgressPercentage()}%`,
                      backgroundColor: getLevelColor(userStats.current_level)
                    }
                  ]} 
                />
              </View>
              
              <Text style={styles.nextLevelText}>
                Próximo nível: {(userStats.current_level + 1) * 100} XP
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/missions')}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionIcon}>
                <Ionicons name="checkbox-outline" size={24} color="#4F46E5" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Ver Missões</Text>
                <Text style={styles.actionSubtitle}>Complete suas tarefas diárias</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/progress')}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionIcon}>
                <Ionicons name="analytics" size={24} color="#3B82F6" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Meu Progresso</Text>
                <Text style={styles.actionSubtitle}>Veja seu desenvolvimento</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/emotional-progress')}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionIcon}>
                <Ionicons name="trending-up" size={24} color="#EF4444" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Progresso de Humor</Text>
                <Text style={styles.actionSubtitle}>Histórico do seu humor</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Configurações da Conta</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <Ionicons name="person-circle" size={24} color="#64748B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Informações Pessoais</Text>
                <Text style={styles.settingSubtitle}>Nome e email da conta</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={toggleNotifications}
            disabled={loadingNotifications}
          >
            <View style={styles.settingItemContent}>
              <Ionicons 
                name={notificationsEnabled ? "notifications" : "notifications-off"} 
                size={24} 
                color={notificationsEnabled ? "#4F46E5" : "#64748B"} 
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>
                  Lembretes Diários
                  {notificationsEnabled && " 🔔"}
                </Text>
                <Text style={styles.settingSubtitle}>
                  {notificationsEnabled 
                    ? "Notificações ativadas (10h, 18h, 20h)" 
                    : "Receba lembretes para cuidar do bem-estar"
                  }
                </Text>
              </View>
              {loadingNotifications ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <View style={[
                  styles.toggle,
                  notificationsEnabled && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    notificationsEnabled && styles.toggleThumbActive
                  ]} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {notificationsEnabled && (
            <TouchableOpacity 
              style={styles.testButton}
              onPress={sendTestNotification}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="send" size={24} color="#4F46E5" />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Testar Notificação</Text>
                  <Text style={styles.settingSubtitle}>Envie uma notificação de teste agora</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <Ionicons name="shield-checkmark" size={24} color="#64748B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Privacidade</Text>
                <Text style={styles.settingSubtitle}>Controle seus dados</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.7 }
          ]}
          onPress={async () => {
            console.log('Logout button pressed - executing logout...');
            try {
              // For web: direct logout without Alert (Alert doesn't work in React Native Web)
              if (Platform.OS === 'web') {
                await signOut();
                router.replace('/welcome');
                console.log('Web logout completed');
              } else {
                // For mobile: use Alert
                Alert.alert(
                  'Sair',
                  'Deseja sair da conta?',
                  [
                    { text: 'Não', style: 'cancel' },
                    { 
                      text: 'Sim', 
                      onPress: async () => {
                        try {
                          console.log('Mobile logout confirmed');
                          await signOut();
                          router.replace('/welcome');
                        } catch (error) {
                          console.log('Mobile logout error:', error);
                        }
                      }
                    }
                  ]
                );
              }
            } catch (error) {
              console.log('Logout error:', error);
            }
          }}
          pointerEvents="auto"
        >
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </Pressable>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>App de Saúde Mental v1.0</Text>
          <Text style={styles.appInfoSubtext}>Cuidando do seu bem-estar</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
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
    padding: 24,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
  },
  userLevel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressNumbers: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  nextLevelText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  settingsContainer: {
    marginBottom: 32,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingTextContainer: {
    marginLeft: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appInfoText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4F46E5',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  testButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
});
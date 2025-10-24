import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SubscriptionGuard from '../components/SubscriptionGuard';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to get auth token from storage
const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('@token');
    } else {
      return await AsyncStorage.getItem('@token');
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

interface Mission {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  completed: boolean;
  icon: string;
}

interface UserStats {
  total_xp: number;
  current_level: number;
}

// For web, always use relative URLs that proxy through Expo
const API_BASE_URL = Platform.OS === 'web' ? '' : 'http://localhost:8001';
console.log('🌐 Missions API Base URL:', API_BASE_URL);

// Create axios instance with corrected URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default function MissionsScreen() {
  const { user, api } = useAuth();
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingMission, setCompletingMission] = useState<string | null>(null);

  useEffect(() => {
    loadMissionsAndStats();
  }, []);

  const loadMissionsAndStats = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Debug missions - user:', user, 'api:', api);
      
      if (!api) {
        console.error('❌ API instance not available from AuthContext');
        // Instead of showing error, let's try to create a local api instance
        
        // Get token from storage
        const token = await (Platform.OS === 'web' 
          ? localStorage.getItem('@token') 
          : AsyncStorage.getItem('@token')
        );
        
        if (!token) {
          Alert.alert('Erro', 'Token de autenticação não encontrado');
          return;
        }
        
        // Create local api instance as fallback
        const localApi = axios.create({
          baseURL: API_BASE_URL,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ Using local api instance as fallback');
        
        // Load missions and user stats in parallel using local api
        const [missionsResponse, statsResponse] = await Promise.all([
          localApi.get('/api/missions/today'),
          localApi.get('/api/user/stats')
        ]);
        
        setMissions(missionsResponse.data.missions || []);
        setUserStats(statsResponse.data);
        
        return;
      }
      
      console.log('✅ Using AuthContext api instance');
      
      // Load missions and user stats in parallel
      const [missionsResponse, statsResponse] = await Promise.all([
        api.get('/api/missions/today'),
        api.get('/api/user/stats')
      ]);
      
      setMissions(missionsResponse.data.missions || []);
      setUserStats(statsResponse.data);
      
    } catch (error: any) {
      console.error('Error loading missions:', error);
      Alert.alert('Erro', 'Falha ao carregar missões');
    } finally {
      setLoading(false);
    }
  };

  const completeMission = async (missionId: string) => {
    try {
      setCompletingMission(missionId);
      
      let apiInstance = api;
      
      // Fallback to local api if AuthContext api is not available
      if (!api) {
        console.log('⚠️ Using fallback api for mission completion');
        const token = await (Platform.OS === 'web' 
          ? localStorage.getItem('@token') 
          : AsyncStorage.getItem('@token')
        );
        
        if (!token) {
          throw new Error('Token de autenticação não encontrado');
        }
        
        apiInstance = axios.create({
          baseURL: API_BASE_URL,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      const response = await apiInstance.post('/api/missions/complete', {
        mission_id: missionId
      });

      // Update mission as completed
      setMissions(prev => prev.map(mission => 
        mission.id === missionId 
          ? { ...mission, completed: true }
          : mission
      ));

      // Update user stats
      if (userStats) {
        setUserStats({
          total_xp: response.data.total_xp,
          current_level: response.data.current_level
        });
      }

      Alert.alert('Parabéns! 🎉', `Você ganhou ${response.data.xp_gained} ⭐ Estrelas!`);
      
    } catch (error: any) {
      console.error('Error completing mission:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Falha ao completar missão');
    } finally {
      setCompletingMission(null);
    }
  };

  return (
    <SubscriptionGuard fallbackMessage="Precisa de assinatura para acessar missões diárias.">
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
            <Text style={styles.headerTitle}>Missões Diárias</Text>
          </View>

          {/* User Stats */}
          {userStats && (
            <View style={styles.statsCard}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.statsGradient}
              >
                <View style={styles.statsContent}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Nível</Text>
                    <Text style={styles.statValue}>{userStats.current_level}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>⭐ Total</Text>
                    <Text style={styles.statValue}>{userStats.total_xp}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Carregando missões...</Text>
            </View>
          ) : (
            /* Missions List */
            <View style={styles.missionsContainer}>
              <Text style={styles.sectionTitle}>Suas Missões de Hoje</Text>
              <Text style={styles.sectionSubtitle}>
                Complete para ganhar ⭐ Estrelas e subir de nível
              </Text>

              {missions.length > 0 ? (
                missions.map((mission) => (
                  <View key={mission.id} style={styles.missionCard}>
                    <View style={styles.missionHeader}>
                      <View style={styles.missionIcon}>
                        <Ionicons name={mission.icon as any} size={24} color="#4F46E5" />
                      </View>
                      <View style={styles.missionInfo}>
                        <Text style={styles.missionTitle}>{mission.title}</Text>
                        <Text style={styles.missionDescription}>{mission.description}</Text>
                      </View>
                      <View style={styles.xpBadge}>
                        <Text style={styles.xpText}>⭐ +{mission.xp_reward}</Text>
                      </View>
                    </View>

                    {mission.completed ? (
                      <View style={styles.completedButton}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.completedButtonText}>Completa</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.completeButton,
                          completingMission === mission.id && styles.completeButtonDisabled
                        ]}
                        onPress={() => completeMission(mission.id)}
                        disabled={completingMission !== null}
                      >
                        {completingMission === mission.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.completeButtonText}>Completar</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="trophy-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyStateTitle}>Nenhuma missão disponível</Text>
                  <Text style={styles.emptyStateText}>
                    Volte amanhã para novas missões!
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SubscriptionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  missionsContainer: {
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
  missionCard: {
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
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  missionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  missionEmoji: {
    fontSize: 24,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  missionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  xpBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  completeButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 14,
  },
  completedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
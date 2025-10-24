import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface UserStats {
  total_xp: number;
  current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
  level_name: string;
  level_emoji: string;
  level_description: string;
  level_tier: string;
}

// For web, always use relative URLs that proxy through Expo
const API_BASE_URL = Platform.OS === 'web' ? '' : 'http://localhost:8001';
console.log('🌐 Progress API Base URL:', API_BASE_URL);

export default function ProgressScreen() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressAnimation] = useState(new Animated.Value(0));
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadUserStats();
  }, []);

  useEffect(() => {
    if (userStats) {
      animateProgress();
    }
  }, [userStats]);

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

  const animateProgress = () => {
    if (!userStats) return;
    
    const progressPercentage = getProgressPercentage();
    
    Animated.timing(progressAnimation, {
      toValue: progressPercentage / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const getProgressPercentage = () => {
    if (!userStats) return 0;
    const currentLevelXP = (userStats.current_level - 1) * 100;
    const xpInCurrentLevel = userStats.total_xp - currentLevelXP;
    return Math.min((xpInCurrentLevel / 100) * 100, 100);
  };

  const getXPForNextLevel = () => {
    if (!userStats) return 0;
    return userStats.current_level * 100;
  };

  const getXPInCurrentLevel = () => {
    if (!userStats) return 0;
    const currentLevelXP = (userStats.current_level - 1) * 100;
    return userStats.total_xp - currentLevelXP;
  };

  const navigateToMissions = () => {
    router.push('/missions');
  };

  const getLevelColor = (tier: string) => {
    switch (tier) {
      case 'iniciante': return '#10B981';      // Verde - Semeador
      case 'crescimento': return '#22C55E';    // Verde claro - Cultivador
      case 'florescimento': return '#EC4899';  // Rosa - Florescente
      case 'estabilidade': return '#8B5CF6';   // Roxo - Enraizado
      case 'transformação': return '#F59E0B';  // Laranja - Transformado
      case 'maestria': return '#EAB308';       // Amarelo - Iluminado
      case 'lendário': return '#7C3AED';       // Roxo escuro - Guardião
      default: return '#4F46E5';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Carregando progresso...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userStats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Erro ao carregar progresso</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserStats}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Seu Progresso</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.welcomeInfo}>
              <Text style={styles.welcomeName}>Olá, {user?.name}!</Text>
              <Text style={styles.welcomeSubtitle}>Continue sua jornada de autocuidado</Text>
            </View>
          </View>
        </View>

        {/* Level Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(userStats.level_tier) + '20' }]}>
              <Text style={styles.levelEmoji}>{userStats.level_emoji}</Text>
              <Text style={[styles.levelNumber, { color: getLevelColor(userStats.level_tier) }]}>
                Nível {userStats.current_level}
              </Text>
            </View>
            <View style={styles.levelTitleContainer}>
              <Text style={styles.levelTitle}>{userStats.level_name}</Text>
              <Text style={styles.levelDescription}>{userStats.level_description}</Text>
            </View>
          </View>
          
          <View style={styles.xpContainer}>
            <Text style={styles.totalXPText}>{userStats.total_xp} XP Total</Text>
            
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progresso para o próximo nível</Text>
                <Text style={styles.progressNumbers}>
                  {getXPInCurrentLevel()}/100 ⭐ Estrelas
                </Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <Animated.View 
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: getLevelColor(userStats.current_level),
                    }
                  ]} 
                />
              </View>
              
              <Text style={styles.nextLevelText}>
                Próximo nível: {getXPForNextLevel()} ⭐ Estrelas
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="flame" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statNumber}>{userStats.total_xp}</Text>
            <Text style={styles.statLabel}>⭐ Total</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{userStats.current_level}</Text>
            <Text style={styles.statLabel}>Nível Atual</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="star" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{100 - getXPInCurrentLevel()}</Text>
            <Text style={styles.statLabel}>⭐ Faltam</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.missionButton}
          onPress={navigateToMissions}
        >
          <View style={styles.missionButtonContent}>
            <View style={styles.missionIconContainer}>
              <Ionicons name="checkbox-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.missionButtonText}>
              <Text style={styles.missionButtonTitle}>Ver Missões do Dia</Text>
              <Text style={styles.missionButtonSubtitle}>Complete missões e ganhe XP</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Level Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#4F46E5" />
            <Text style={styles.infoTitle}>Como funciona</Text>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <Text style={styles.infoText}>• Complete missões diárias para ganhar 10 XP cada</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoText}>• A cada 100 XP você sobe um nível</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoText}>• Registre seu humor para manter a constância</Text>
            </View>
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  levelCard: {
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
  levelHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  levelEmoji: {
    fontSize: 24,
  },
  levelNumber: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelTitleContainer: {
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  xpContainer: {
    alignItems: 'center',
  },
  totalXPText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  progressSection: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  progressNumbers: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  nextLevelText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  missionButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  missionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  missionButtonText: {
    flex: 1,
  },
  missionButtonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  missionButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoContent: {
    gap: 8,
  },
  infoItem: {
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
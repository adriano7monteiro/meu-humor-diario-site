import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

type Technique = '4-7-8' | 'box' | 'deep';

interface TechniqueInfo {
  name: string;
  description: string;
  icon: any;
  color: string;
  gradient: string[];
  steps: string[];
  duration: number;
}

const techniques: Record<Technique, TechniqueInfo> = {
  '4-7-8': {
    name: '4-7-8 (Ansiedade)',
    description: 'Ótimo para reduzir ansiedade e adormecer',
    icon: 'moon',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#6366F1'],
    steps: ['Inspire por 4 segundos', 'Segure por 7 segundos', 'Expire por 8 segundos'],
    duration: 19
  },
  'box': {
    name: 'Box Breathing (Foco)',
    description: 'Usado por atletas e militares para foco',
    icon: 'cube',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
    steps: ['Inspire por 4 segundos', 'Segure por 4 segundos', 'Expire por 4 segundos', 'Segure por 4 segundos'],
    duration: 16
  },
  'deep': {
    name: 'Respiração Profunda (Relaxar)',
    description: 'Simples e eficaz para relaxamento geral',
    icon: 'leaf',
    color: '#22C55E',
    gradient: ['#22C55E', '#16A34A'],
    steps: ['Inspire devagar por 5 segundos', 'Expire devagar por 5 segundos'],
    duration: 10
  }
};

export default function BreathingScreen() {
  const { api } = useAuth();
  const router = useRouter();
  
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [isExercising, setIsExercising] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [scale] = useState(new Animated.Value(1));

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (isExercising && selectedTechnique) {
      const technique = techniques[selectedTechnique];
      const stepDuration = technique.duration / technique.steps.length;
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCurrentStep(prevStep => {
              const nextStep = (prevStep + 1) % technique.steps.length;
              if (nextStep === 0) {
                setCompletedRounds(prev => prev + 1);
              }
              return nextStep;
            });
            return Math.floor(stepDuration);
          }
          return prev - 1;
        });
      }, 1000);

      // Breathing animation
      const breatheIn = currentStep === 0 || currentStep === 1;
      Animated.timing(scale, {
        toValue: breatheIn ? 1.3 : 0.8,
        duration: (stepDuration * 1000) / 2,
        useNativeDriver: true,
      }).start();

      return () => clearInterval(interval);
    }
  }, [isExercising, currentStep, selectedTechnique]);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/breathing/stats');
      setStats(response.data);
    } catch (error) {
      console.log('Error loading stats');
    }
  };

  const startExercise = (technique: Technique) => {
    setSelectedTechnique(technique);
    setIsExercising(true);
    setCurrentStep(0);
    setCompletedRounds(0);
    const stepDuration = techniques[technique].duration / techniques[technique].steps.length;
    setCountdown(Math.floor(stepDuration));
  };

  const stopExercise = async () => {
    if (!selectedTechnique || completedRounds === 0) {
      setIsExercising(false);
      setSelectedTechnique(null);
      return;
    }

    try {
      const totalDuration = completedRounds * techniques[selectedTechnique].duration;
      const response = await api.post('/api/breathing/session', {
        technique: selectedTechnique,
        duration_seconds: totalDuration,
        completed: true
      });

      Alert.alert(
        'Parabéns! 🌟',
        `Você completou ${completedRounds} ciclo${completedRounds > 1 ? 's' : ''} e ganhou ${response.data.stars_earned} estrelas!`,
        [{ text: 'OK', onPress: () => {
          setIsExercising(false);
          setSelectedTechnique(null);
          loadStats();
        }}]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar sessão');
    }
  };

  if (isExercising && selectedTechnique) {
    const technique = techniques[selectedTechnique];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: technique.color }]}>
        <LinearGradient
          colors={technique.gradient}
          style={styles.exerciseContainer}
        >
          <TouchableOpacity style={styles.closeButton} onPress={stopExercise}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.exerciseContent}>
            <Text style={styles.techniqueName}>{technique.name}</Text>
            
            <View style={styles.roundsCounter}>
              <Text style={styles.roundsText}>{completedRounds} ciclo{completedRounds !== 1 ? 's' : ''}</Text>
            </View>

            <Animated.View style={[styles.breathingCircle, { transform: [{ scale }] }]}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </Animated.View>

            <Text style={styles.instructionText}>
              {technique.steps[currentStep]}
            </Text>

            <View style={styles.stepsIndicator}>
              {technique.steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    currentStep === index && styles.stepDotActive
                  ]}
                />
              ))}
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercícios de Respiração</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Stats Card */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Suas Estatísticas</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total_sessions}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.week_sessions}</Text>
                <Text style={styles.statLabel}>Esta semana</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total_stars_earned}</Text>
                <Text style={styles.statLabel}>⭐ Ganhas</Text>
              </View>
            </View>
            {stats.favorite_technique && (
              <Text style={styles.favoriteText}>
                Favorita: {techniques[stats.favorite_technique as Technique].name}
              </Text>
            )}
          </View>
        )}

        {/* Techniques */}
        <Text style={styles.sectionTitle}>Escolha uma Técnica</Text>
        
        {(Object.keys(techniques) as Technique[]).map((key) => {
          const technique = techniques[key];
          return (
            <TouchableOpacity
              key={key}
              style={styles.techniqueCard}
              onPress={() => startExercise(key)}
            >
              <LinearGradient
                colors={technique.gradient}
                style={styles.techniqueGradient}
              >
                <View style={styles.techniqueIcon}>
                  <Ionicons name={technique.icon} size={32} color="#FFFFFF" />
                </View>
                <View style={styles.techniqueInfo}>
                  <Text style={styles.techniqueTitle}>{technique.name}</Text>
                  <Text style={styles.techniqueDescription}>{technique.description}</Text>
                  <View style={styles.techniqueSteps}>
                    {technique.steps.map((step, index) => (
                      <Text key={index} style={styles.stepText}>
                        {index + 1}. {step}
                      </Text>
                    ))}
                  </View>
                </View>
                <Ionicons name="play-circle" size={48} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          );
        })}

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Ionicons name="heart" size={24} color="#EF4444" />
          <Text style={styles.benefitsTitle}>Benefícios</Text>
          <Text style={styles.benefitsText}>• Reduz ansiedade e estresse</Text>
          <Text style={styles.benefitsText}>• Melhora foco e concentração</Text>
          <Text style={styles.benefitsText}>• Ajuda a dormir melhor</Text>
          <Text style={styles.benefitsText}>• Reduz pressão arterial</Text>
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
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  favoriteText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  techniqueCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  techniqueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  techniqueIcon: {
    marginRight: 16,
  },
  techniqueInfo: {
    flex: 1,
  },
  techniqueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  techniqueDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
  },
  techniqueSteps: {
    gap: 4,
  },
  stepText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  benefitsCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#991B1B',
    marginTop: 8,
    marginBottom: 12,
  },
  benefitsText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 8,
  },
  // Exercise screen styles
  exerciseContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseContent: {
    alignItems: 'center',
  },
  techniqueName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  roundsCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 40,
  },
  roundsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
  },
  stepsIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepDotActive: {
    backgroundColor: '#FFFFFF',
  },
});
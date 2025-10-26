import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Text as SvgText, Line } from 'react-native-svg';

interface MoodEntry {
  id: string;
  mood_level: number;
  mood_emoji: string;
  description?: string;
  date: string;
}

const { width } = Dimensions.get('window');

export default function EmotionalProgressScreen() {
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user, api } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadMoodHistory();
  }, []);

  const loadMoodHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/mood/week');
      setMoodHistory(response.data);
    } catch (error) {
      console.log('Error loading mood history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const getMoodLabel = (level: number) => {
    const labels = {
      1: 'Muito Triste',
      2: 'Triste',
      3: 'Neutro',
      4: 'Feliz',
      5: 'Muito Feliz'
    };
    return labels[level as keyof typeof labels] || 'Desconhecido';
  };

  const getMoodColor = (level: number) => {
    const colors = {
      1: '#EF4444',
      2: '#F97316',
      3: '#EAB308',
      4: '#22C55E',
      5: '#16A34A'
    };
    return colors[level as keyof typeof colors] || '#9CA3AF';
  };

  const SimpleChart = ({ data }: { data: MoodEntry[] }) => {
    if (data.length === 0) return null;

    const chartWidth = width - 96;
    const chartHeight = 160;
    const padding = 40;
    const plotWidth = chartWidth - padding * 2;
    const plotHeight = chartHeight - padding * 2;

    // Create points for the line
    const points = data.map((mood, index) => {
      const x = padding + (index / (data.length - 1)) * plotWidth;
      const y = padding + (5 - mood.mood_level) * (plotHeight / 4); // Invert Y axis
      return { x, y, mood };
    });

    // Create path string for the line
    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${path} ${command} ${point.x} ${point.y}`;
    }, '');

    return (
      <View style={styles.chartSvgContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((level) => {
            const y = padding + (5 - level) * (plotHeight / 4);
            return (
              <Line
                key={level}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Y-axis labels */}
          {[1, 2, 3, 4, 5].map((level) => {
            const y = padding + (5 - level) * (plotHeight / 4);
            const emoji = ['', '😢', '😞', '😐', '😊', '😄'][level];
            return (
              <SvgText
                key={level}
                x={padding - 25}
                y={y + 5}
                fontSize="12"
                fill="#64748B"
                textAnchor="middle"
              >
                {emoji}
              </SvgText>
            );
          })}

          {/* Line chart */}
          <Path
            d={pathData}
            stroke="#4F46E5"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#4F46E5"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}
        </Svg>
      </View>
    );
  };

  const getChartData = () => {
    return moodHistory.map(entry => ({
      ...entry,
      formattedDate: formatDate(entry.date)
    }));
  };

  const getAverageMood = () => {
    if (moodHistory.length === 0) return '0';
    const sum = moodHistory.reduce((acc, entry) => acc + entry.mood_level, 0);
    return (sum / moodHistory.length).toFixed(1);
  };

  const getMoodTrend = () => {
    if (moodHistory.length < 2) return 'stable';
    const recent = moodHistory.slice(0, 3);
    const older = moodHistory.slice(-3);
    
    const recentAvg = recent.reduce((acc, entry) => acc + entry.mood_level, 0) / recent.length;
    const olderAvg = older.reduce((acc, entry) => acc + entry.mood_level, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.5) return 'improving';
    if (recentAvg < olderAvg - 0.5) return 'declining';
    return 'stable';
  };

  const renderChart = (data: MoodEntry[]) => {
    if (data.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="analytics-outline" size={48} color="#9CA3AF" />
          <Text style={styles.noDataText}>Nenhum dado de humor registrado</Text>
          <Text style={styles.noDataSubtext}>
            Comece registrando seu humor diário para ver seu progresso aqui.
          </Text>
        </View>
      );
    }

    return <SimpleChart data={data} />;
  };

  const getTrend = () => {
    if (moodHistory.length < 2) return 'stable';
    
    const first = moodHistory[0].mood_level;
    const last = moodHistory[moodHistory.length - 1].mood_level;
    
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'stable';
  };

  const getTrendIcon = () => {
    const trend = getTrend();
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = () => {
    const trend = getTrend();
    switch (trend) {
      case 'up': return '#22C55E';
      case 'down': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getTrendText = () => {
    const trend = getTrend();
    switch (trend) {
      case 'up': return 'Melhorando';
      case 'down': return 'Precisando atenção';
      default: return 'Estável';
    }
  };

  const generateLast7Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    
    return days;
  };

  const getMoodForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return moodHistory.find(mood => 
      new Date(mood.date).toISOString().split('T')[0] === dateStr
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Carregando histórico...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chartData = getChartData();

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
        <Text style={styles.headerTitle}>Progresso de Humor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="happy" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.summaryNumber}>{getAverageMood()}</Text>
            <Text style={styles.summaryLabel}>Humor Médio</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name={getTrendIcon()} size={24} color={getTrendColor()} />
            </View>
            <Text style={[styles.summaryText, { color: getTrendColor() }]}>
              {getTrendText()}
            </Text>
            <Text style={styles.summaryLabel}>Tendência</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="calendar" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.summaryNumber}>{moodHistory.length}</Text>
            <Text style={styles.summaryLabel}>Registros</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Variação do Humor - Últimos 7 Dias</Text>
          {renderChart(chartData)}
        </View>

        {/* History List */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Histórico dos Últimos 7 Dias</Text>
          
          {generateLast7Days().map((date, index) => {
            const mood = getMoodForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <View key={index} style={[styles.historyItem, isToday && styles.todayItem]}>
                <View style={styles.historyDate}>
                  <Text style={[styles.historyDateText, isToday && styles.todayText]}>
                    {formatDate(date.toISOString())}
                  </Text>
                  <Text style={styles.historyDateFull}>
                    {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </Text>
                </View>
                
                {mood ? (
                  <View style={styles.historyMood}>
                    <Text style={styles.historyEmoji}>{mood.mood_emoji}</Text>
                    <View style={styles.historyMoodInfo}>
                      <Text style={styles.historyMoodLabel}>{getMoodLabel(mood.mood_level)}</Text>
                      {mood.description && (
                        <Text style={styles.historyMoodDescription} numberOfLines={1}>
                          {mood.description}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.moodLevelBadge, { backgroundColor: getMoodColor(mood.mood_level) }]}>
                      <Text style={styles.moodLevelText}>{mood.mood_level}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noMoodContainer}>
                    <Ionicons name="remove-circle" size={20} color="#9CA3AF" />
                    <Text style={styles.noMoodText}>Sem registro</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={24} color="#F59E0B" />
            <Text style={styles.tipsTitle}>Dicas para melhorar seu humor</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• Registre seu humor diariamente</Text>
            <Text style={styles.tipItem}>• Complete suas missões de autocuidado</Text>
            <Text style={styles.tipItem}>• Pratique respiração profunda</Text>
            <Text style={styles.tipItem}>• Anote 3 coisas boas do seu dia</Text>
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
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
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
  summaryIcon: {
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  chartContainer: {
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chartSvgContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  historyContainer: {
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
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  todayItem: {
    backgroundColor: '#EEF2FF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  historyDate: {
    width: 80,
    marginRight: 16,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  todayText: {
    color: '#4F46E5',
  },
  historyDateFull: {
    fontSize: 12,
    color: '#64748B',
  },
  historyMood: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  historyMoodInfo: {
    flex: 1,
  },
  historyMoodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  historyMoodDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  moodLevelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodLevelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noMoodContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMoodText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface UserEbook {
  id: string;
  title: string;
  category: string;
  purchaseDate: string;
  readingProgress: number;
  downloaded: boolean;
}

const userEbooks: UserEbook[] = [
  {
    id: '1',
    title: 'Mindfulness e Bem-Estar Mental',
    category: 'Saúde Mental',
    purchaseDate: '2024-01-15',
    readingProgress: 65,
    downloaded: true,
  },
  {
    id: '2',
    title: 'Técnicas de Respiração para Ansiedade',
    category: 'Ansiedade',
    purchaseDate: '2024-01-20',
    readingProgress: 30,
    downloaded: false,
  }
];

export default function LibraryScreen() {
  const router = useRouter();

  const handleDownload = (ebook: UserEbook) => {
    Alert.alert(
      'Download Iniciado',
      `"${ebook.title}" está sendo baixado para leitura offline.`,
      [{ text: 'OK' }]
    );
  };

  const handleRead = (ebook: UserEbook) => {
    Alert.alert(
      'Abrir Ebook',
      `Abrindo "${ebook.title}" para leitura...`,
      [{ text: 'OK' }]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Saúde Mental': '#4F46E5',
      'Ansiedade': '#22C55E',
      'Desenvolvimento Pessoal': '#F59E0B',
      'Vida Profissional': '#EF4444'
    };
    return colors[category] || '#64748B';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Biblioteca</Text>
        <TouchableOpacity onPress={() => router.push('/store')}>
          <Ionicons name="storefront" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {userEbooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Sua biblioteca está vazia</Text>
            <Text style={styles.emptyText}>
              Visite nossa loja para encontrar ebooks incríveis sobre saúde mental e bem-estar.
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/store')}
            >
              <Text style={styles.shopButtonText}>Ir para a Loja</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.libraryContent}>
            <Text style={styles.sectionTitle}>
              Seus Ebooks ({userEbooks.length})
            </Text>

            {userEbooks.map((ebook) => (
              <View key={ebook.id} style={styles.ebookCard}>
                <View style={styles.ebookHeader}>
                  <View style={styles.ebookInfo}>
                    <Text style={styles.ebookTitle}>{ebook.title}</Text>
                    <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(ebook.category) + '20' }]}>
                      <Text style={[styles.categoryText, { color: getCategoryColor(ebook.category) }]}>
                        {ebook.category}
                      </Text>
                    </View>
                    <Text style={styles.purchaseDate}>
                      Adquirido em {formatDate(ebook.purchaseDate)}
                    </Text>
                  </View>

                  <View style={styles.ebookStatus}>
                    {ebook.downloaded ? (
                      <View style={styles.statusBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                        <Text style={styles.statusText}>Baixado</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={() => handleDownload(ebook)}
                      >
                        <Ionicons name="cloud-download" size={20} color="#4F46E5" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Reading Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progresso de Leitura</Text>
                    <Text style={styles.progressPercent}>{ebook.readingProgress}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${ebook.readingProgress}%` }
                      ]}
                    />
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.ebookActions}>
                  <TouchableOpacity
                    style={styles.readButton}
                    onPress={() => handleRead(ebook)}
                  >
                    <Ionicons name="book" size={18} color="#FFFFFF" />
                    <Text style={styles.readButtonText}>
                      {ebook.readingProgress > 0 ? 'Continuar Lendo' : 'Começar a Ler'}
                    </Text>
                  </TouchableOpacity>

                  {!ebook.downloaded && (
                    <TouchableOpacity
                      style={styles.downloadActionButton}
                      onPress={() => handleDownload(ebook)}
                    >
                      <Ionicons name="cloud-download" size={18} color="#4F46E5" />
                      <Text style={styles.downloadActionText}>Baixar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
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
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  libraryContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
  },
  ebookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ebookInfo: {
    flex: 1,
    marginRight: 16,
  },
  ebookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ebookStatus: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  downloadButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  ebookActions: {
    flexDirection: 'row',
    gap: 12,
  },
  readButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    gap: 6,
  },
  readButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  downloadActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  downloadActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
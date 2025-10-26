import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export default function ChatScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hasProcessedMood, setHasProcessedMood] = useState(false);
  const [hasProcessedSOS, setHasProcessedSOS] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  // Process mood params and send initial message
  useEffect(() => {
    if (params.fromMood === 'true' && !hasProcessedMood && currentConversationId) {
      setHasProcessedMood(true);
      const moodEmoji = params.moodEmoji || '😢';
      const moodLabel = params.moodLabel || 'Muito Triste';
      const initialMessage = `Oi Dr. Ana, acabei de registrar meu humor como ${moodEmoji} ${moodLabel}. Estou me sentindo assim hoje...`;
      
      // Send the initial message automatically
      setTimeout(() => {
        sendAutomaticMessage(initialMessage);
      }, 500);
    }
  }, [params, hasProcessedMood, currentConversationId]);

  // Process SOS context and send initial message
  useEffect(() => {
    console.log('🔍 SOS useEffect triggered:', { 
      fromSOS: params.fromSOS, 
      hasProcessedSOS, 
      paramsKeys: Object.keys(params) 
    });
    
    if (params.fromSOS === 'true' && !hasProcessedSOS) {
      console.log('💙 Processing SOS context...');
      setHasProcessedSOS(true);
      const initialMessage = `Dr. Ana, estou passando por um momento muito difícil e preciso de apoio. Acessei o botão SOS porque estou me sentindo em crise. Pode me ajudar?`;
      
      // Send the initial message automatically, even without existing conversation
      setTimeout(() => {
        console.log('🚀 Sending SOS automatic message:', initialMessage);
        sendAutomaticMessage(initialMessage);
      }, 1500); // Wait a bit longer to ensure conversations are loaded
    }
  }, [params, hasProcessedSOS]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/chat/conversations');
      setConversations(response.data.conversations || []);
      
      // Load most recent conversation if exists
      if (response.data.conversations && response.data.conversations.length > 0) {
        loadConversation(response.data.conversations[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await api.get(`/api/chat/conversation/${conversationId}/messages`);
      setMessages(response.data.messages || []);
      setCurrentConversationId(conversationId);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || sendingMessage) return;

    const messageText = currentMessage.trim();
    setCurrentMessage('');
    setSendingMessage(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      conversation_id: currentConversationId || '',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await api.post('/api/chat/send', {
        message: messageText,
        conversation_id: currentConversationId
      });

      // Remove temp message and add real messages
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
      
      // Add both user and AI messages
      const userMsg: Message = {
        id: response.data.message_id + '-user',
        conversation_id: response.data.conversation_id,
        role: 'user',
        content: messageText,
        timestamp: response.data.timestamp
      };

      const aiMsg: Message = {
        id: response.data.message_id,
        conversation_id: response.data.conversation_id,
        role: 'assistant',
        content: response.data.message,
        timestamp: response.data.timestamp
      };

      setMessages(prev => [...prev, userMsg, aiMsg]);
      setCurrentConversationId(response.data.conversation_id);

      // Reload conversations to update list
      if (!currentConversationId) {
        loadConversations();
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
      Alert.alert('Erro', 'Falha ao enviar mensagem. Tente novamente.');
    } finally {
      setSendingMessage(false);
    }
  };

  const sendAutomaticMessage = async (messageText: string) => {
    if (!messageText.trim() || sendingMessage) return;

    setSendingMessage(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      conversation_id: currentConversationId || '',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMessage]);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await api.post('/api/chat/send', {
        message: messageText,
        conversation_id: currentConversationId
      });

      // Remove temp message and add both user and AI messages
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));

      const userMsg: Message = {
        id: response.data.message_id + '-user',
        conversation_id: response.data.conversation_id,
        role: 'user',
        content: messageText,
        timestamp: response.data.timestamp
      };

      const aiMsg: Message = {
        id: response.data.message_id,
        conversation_id: response.data.conversation_id,
        role: 'assistant',
        content: response.data.message,
        timestamp: response.data.timestamp
      };

      setMessages(prev => [...prev, userMsg, aiMsg]);
      setCurrentConversationId(response.data.conversation_id);

      // Reload conversations to update list
      if (!currentConversationId) {
        loadConversations();
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error('Error sending automatic message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setSendingMessage(false);
    }
  };

  const startNewConversation = () => {
    Alert.alert(
      'Nova Conversa',
      'Tem certeza que deseja iniciar uma nova conversa? A conversa atual não será perdida.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sim, nova conversa',
          onPress: () => {
            setMessages([]);
            setCurrentConversationId(null);
            setShowMenu(false);
          }
        }
      ]
    );
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <View 
        key={message.id} 
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.aiMessage
        ]}
      >
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText
          ]}>
            {message.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isUser ? styles.userTime : styles.aiTime
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat com Dr. Ana</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B73FF" />
          <Text style={styles.loadingText}>Carregando conversa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#6B73FF', '#000DFF']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Dr. Ana</Text>
          <Text style={styles.headerSubtitle}>Sua terapeuta virtual</Text>
        </View>
        <View style={styles.menuContainer}>
          <TouchableOpacity onPress={toggleMenu}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
          
          {showMenu && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={startNewConversation}
              >
                <Ionicons name="add-circle-outline" size={20} color="#333" />
                <Text style={styles.menuText}>Nova Conversa</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.therapistAvatar}>
                <Ionicons name="person" size={40} color="#6B73FF" />
              </View>
              <Text style={styles.welcomeTitle}>Olá! Sou a Dr. Ana 👋</Text>
              <Text style={styles.welcomeText}>
                Estou aqui para te ajudar com seu bem-estar emocional. 
                Fique à vontade para compartilhar como você está se sentindo hoje.
              </Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
          
          {sendingMessage && (
            <View style={styles.typingContainer}>
              <ActivityIndicator size="small" color="#6B73FF" />
              <Text style={styles.typingText}>Dr. Ana está digitando...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={currentMessage}
              onChangeText={setCurrentMessage}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!currentMessage.trim() || sendingMessage) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!currentMessage.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8EAFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  therapistAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8EAFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#6B73FF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  userTime: {
    color: '#E8EAFF',
    textAlign: 'right',
  },
  aiTime: {
    color: '#999',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6B73FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  menuContainer: {
    position: 'relative',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 35,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 160,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
});
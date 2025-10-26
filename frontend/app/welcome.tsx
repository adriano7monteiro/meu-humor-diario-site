import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const navigateToLogin = () => {
    router.push('/login');
  };

  const navigateToRegister = () => {
    router.push('/register');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header Section */}
          <View style={styles.header}>
            {/* Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <View style={[styles.floatingIcon, styles.floatingIcon1]}>
                <Ionicons name="heart" size={20} color="rgba(255,255,255,0.3)" />
              </View>
              <View style={[styles.floatingIcon, styles.floatingIcon2]}>
                <Ionicons name="leaf" size={16} color="rgba(255,255,255,0.25)" />
              </View>
              <View style={[styles.floatingIcon, styles.floatingIcon3]}>
                <Ionicons name="sunny" size={18} color="rgba(255,255,255,0.35)" />
              </View>
              <View style={[styles.floatingIcon, styles.floatingIcon4]}>
                <Ionicons name="flower" size={14} color="rgba(255,255,255,0.3)" />
              </View>
            </View>

            {/* Main Icon */}
            <View style={styles.mainIconContainer}>
              <View style={styles.mainIconCircle}>
                <Ionicons name="heart" size={48} color="#FFFFFF" />
              </View>
              <View style={styles.iconGlow} />
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>Bem-vindo ao seu</Text>
              <Text style={styles.welcomeSubtitle}>espaço emocional</Text>
              <View style={styles.underline} />
            </View>

            {/* Description text removed per user request */}
          </View>

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="happy" size={20} color="#4F46E5" />
                </View>
                <Text style={styles.featureText}>Registro de Humor</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.featureText}>Missões Diárias</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="analytics" size={20} color="#10B981" />
                </View>
                <Text style={styles.featureText}>Progresso Pessoal</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="notifications" size={20} color="#EF4444" />
                </View>
                <Text style={styles.featureText}>Lembretes Carinhosos</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={navigateToLogin}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="log-in" size={20} color="#4F46E5" />
                <Text style={styles.loginButtonText}>Entrar</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={navigateToRegister}
              activeOpacity={0.8}
            >
              <View style={styles.registerButtonContent}>
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
                <Text style={styles.registerButtonText}>Criar conta</Text>
              </View>
            </TouchableOpacity>

            {/* Privacy Text */}
            <Text style={styles.privacyText}>
              Seus dados são seguros e privados conosco 🔒
            </Text>
          </View>

          {/* Bottom Decoration */}
          <View style={styles.bottomDecoration}>
            <View style={styles.decorativeLine} />
            <View style={styles.decorativeDot} />
            <View style={styles.decorativeLine} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 32,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  floatingIcon: {
    position: 'absolute',
    borderRadius: 20,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  floatingIcon1: {
    top: 20,
    right: 40,
  },
  floatingIcon2: {
    top: 80,
    left: 30,
  },
  floatingIcon3: {
    top: 40,
    left: width * 0.4,
  },
  floatingIcon4: {
    top: 120,
    right: 80,
  },
  mainIconContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  mainIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  welcomeSubtitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: -5,
  },
  underline: {
    width: 80,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginTop: 12,
    opacity: 0.8,
  },
  welcomeDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    paddingVertical: 32,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionContainer: {
    paddingBottom: 32,
  },
  loginButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
  },
  registerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 24,
  },
  registerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privacyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  decorativeLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 12,
  },
});
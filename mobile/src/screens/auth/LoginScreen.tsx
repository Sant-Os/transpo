import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { AuthService } from '../../services/AuthService';
import AnimatedPressable from '../../components/AnimatedPressable';
import Toast from '../../components/Toast';

export interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('error');

  // Animaciones de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
      }),
    ]).start();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Ingrese sus credenciales', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await AuthService.login(username, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const roles = response.roles || [];
      if (roles.includes('ADMIN')) {
        navigation.replace('AdminDashboard');
      } else if (roles.includes('SECRETARY')) {
        navigation.replace('SecretaryPOS');
      } else if (roles.includes('DRIVER')) {
        navigation.replace('DriverDashboard');
      } else if (roles.includes('SOCIO')) {
        navigation.replace('SocioDashboard');
      } else {
        navigation.replace('SecretaryPOS');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(error.message || 'Credenciales incorrectas', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Logo circular con gradiente */}
          <LinearGradient
            colors={colors.gradientBlue as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Ionicons name="bus" size={40} color="#FFFFFF" />
          </LinearGradient>

          <Text style={styles.title}>Sindicato Trans</Text>
          <Text style={styles.subtitle}>Gestión Integral de Flota</Text>
        </Animated.View>

        <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Input Usuario */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Usuario"
              placeholderTextColor={colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Input Contraseña */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <AnimatedPressable onPress={() => setShowPassword(!showPassword)} haptic={false}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </AnimatedPressable>
          </View>

          {/* Botón Login */}
          <AnimatedPressable
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Ingresar</Text>
            )}
          </AnimatedPressable>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.footerText}>Sistema de Transporte Sindical v1.0</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    // Apple shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    ...typography.largeTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formContainer: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    height: '100%',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    // Apple shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
  },
  footerText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
});

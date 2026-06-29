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

export interface PropiedadesPantallaLogin {
  navigation: any;
}

export default function LoginScreen({ navigation }: PropiedadesPantallaLogin) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState<'success' | 'error' | 'info' | 'warning'>('error');

  // Animaciones de entrada
  const animacionDesvanecimiento = useRef(new Animated.Value(0)).current;
  const animacionDesplazamiento = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animacionDesvanecimiento, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(animacionDesplazamiento, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
      }),
    ]).start();
  }, []);

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  const manejarInicioSesion = async () => {
    if (!nombreUsuario || !contrasena) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      mostrarToast('Ingrese sus credenciales', 'warning');
      return;
    }

    setCargando(true);
    try {
      const respuesta = await AuthService.login(nombreUsuario, contrasena);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const roles = respuesta.roles || [];
      if (roles.includes('ADMINISTRADOR')) {
        navigation.replace('AdminDashboard');
      } else if (roles.includes('SECRETARIA')) {
        navigation.replace('SecretaryPOS');
      } else if (roles.includes('CHOFER')) {
        navigation.replace('DriverDashboard');
      } else if (roles.includes('SOCIO')) {
        navigation.replace('SocioDashboard');
      } else {
        navigation.replace('SecretaryPOS');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      mostrarToast(error.message || 'Credenciales incorrectas', 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.contenedor}>
      <Toast
        visible={toastVisible}
        message={toastMensaje}
        type={toastTipo}
        onDismiss={() => setToastVisible(false)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={estilos.contenido}
      >
        <Animated.View style={[estilos.contenedorCabecera, { opacity: animacionDesvanecimiento, transform: [{ translateY: animacionDesplazamiento }] }]}>
          {/* Logo circular con gradiente */}
          <LinearGradient
            colors={colors.gradientBlue as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={estilos.circuloLogo}
          >
            <Ionicons name="bus" size={40} color="#FFFFFF" />
          </LinearGradient>

          <Text style={estilos.titulo}>Sindicato Trans</Text>
          <Text style={estilos.subtitulo}>Gestión Integral de Flota</Text>
        </Animated.View>

        <Animated.View style={[estilos.contenedorFormulario, { opacity: animacionDesvanecimiento, transform: [{ translateY: animacionDesplazamiento }] }]}>
          {/* Input Usuario */}
          <View style={estilos.contenedorInput}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={estilos.input}
              placeholder="Usuario"
              placeholderTextColor={colors.textTertiary}
              value={nombreUsuario}
              onChangeText={setNombreUsuario}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Input Contraseña */}
          <View style={estilos.contenedorInput}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={estilos.input}
              placeholder="Contraseña"
              placeholderTextColor={colors.textTertiary}
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry={!mostrarContrasena}
              returnKeyType="done"
              onSubmitEditing={manejarInicioSesion}
            />
            <AnimatedPressable onPress={() => setMostrarContrasena(!mostrarContrasena)} haptic={false}>
              <Ionicons
                name={mostrarContrasena ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </AnimatedPressable>
          </View>

          {/* Botón Login */}
          <AnimatedPressable
            style={estilos.botonLogin}
            onPress={manejarInicioSesion}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={estilos.textoBotonLogin}>Ingresar</Text>
            )}
          </AnimatedPressable>
        </Animated.View>

        <Animated.View style={[estilos.piePagina, { opacity: animacionDesvanecimiento }]}>
          <Text style={estilos.textoPiePagina}>Sistema de Transporte Sindical v1.0</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  contenedorCabecera: {
    alignItems: 'center',
    marginBottom: 40,
  },
  circuloLogo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  titulo: {
    ...typography.largeTitle,
    color: colors.text,
  },
  subtitulo: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginTop: 4,
  },
  contenedorFormulario: {
    gap: 12,
  },
  contenedorInput: {
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
  botonLogin: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  textoBotonLogin: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  piePagina: {
    alignItems: 'center',
    marginTop: 48,
  },
  textoPiePagina: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
});

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
}

const toastConfig: Record<ToastType, { icon: any; bg: string; tint: string }> = {
  success: { icon: 'checkmark-circle-outline', bg: colors.tintSuccess, tint: colors.success },
  error: { icon: 'close-circle-outline', bg: colors.tintDanger, tint: colors.danger },
  info: { icon: 'information-circle-outline', bg: colors.tint, tint: colors.primary },
  warning: { icon: 'warning-outline', bg: colors.tintWarning, tint: colors.warning },
};

/**
 * Toast — Notificación tipo iOS banner
 * Se desliza desde la parte superior de la pantalla con animación spring.
 * Auto-dismiss después de `duration` ms.
 */
export default function Toast({ visible, message, type = 'info', duration = 3000, onDismiss }: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.bg,
          borderLeftColor: config.tint,
        },
      ]}
    >
      <Ionicons name={config.icon} size={22} color={config.tint} />
      <Text style={[styles.message, { color: colors.text }]} numberOfLines={3}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    gap: 12,
    zIndex: 9999,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    ...typography.subhead,
    flex: 1,
  },
});

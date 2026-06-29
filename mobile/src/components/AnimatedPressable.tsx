import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AnimatedPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  haptic?: boolean;
  scaleValue?: number;
}

/**
 * AnimatedPressable — Botón con animación de escala al estilo Apple
 * Al presionar, el componente se reduce suavemente (spring animation)
 * y opcionalmente emite feedback háptico.
 */
export default function AnimatedPressable({
  onPress,
  onLongPress,
  style,
  children,
  disabled = false,
  haptic = true,
  scaleValue = 0.97,
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? 0.4 : 1 }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

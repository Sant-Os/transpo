import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

/**
 * SegmentedControl — Control segmentado al estilo Apple iOS
 * Fondo gris con cápsula blanca que indica la selección activa.
 */
export default function SegmentedControl({ segments, selectedIndex, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {segments.map((label, index) => {
        const isSelected = index === selectedIndex;
        return (
          <AnimatedPressable
            key={index}
            style={[styles.segment, isSelected && styles.segmentActive]}
            onPress={() => onChange(index)}
            haptic={true}
            scaleValue={0.96}
          >
            <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
              {label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    ...typography.subhead,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
    fontFamily: typography.fontFamilySemiBold,
  },
});

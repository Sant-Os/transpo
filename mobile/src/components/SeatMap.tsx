import React, { useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import AnimatedPressable from './AnimatedPressable';

/**
 * Distribución de asientos en minibús estándar boliviano (18 asientos):
 * Fila 1: [Conductor] [1] [2]
 * Fila 2: [3] [4] [Pasillo] [5]
 * Fila 3: [6] [7] [Pasillo] [8]
 * Fila 4: [9] [10] [Pasillo] [11]
 * Fila 5: [12] [13] [Pasillo] [14]
 * Fila 6: [15] [16] [17] [18]
 */
const layout: (number | null)[][] = [
  [null, 1, 2],
  [3, 4, null, 5],
  [6, 7, null, 8],
  [9, 10, null, 11],
  [12, 13, null, 14],
  [15, 16, 17, 18]
];

export interface SeatMapProps {
  seatsData?: Record<number, 'free' | 'reserved' | 'occupied' | string>;
  onSeatPress?: (seatNumber: number, status: string) => void;
}

export default function SeatMap({ seatsData = {}, onSeatPress }: SeatMapProps) {

  const renderSeat = (seatNumber: number | null, index: string | number) => {
    if (!seatNumber) return <View style={styles.emptySpace} key={`empty-${index}`} />;

    const status = seatsData[seatNumber] || 'free';
    let bgColor = colors.seatFree;
    let textColor = '#FFFFFF';

    if (status === 'reserved') bgColor = colors.seatReserved;
    if (status === 'occupied') bgColor = colors.seatOccupied;

    return (
      <AnimatedPressable
        key={seatNumber}
        style={[styles.seat, { backgroundColor: bgColor }]}
        onPress={() => onSeatPress && onSeatPress(seatNumber, status)}
        haptic={true}
        scaleValue={0.90}
      >
        <View style={styles.seatBack} />
        <Text style={[styles.seatText, { color: textColor }]}>{seatNumber}</Text>
      </AnimatedPressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sección del conductor */}
      <View style={styles.driverSection}>
        <View style={styles.steeringWheel}>
          <Ionicons name="car-sport-outline" size={22} color={colors.textSecondary} />
        </View>
        <View style={styles.frontSeats}>
          {renderSeat(layout[0][1], 'front-1')}
          {renderSeat(layout[0][2], 'front-2')}
        </View>
      </View>

      {/* Separador pasillo */}
      <View style={styles.aisleIndicator}>
        <View style={styles.aisleLine} />
        <Text style={styles.aisleText}>PASILLO</Text>
        <View style={styles.aisleLine} />
      </View>

      {/* Sección de pasajeros */}
      <View style={styles.passengerSection}>
        {layout.slice(1).map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((seat, colIndex) => renderSeat(seat, `${rowIndex}-${colIndex}`))}
          </View>
        ))}
      </View>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.seatFree }]} />
          <Text style={styles.legendText}>Libre</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.seatReserved }]} />
          <Text style={styles.legendText}>Seleccionado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.seatOccupied }]} />
          <Text style={styles.legendText}>Ocupado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    // Apple shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    paddingBottom: 16,
  },
  steeringWheel: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frontSeats: {
    flexDirection: 'row',
    gap: 12,
  },
  aisleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  aisleLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.separator,
  },
  aisleText: {
    ...typography.caption2,
    color: colors.textTertiary,
    letterSpacing: 2,
  },
  passengerSection: {
    width: '100%',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  seat: {
    width: 52,
    height: 56,
    borderRadius: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  seatBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  seatText: {
    ...typography.headline,
    color: '#FFFFFF',
    marginTop: 2,
  },
  emptySpace: {
    width: 52,
    height: 56,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
});

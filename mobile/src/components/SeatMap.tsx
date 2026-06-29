import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Mock data para 18 asientos (1 al 18)
// Distribución en minibus estándar:
// Fila 1: [Conductor] [1] [2]
// Fila 2: [3] [4] [Pasillo] [5]
// Fila 3: [6] [7] [Pasillo] [8]
// Fila 4: [9] [10] [Pasillo] [11]
// Fila 5: [12] [13] [Pasillo] [14]
// Fila 6: [15] [16] [17] [18]

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

    const status = seatsData[seatNumber] || 'free'; // 'free', 'reserved', 'occupied'
    let bgColor = colors.seatFree;
    
    if (status === 'reserved') bgColor = colors.seatReserved;
    if (status === 'occupied') bgColor = colors.seatOccupied;

    return (
      <TouchableOpacity 
        key={seatNumber}
        style={[styles.seat, { backgroundColor: bgColor }]}
        onPress={() => onSeatPress && onSeatPress(seatNumber, status)}
      >
        <Text style={styles.seatText}>{seatNumber}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.driverSection}>
        <View style={styles.steeringWheel}>
           <Ionicons name="car-outline" size={24} color={colors.textSecondary} />
        </View>
        <View style={styles.frontSeats}>
          {renderSeat(layout[0][1], 'front-1')}
          {renderSeat(layout[0][2], 'front-2')}
        </View>
      </View>

      <View style={styles.passengerSection}>
        {layout.slice(1).map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((seat, colIndex) => renderSeat(seat, `${rowIndex}-${colIndex}`))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center'
  },
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  steeringWheel: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frontSeats: {
    flexDirection: 'row',
    gap: 16,
  },
  passengerSection: {
    width: '100%',
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  seat: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  seatText: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  emptySpace: {
    width: 50,
    height: 50,
  }
});

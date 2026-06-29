import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
const distribucionAsientos: (number | null)[][] = [
  [null, 1, 2],
  [3, 4, null, 5],
  [6, 7, null, 8],
  [9, 10, null, 11],
  [12, 13, null, 14],
  [15, 16, 17, 18]
];

export interface PropiedadesMapaAsientos {
  datosAsientos?: Record<number, 'libre' | 'seleccionado' | 'ocupado' | string>;
  alPresionarAsiento?: (numeroAsiento: number, estado: string) => void;
}

export default function SeatMap({ datosAsientos = {}, alPresionarAsiento }: PropiedadesMapaAsientos) {

  const renderizarAsiento = (numeroAsiento: number | null, indice: string | number) => {
    if (!numeroAsiento) return <View style={estilos.espacioVacio} key={`vacio-${indice}`} />;

    const estado = datosAsientos[numeroAsiento] || 'libre';
    let colorFondo = colors.seatFree;
    let colorTexto = '#FFFFFF';

    if (estado === 'seleccionado') colorFondo = colors.seatReserved;
    if (estado === 'ocupado') colorFondo = colors.seatOccupied;

    return (
      <AnimatedPressable
        key={numeroAsiento}
        style={[estilos.asiento, { backgroundColor: colorFondo }]}
        onPress={() => alPresionarAsiento && alPresionarAsiento(numeroAsiento, estado)}
        haptic={true}
        scaleValue={0.90}
      >
        <View style={estilos.respaldoAsiento} />
        <Text style={[estilos.textoAsiento, { color: colorTexto }]}>{numeroAsiento}</Text>
      </AnimatedPressable>
    );
  };

  return (
    <View style={estilos.contenedor}>
      {/* Sección del conductor */}
      <View style={estilos.seccionConductor}>
        <View style={estilos.volante}>
          <Ionicons name="car-sport-outline" size={22} color={colors.textSecondary} />
        </View>
        <View style={estilos.asientosDelanteros}>
          {renderizarAsiento(distribucionAsientos[0][1], 'delantero-1')}
          {renderizarAsiento(distribucionAsientos[0][2], 'delantero-2')}
        </View>
      </View>

      {/* Separador pasillo */}
      <View style={estilos.indicadorPasillo}>
        <View style={estilos.lineaPasillo} />
        <Text style={estilos.textoPasillo}>PASILLO</Text>
        <View style={estilos.lineaPasillo} />
      </View>

      {/* Sección de pasajeros */}
      <View style={estilos.seccionPasajeros}>
        {distribucionAsientos.slice(1).map((fila, indiceFila) => (
          <View key={`fila-${indiceFila}`} style={estilos.fila}>
            {fila.map((asiento, indiceColumna) => renderizarAsiento(asiento, `${indiceFila}-${indiceColumna}`))}
          </View>
        ))}
      </View>

      {/* Leyenda */}
      <View style={estilos.leyenda}>
        <View style={estilos.itemLeyenda}>
          <View style={[estilos.puntoLeyenda, { backgroundColor: colors.seatFree }]} />
          <Text style={estilos.textoLeyenda}>Libre</Text>
        </View>
        <View style={estilos.itemLeyenda}>
          <View style={[estilos.puntoLeyenda, { backgroundColor: colors.seatReserved }]} />
          <Text style={estilos.textoLeyenda}>Seleccionado</Text>
        </View>
        <View style={estilos.itemLeyenda}>
          <View style={[estilos.puntoLeyenda, { backgroundColor: colors.seatOccupied }]} />
          <Text style={estilos.textoLeyenda}>Ocupado</Text>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  seccionConductor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    paddingBottom: 16,
  },
  volante: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  asientosDelanteros: {
    flexDirection: 'row',
    gap: 12,
  },
  indicadorPasillo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  lineaPasillo: {
    flex: 1,
    height: 1,
    backgroundColor: colors.separator,
  },
  textoPasillo: {
    ...typography.caption2,
    color: colors.textTertiary,
    letterSpacing: 2,
  },
  seccionPasajeros: {
    width: '100%',
    gap: 12,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  asiento: {
    width: 52,
    height: 56,
    borderRadius: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  respaldoAsiento: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  textoAsiento: {
    ...typography.headline,
    color: '#FFFFFF',
    marginTop: 2,
  },
  espacioVacio: {
    width: 52,
    height: 56,
  },
  leyenda: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    width: '100%',
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  puntoLeyenda: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textoLeyenda: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
});

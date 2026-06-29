import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import AnimatedPressable from '../../components/AnimatedPressable';
import { Usuario, Vehiculo } from '../../types';

export interface PropiedadesPantallaSocio {
  navigation: any;
}

export default function SocioDashboardScreen({ navigation }: PropiedadesPantallaSocio) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [ingresosTotales, setIngresosTotales] = useState<number>(0);
  const [egresosTotales, setEgresosTotales] = useState<number>(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const usuario = await AuthService.getCurrentUser();
      setUsuarioActual(usuario);

      if (usuario) {
        // Cargar vehículos del socio
        const { data: vehiculosData } = await supabase
          .from('vehiculos')
          .select('*')
          .eq('propietario_id', usuario.id);
        
        if (vehiculosData) setVehiculos(vehiculosData as Vehiculo[]);

        // Cargar finanzas de los vehículos del socio
        if (vehiculosData && vehiculosData.length > 0) {
          const vehiculosIds = vehiculosData.map(v => v.id);

          const { data: ingresos } = await supabase
            .from('finanzas')
            .select('monto')
            .in('vehiculo_id', vehiculosIds)
            .eq('tipo', 'INGRESO');
          
          if (ingresos) {
            setIngresosTotales(ingresos.reduce((suma, f) => suma + parseFloat(f.monto), 0));
          }

          const { data: egresos } = await supabase
            .from('finanzas')
            .select('monto')
            .in('vehiculo_id', vehiculosIds)
            .eq('tipo', 'EGRESO');
          
          if (egresos) {
            setEgresosTotales(egresos.reduce((suma, f) => suma + parseFloat(f.monto), 0));
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos del socio:', error);
    } finally {
      setCargando(false);
    }
  };

  const alRefrescar = async () => {
    setRefrescando(true);
    await cargarDatos();
    setRefrescando(false);
  };

  const saldoNeto = ingresosTotales - egresosTotales;
  const formatearDinero = (monto: number) => `Bs. ${monto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const manejarCierreSesion = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.header}>
        <View>
          <Text style={estilos.headerTitle}>Panel de Socio</Text>
          <Text style={estilos.headerSubtitle}>
            {usuarioActual ? usuarioActual.nombre_completo : 'Propietario'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AnimatedPressable style={estilos.iconButton} onPress={alRefrescar}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable style={estilos.iconButton} onPress={manejarCierreSesion}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={estilos.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} colors={[colors.primary]} />
        }
      >
        <View style={estilos.statsContainer}>
          <View style={estilos.statBox}>
            <Text style={estilos.statLabel}>Ingresos Brutos</Text>
            <Text style={estilos.statValue}>{formatearDinero(ingresosTotales)}</Text>
          </View>
          <View style={estilos.statBox}>
            <Text style={estilos.statLabel}>Egresos</Text>
            <Text style={[estilos.statValue, { color: colors.danger }]}>
              - {formatearDinero(egresosTotales)}
            </Text>
          </View>
        </View>

        <View style={[estilos.statBox, estilos.totalBox]}>
          <Text style={estilos.statLabel}>Utilidad Neta</Text>
          <Text style={[estilos.statValue, { color: saldoNeto >= 0 ? colors.success : colors.danger, fontSize: 32 }]}>
            {formatearDinero(saldoNeto)}
          </Text>
        </View>

        <Text style={estilos.sectionTitle}>Mi Flota ({vehiculos.length} vehículos)</Text>
        
        {vehiculos.length === 0 ? (
          <View style={estilos.emptyCard}>
            <Ionicons name="car-outline" size={40} color={colors.textSecondary} />
            <Text style={estilos.emptyText}>No tienes vehículos registrados</Text>
          </View>
        ) : (
          vehiculos.map((vehiculoItem) => (
            <View key={vehiculoItem.id} style={estilos.vehicleCard}>
              <View style={estilos.vehicleHeader}>
                <Ionicons name="bus" size={24} color={colors.text} />
                <Text style={estilos.plate}>Placa: {vehiculoItem.placa}</Text>
                <View style={[estilos.statusBadge, { 
                  backgroundColor: vehiculoItem.estado === 'ACTIVO' ? colors.success : 
                    vehiculoItem.estado === 'MANTENIMIENTO' ? colors.warning : colors.danger 
                }]}>
                  <Text style={estilos.statusText}>
                    {vehiculoItem.estado === 'ACTIVO' ? 'Activo' : 
                     vehiculoItem.estado === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Inactivo'}
                  </Text>
                </View>
              </View>
              <Text style={estilos.routeText}>
                {vehiculoItem.modelo || 'Modelo N/A'} • {vehiculoItem.gestion || 'Gestión N/A'} • {vehiculoItem.capacidad} asientos
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card },
  headerTitle: { ...typography.title2, color: colors.text },
  headerSubtitle: { ...typography.footnote, color: colors.textSecondary, marginTop: 2 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: colors.card, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  totalBox: { marginBottom: 20, alignItems: 'center' },
  statLabel: { ...typography.footnote, color: colors.textSecondary, marginBottom: 6 },
  statValue: { ...typography.title2, color: colors.text },
  sectionTitle: { ...typography.title3, color: colors.text, marginBottom: 12 },
  emptyCard: { backgroundColor: colors.card, padding: 32, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  emptyText: { ...typography.subhead, color: colors.textSecondary, marginTop: 8 },
  vehicleCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  plate: { ...typography.headline, color: colors.text, marginLeft: 10, flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { ...typography.caption2, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },
  routeText: { ...typography.caption1, color: colors.textSecondary },
});

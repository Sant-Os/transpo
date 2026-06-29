import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import { ColaOffline } from '../../services/ColaOffline';
import AnimatedPressable from '../../components/AnimatedPressable';
import { Usuario, Vehiculo, Viaje } from '../../types';

export interface PropiedadesPantallaChofer {
  navigation: any;
}

export default function DriverDashboardScreen({ navigation }: PropiedadesPantallaChofer) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [estaEnLinea, setEstaEnLinea] = useState<boolean>(true);
  const [eventosPendientes, setEventosPendientes] = useState<number>(0);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  // Datos del viaje actual
  const [viajeActual, setViajeActual] = useState<any>(null);
  const [cantidadBoletos, setCantidadBoletos] = useState<number>(0);
  const [cantidadEncomiendas, setCantidadEncomiendas] = useState<number>(0);
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const usuario = await AuthService.getCurrentUser();
      setUsuarioActual(usuario);

      if (usuario) {
        // Cargar viaje actual del chofer
        const { data: viajeData } = await supabase
          .from('viajes')
          .select(`
            *,
            ruta:rutas(nombre, origen, destino),
            vehiculo:vehiculos(placa, modelo)
          `)
          .eq('chofer_id', usuario.id)
          .in('estado', ['PROGRAMADO', 'ABORDANDO', 'EN_RUTA'])
          .order('fecha_viaje', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (viajeData) {
          setViajeActual(viajeData);
          setVehiculo(viajeData.vehiculo as Vehiculo);

          // Contar boletos del viaje
          const { count: boletos } = await supabase
            .from('boletos')
            .select('*', { count: 'exact', head: true })
            .eq('viaje_id', viajeData.id)
            .eq('estado', 'ACTIVO');
          setCantidadBoletos(boletos || 0);

          // Contar encomiendas del viaje
          const { count: encomiendas } = await supabase
            .from('encomiendas')
            .select('*', { count: 'exact', head: true })
            .eq('viaje_id', viajeData.id);
          setCantidadEncomiendas(encomiendas || 0);
        } else {
          setViajeActual(null);
          setVehiculo(null);
        }
      }

      const tamanoCola = await ColaOffline.obtenerTamanoCola();
      setEventosPendientes(tamanoCola);
    } catch (error) {
      console.error('Error cargando datos del chofer:', error);
    }
  };

  const alternarRed = async () => {
    const nuevoEstado = !estaEnLinea;
    setEstaEnLinea(nuevoEstado);
    await ColaOffline.establecerEstadoEnLinea(nuevoEstado);

    if (nuevoEstado) {
      // Procesar cola en segundo plano al volver a estar en línea
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await ColaOffline.sincronizar();
      const tamanoCola = await ColaOffline.obtenerTamanoCola();
      setEventosPendientes(tamanoCola);
    }
  };

  const registrarEventoViaje = async (tipoEvento: string, datos: any = {}) => {
    if (!viajeActual) return;
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await ColaOffline.agregarEvento(tipoEvento, datos);
      const tamanoCola = await ColaOffline.obtenerTamanoCola();
      setEventosPendientes(tamanoCola);
      
      alert('Evento registrado correctamente ' + (estaEnLinea ? 'y sincronizado.' : '(guardado localmente).'));
    } catch (e) {
      console.error(e);
      alert('Error registrando evento.');
    }
  };

  const iniciarSalidaViaje = () => {
    registrarEventoViaje('INICIO_SALIDA', { hora: new Date().toISOString() });
  };

  const alertaBloqueoRuta = () => {
    registrarEventoViaje('ALERTA_BLOQUEO', { descripcion: 'Bloqueo detectado en la carretera' });
  };

  const abrirEscaner = () => {
    navigation.navigate('Scanner');
  };

  const manejarRefresco = async () => {
    setRefrescando(true);
    await cargarDatos();
    setRefrescando(false);
  };

  const manejarCierreSesion = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.header}>
        <View>
          <Text style={estilos.headerTitle}>Panel de Conductor</Text>
          <Text style={estilos.headerSubtitle}>
            {usuarioActual ? usuarioActual.nombre_completo : 'Chofer'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={estilos.networkToggleContainer}>
            <Text style={estilos.networkStatusText}>{estaEnLinea ? 'En Línea' : 'Sin Conexión'}</Text>
            <Switch
              trackColor={{ false: colors.danger, true: colors.success }}
              thumbColor={'#f4f3f4'}
              onValueChange={alternarRed}
              value={estaEnLinea}
            />
          </View>
          <AnimatedPressable style={estilos.iconButton} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable style={estilos.iconButton} onPress={manejarCierreSesion}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </AnimatedPressable>
        </View>
      </View>

      {!estaEnLinea && (
        <View style={estilos.offlineBanner}>
          <Ionicons name="cloud-offline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={estilos.offlineText}>
            Modo Offline Activo. {eventosPendientes > 0 ? `(${eventosPendientes} pendientes)` : ''}
          </Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={estilos.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={manejarRefresco} colors={[colors.primary]} />
        }
      >
        <Text style={estilos.sectionTitle}>Mi Hoja de Ruta Actual</Text>
        {viajeActual ? (
          <View style={estilos.card}>
            <Text style={estilos.cardTitle}>
              {viajeActual.ruta?.nombre || 'Ruta'} ({viajeActual.hora_salida?.substring(0, 5) || '--:--'})
            </Text>
            <View style={estilos.tripStatusContainer}>
              <View style={[estilos.tripStatusBadge, {
                backgroundColor: viajeActual.estado === 'EN_RUTA' ? colors.success : colors.primary
              }]}>
                <Text style={estilos.tripStatusText}>
                  {viajeActual.estado === 'PROGRAMADO' ? 'Programado' :
                   viajeActual.estado === 'ABORDANDO' ? 'Abordando' :
                   viajeActual.estado === 'EN_RUTA' ? 'En Ruta' : viajeActual.estado}
                </Text>
              </View>
            </View>
            <View style={estilos.infoRow}>
              <Ionicons name="people" size={20} color={colors.textSecondary} />
              <Text style={estilos.infoText}>{cantidadBoletos} Pasajeros a bordo</Text>
            </View>
            <View style={estilos.infoRow}>
              <Ionicons name="cube" size={20} color={colors.textSecondary} />
              <Text style={estilos.infoText}>{cantidadEncomiendas} Encomiendas</Text>
            </View>
          </View>
        ) : (
          <View style={estilos.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
            <Text style={estilos.emptyText}>No tienes viajes programados para hoy</Text>
          </View>
        )}

        <Text style={estilos.sectionTitle}>Acciones en Ruta</Text>
        
        <View style={estilos.actionsGrid}>
          <AnimatedPressable 
            style={estilos.actionButton}
            onPress={iniciarSalidaViaje}
          >
            <Ionicons name="play" size={32} color={colors.primary} />
            <Text style={estilos.actionText}>Iniciar Salida</Text>
          </AnimatedPressable>

          <AnimatedPressable 
            style={estilos.actionButton}
            onPress={abrirEscaner}
          >
            <Ionicons name="qr-code-outline" size={32} color={colors.primary} />
            <Text style={estilos.actionText}>Escanear Encomienda</Text>
          </AnimatedPressable>

          <AnimatedPressable 
            style={estilos.actionButton}
            onPress={() => registrarEventoViaje('REGISTRO_PARADA', { parada: 'Parada intermedia' })}
          >
            <Ionicons name="location" size={32} color={colors.primary} />
            <Text style={estilos.actionText}>Marcar Parada</Text>
          </AnimatedPressable>

          <AnimatedPressable 
            style={[estilos.actionButton, { borderColor: colors.danger }]}
            onPress={alertaBloqueoRuta}
          >
            <Ionicons name="warning" size={32} color={colors.danger} />
            <Text style={[estilos.actionText, { color: colors.danger }]}>Alerta de Vía</Text>
          </AnimatedPressable>
        </View>
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
  networkToggleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  networkStatusText: { ...typography.caption1, color: colors.textSecondary },
  offlineBanner: { backgroundColor: colors.warning, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  offlineText: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { ...typography.title3, color: colors.text, marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTitle: { ...typography.title3, color: colors.text, marginBottom: 12 },
  tripStatusContainer: { marginBottom: 16 },
  tripStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tripStatusText: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  infoText: { ...typography.subhead, color: colors.text },
  emptyCard: { backgroundColor: colors.card, padding: 32, borderRadius: 16, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  emptyText: { ...typography.subhead, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: { backgroundColor: colors.card, width: '47%', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  actionText: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: colors.text, marginTop: 10, textAlign: 'center' },
});

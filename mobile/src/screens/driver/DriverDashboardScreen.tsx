import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import { OfflineQueue } from '../../services/OfflineQueue';
import AnimatedPressable from '../../components/AnimatedPressable';
import { User, Vehicle, Trip } from '../../types';

export interface DriverDashboardScreenProps {
  navigation: any;
}

export default function DriverDashboardScreen({ navigation }: DriverDashboardScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingEvents, setPendingEvents] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Datos del viaje actual
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [parcelCount, setParcelCount] = useState<number>(0);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        // Cargar viaje actual del chofer
        const { data: tripData } = await supabase
          .from('trips')
          .select(`
            *,
            route:routes(name, origin, destination),
            vehicle:vehicles(plate, model)
          `)
          .eq('driver_id', user.id)
          .in('status', ['SCHEDULED', 'BOARDING', 'IN_PROGRESS'])
          .order('trip_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (tripData) {
          setCurrentTrip(tripData);
          setVehicle(tripData.vehicle as Vehicle);

          // Contar boletos del viaje
          const { count: tickets } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', tripData.id)
            .eq('status', 'ACTIVE');
          setTicketCount(tickets || 0);

          // Contar encomiendas del viaje
          const { count: parcels } = await supabase
            .from('parcels')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', tripData.id);
          setParcelCount(parcels || 0);
        } else {
          setCurrentTrip(null);
          setVehicle(null);
        }
      }

      const size = await OfflineQueue.getQueueSize();
      setPendingEvents(size);
    } catch (error) {
      console.error('Error cargando datos del chofer:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleNetwork = async () => {
    const newState = !isOnline;
    setIsOnline(newState);
    await OfflineQueue.setOnlineStatus(newState);
    const size = await OfflineQueue.getQueueSize();
    setPendingEvents(size);
  };

  const handleAction = async (type: string, payload: any) => {
    // Agregar trip_id al payload si hay viaje activo
    if (currentTrip) {
      payload.trip_id = currentTrip.id;
    }
    await OfflineQueue.addEvent(type, payload);
    const size = await OfflineQueue.getQueueSize();
    setPendingEvents(size);
    alert(`Acción "${type}" registrada.\nEstado: ${isOnline ? 'Enviado' : 'Guardado Offline'}`);
  };

  const handleStartTrip = async () => {
    if (currentTrip) {
      await supabase
        .from('trips')
        .update({ status: 'IN_PROGRESS' })
        .eq('id', currentTrip.id);
      
      handleAction('DEPARTURE_MARK', { 
        location: currentTrip.route?.origin || 'Uyuni', 
        time: Date.now() 
      });
      loadData();
    } else {
      alert('No tienes un viaje programado para hoy.');
    }
  };

  const handleGPSAlert = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permiso de GPS denegado');
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      
      // Guardar alerta en la base de datos
      if (currentTrip) {
        await supabase.from('alerts').insert({
          trip_id: currentTrip.id,
          driver_id: currentUser?.id,
          vehicle_id: currentTrip.vehicle_id,
          alert_type: 'ROAD_BLOCK',
          description: 'Alerta SOS del chofer en ruta',
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          status: 'OPEN'
        });
      }

      handleAction('ALERT_SOS', { 
        reason: 'Bloqueo en ruta',
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
    } catch (e) {
      alert('Error obteniendo ubicación GPS');
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  const handleOpenScanner = () => {
    navigation.navigate('Scanner');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard Chofer</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `Vehículo: ${vehicle.plate}` : 'Sin vehículo asignado'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.networkToggleContainer}>
            <Text style={styles.networkStatusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Switch
              trackColor={{ false: colors.danger, true: colors.success }}
              thumbColor={'#f4f3f4'}
              onValueChange={toggleNetwork}
              value={isOnline}
            />
          </View>
          <AnimatedPressable style={styles.iconButton} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable style={styles.iconButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </AnimatedPressable>
        </View>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.offlineText}>
            Modo Offline Activo. {pendingEvents > 0 ? `(${pendingEvents} pendientes)` : ''}
          </Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={styles.sectionTitle}>Mi Hoja de Ruta Actual</Text>
        {currentTrip ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {currentTrip.route?.name || 'Ruta'} ({currentTrip.departure_time?.substring(0, 5) || '--:--'})
            </Text>
            <View style={styles.tripStatusContainer}>
              <View style={[styles.tripStatusBadge, {
                backgroundColor: currentTrip.status === 'IN_PROGRESS' ? colors.success : colors.primary
              }]}>
                <Text style={styles.tripStatusText}>
                  {currentTrip.status === 'SCHEDULED' ? 'Programado' :
                   currentTrip.status === 'BOARDING' ? 'Abordando' :
                   currentTrip.status === 'IN_PROGRESS' ? 'En Ruta' : currentTrip.status}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{ticketCount} Pasajeros a bordo</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cube" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>{parcelCount} Encomiendas</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tienes viajes programados para hoy</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Acciones en Ruta</Text>
        
        <View style={styles.actionsGrid}>
          <AnimatedPressable 
            style={styles.actionButton}
            onPress={handleStartTrip}
          >
            <Ionicons name="play" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Iniciar Salida</Text>
          </AnimatedPressable>

          <AnimatedPressable 
            style={styles.actionButton}
            onPress={handleOpenScanner}
          >
            <Ionicons name="qr-code-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Escanear Encomienda</Text>
          </AnimatedPressable>

          <AnimatedPressable 
            style={styles.actionButton}
            onPress={() => handleAction('CHECKPOINT_MARK', { location: 'Parada intermedia' })}
          >
            <Ionicons name="location" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Marcar Parada</Text>
          </AnimatedPressable>

          <AnimatedPressable 
            style={[styles.actionButton, { borderColor: colors.danger }]}
            onPress={handleGPSAlert}
          >
            <Ionicons name="warning" size={32} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Alerta GPS</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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

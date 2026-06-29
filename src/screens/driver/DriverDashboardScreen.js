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

export default function DriverDashboardScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingEvents, setPendingEvents] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Datos del viaje actual
  const [currentTrip, setCurrentTrip] = useState(null);
  const [ticketCount, setTicketCount] = useState(0);
  const [parcelCount, setParcelCount] = useState(0);
  const [vehicle, setVehicle] = useState(null);

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
          .single();

        if (tripData) {
          setCurrentTrip(tripData);
          setVehicle(tripData.vehicle);

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

  const handleAction = async (type, payload) => {
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
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
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
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleStartTrip}
          >
            <Ionicons name="play" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Iniciar Salida</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleOpenScanner}
          >
            <Ionicons name="qr-code-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Escanear Encomienda</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleAction('CHECKPOINT_MARK', { location: 'Parada intermedia' })}
          >
            <Ionicons name="location" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Marcar Parada</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: colors.danger }]}
            onPress={handleGPSAlert}
          >
            <Ionicons name="warning" size={32} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Alerta GPS</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  networkStatusText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  offlineBanner: {
    backgroundColor: colors.warning,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  offlineText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 12,
  },
  tripStatusContainer: {
    marginBottom: 16,
  },
  tripStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripStatusText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: colors.card,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionButton: {
    backgroundColor: colors.card,
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  }
});

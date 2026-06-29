import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import { User, Vehicle, Route, Trip } from '../../types';

export interface AdminDashboardScreenProps {
  navigation: any;
}

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // KPIs
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [parcelCount, setParcelCount] = useState<number>(0);

  // counts
  const [userCount, setUserCount] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [routeCount, setRouteCount] = useState<number>(0);
  const [tripCount, setTripCount] = useState<number>(0);

  // Lists
  const [alerts, setAlerts] = useState<any[]>([]);

  // CRUD States
  const [showMgmtModal, setShowMgmtModal] = useState<boolean>(false);
  const [mgmtType, setMgmtType] = useState<'users' | 'vehicles' | 'routes' | 'trips'>('users');
  const [mgmtList, setMgmtList] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form Fields - Users
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newCI, setNewCI] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('SECRETARY');

  // Form Fields - Vehicles
  const [newPlate, setNewPlate] = useState<string>('');
  const [newModel, setNewModel] = useState<string>('');
  const [newYear, setNewYear] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<string>('18');
  const [newOwnerId, setNewOwnerId] = useState<string>('');

  // Form Fields - Routes
  const [newRouteName, setNewRouteName] = useState<string>('');
  const [newOrigin, setNewOrigin] = useState<string>('');
  const [newDest, setNewDest] = useState<string>('');
  const [newDuration, setNewDuration] = useState<string>('180');

  // Form Fields - Trips
  const [newTripRouteId, setNewTripRouteId] = useState<string>('');
  const [newTripVehicleId, setNewTripVehicleId] = useState<string>('');
  const [newTripDriverId, setNewTripDriverId] = useState<string>('');
  const [newTripTime, setNewTripTime] = useState<string>('14:00');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);

      await Promise.all([
        loadFinancials(),
        loadTickets(),
        loadParcels(),
        loadAlerts(),
        loadSystemCounts()
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancials = async () => {
    // Ingresos del día
    const { data: incomes } = await supabase
      .from('finances')
      .select('amount')
      .eq('type', 'INCOME');
    
    if (incomes) {
      const total = incomes.reduce((sum, f) => sum + parseFloat(f.amount), 0);
      setTotalIncome(total);
    }

    // Egresos del día
    const { data: expenses } = await supabase
      .from('finances')
      .select('amount')
      .eq('type', 'EXPENSE');
    
    if (expenses) {
      const total = expenses.reduce((sum, f) => sum + parseFloat(f.amount), 0);
      setTotalExpense(total);
    }
  };

  const loadTickets = async () => {
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });
    setTicketCount(count || 0);
  };

  const loadParcels = async () => {
    const { count } = await supabase
      .from('parcels')
      .select('*', { count: 'exact', head: true });
    setParcelCount(count || 0);
  };

  const loadAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select(`
        *,
        driver:users!alerts_driver_id_fkey(full_name),
        vehicle:vehicles!alerts_vehicle_id_fkey(plate)
      `)
      .in('status', ['OPEN', 'MANAGING'])
      .order('created_at', { ascending: false });
    
    if (data) setAlerts(data);
  };

  const loadSystemCounts = async () => {
    const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: vehicles } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
    const { count: routes } = await supabase.from('routes').select('*', { count: 'exact', head: true });
    const { count: trips } = await supabase.from('trips').select('*', { count: 'exact', head: true });

    setUserCount(users || 0);
    setVehicleCount(vehicles || 0);
    setRouteCount(routes || 0);
    setTripCount(trips || 0);
  };

  const handleResolveAlert = async (alertId: number) => {
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    
    if (!error) {
      alert('Alerta marcada como resuelta');
      loadAlerts();
    } else {
      alert('Error actualizando alerta: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  const formatMoney = (amount: number) => {
    return `Bs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // CRUD helpers
  const openManagementModal = async (type: 'users' | 'vehicles' | 'routes' | 'trips') => {
    setMgmtType(type);
    setShowAddForm(false);
    try {
      const { data } = await supabase.from(type).select('*').order('id', { ascending: false });
      if (data) setMgmtList(data);
      setShowMgmtModal(true);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword || !newFullName) {
      alert('Complete los campos obligatorios');
      return;
    }
    const { error } = await supabase.from('users').insert({
      username: newUsername,
      password: newPassword,
      full_name: newFullName,
      ci: newCI,
      phone: newPhone,
      role: newRole,
      is_active: true
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewCI('');
      setNewPhone('');
      setShowAddForm(false);
      openManagementModal('users');
      loadSystemCounts();
    }
  };

  const handleDeleteUser = async (id: number) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      openManagementModal('users');
      loadSystemCounts();
    }
  };

  const handleAddVehicle = async () => {
    if (!newPlate || !newCapacity) {
      alert('Complete los campos obligatorios');
      return;
    }
    const { error } = await supabase.from('vehicles').insert({
      plate: newPlate,
      model: newModel,
      year: parseInt(newYear) || 2020,
      capacity: parseInt(newCapacity),
      owner_id: parseInt(newOwnerId) || null,
      status: 'ACTIVE'
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNewPlate('');
      setNewModel('');
      setNewYear('');
      setNewCapacity('18');
      setNewOwnerId('');
      setShowAddForm(false);
      openManagementModal('vehicles');
      loadSystemCounts();
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      openManagementModal('vehicles');
      loadSystemCounts();
    }
  };

  const handleAddRoute = async () => {
    if (!newRouteName || !newOrigin || !newDest) {
      alert('Complete los campos obligatorios');
      return;
    }
    const { error } = await supabase.from('routes').insert({
      name: newRouteName,
      origin: newOrigin,
      destination: newDest,
      estimated_minutes: parseInt(newDuration) || 180
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNewRouteName('');
      setNewOrigin('');
      setNewDest('');
      setNewDuration('180');
      setShowAddForm(false);
      openManagementModal('routes');
      loadSystemCounts();
    }
  };

  const handleDeleteRoute = async (id: number) => {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      openManagementModal('routes');
      loadSystemCounts();
    }
  };

  const handleAddTrip = async () => {
    if (!newTripRouteId || !newTripVehicleId || !newTripDriverId) {
      alert('Complete los campos obligatorios');
      return;
    }
    const { error } = await supabase.from('trips').insert({
      route_id: parseInt(newTripRouteId),
      vehicle_id: parseInt(newTripVehicleId),
      driver_id: parseInt(newTripDriverId),
      departure_time: newTripTime,
      status: 'SCHEDULED'
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNewTripRouteId('');
      setNewTripVehicleId('');
      setNewTripDriverId('');
      setNewTripTime('14:00');
      setShowAddForm(false);
      openManagementModal('trips');
      loadSystemCounts();
    }
  };

  const handleDeleteTrip = async (id: number) => {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      openManagementModal('trips');
      loadSystemCounts();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel de Control</Text>
          <Text style={styles.headerSubtitle}>
            {currentUser ? currentUser.full_name : 'Administrador'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={styles.sectionTitle}>Resumen Financiero Global</Text>
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Ingresos Totales</Text>
            <Text style={styles.kpiValue}>{formatMoney(totalIncome)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Egresos Globales</Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              - {formatMoney(totalExpense)}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { alignItems: 'center', marginBottom: 24 }]}>
          <Text style={styles.kpiLabel}>Utilidad Neto Global</Text>
          <Text style={[styles.kpiValue, { color: totalIncome - totalExpense >= 0 ? colors.success : colors.danger, fontSize: 32 }]}>
            {formatMoney(totalIncome - totalExpense)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Módulos de Gestión</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridCard} onPress={() => openManagementModal('users')}>
            <Ionicons name="people-outline" size={32} color={colors.primary} />
            <Text style={styles.gridTitle}>Usuarios</Text>
            <Text style={styles.gridCount}>{userCount} Registros</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => openManagementModal('vehicles')}>
            <Ionicons name="bus-outline" size={32} color={colors.primary} />
            <Text style={styles.gridTitle}>Flota (Vehículos)</Text>
            <Text style={styles.gridCount}>{vehicleCount} Unidades</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => openManagementModal('routes')}>
            <Ionicons name="map-outline" size={32} color={colors.primary} />
            <Text style={styles.gridTitle}>Rutas y Precios</Text>
            <Text style={styles.gridCount}>{routeCount} Rutas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => openManagementModal('trips')}>
            <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            <Text style={styles.gridTitle}>Viajes del Día</Text>
            <Text style={styles.gridCount}>{tripCount} Salidas</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Alertas e Incidentes en Ruta</Text>
        {alerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
            <Text style={styles.emptyText}>No hay incidentes activos en las rutas hoy</Text>
          </View>
        ) : (
          alerts.map((alertItem) => (
            <View key={alertItem.id} style={styles.alertCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>
                  🚨 Alerta: {alertItem.alert_type === 'ROAD_BLOCK' ? 'Bloqueo' : alertItem.alert_type}
                </Text>
                <Text style={styles.alertDesc}>{alertItem.description}</Text>
                <Text style={styles.alertMeta}>
                  Vehículo: {alertItem.vehicle?.plate} | Reporta: {alertItem.driver?.full_name}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.resolveBtn}
                onPress={() => handleResolveAlert(alertItem.id)}
              >
                <Text style={styles.resolveBtnText}>Resolver</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* CRUD MODAL */}
      <Modal visible={showMgmtModal} animationType="slide" onRequestClose={() => setShowMgmtModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Gestión: {mgmtType === 'users' ? 'Usuarios' :
                       mgmtType === 'vehicles' ? 'Vehículos' :
                       mgmtType === 'routes' ? 'Rutas' : 'Viajes'}
            </Text>
            <TouchableOpacity onPress={() => setShowMgmtModal(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            <TouchableOpacity 
              style={[styles.addBtn, { marginBottom: 16 }]} 
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <Text style={styles.addBtnText}>{showAddForm ? 'Cerrar Formulario' : 'Agregar Nuevo Registro'}</Text>
            </TouchableOpacity>

            {showAddForm && (
              <View style={[styles.card, { marginBottom: 20 }]}>
                <Text style={styles.sectionTitle}>Nuevo Registro</Text>

                {mgmtType === 'users' && (
                  <View>
                    <TextInput style={styles.modalInput} placeholder="Usuario (Login)" value={newUsername} onChangeText={setNewUsername} />
                    <TextInput style={styles.modalInput} placeholder="Contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                    <TextInput style={styles.modalInput} placeholder="Nombre Completo" value={newFullName} onChangeText={setNewFullName} />
                    <TextInput style={styles.modalInput} placeholder="CI" value={newCI} onChangeText={setNewCI} />
                    <TextInput style={styles.modalInput} placeholder="Teléfono" value={newPhone} onChangeText={setNewPhone} />
                    <TextInput style={styles.modalInput} placeholder="Rol (ADMIN, SECRETARY, DRIVER, SOCIO)" value={newRole} onChangeText={setNewRole} autoCapitalize="characters" />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser}>
                      <Text style={styles.submitBtnText}>Guardar Usuario</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {mgmtType === 'vehicles' && (
                  <View>
                    <TextInput style={styles.modalInput} placeholder="Placa (ej: 2314-HBG)" value={newPlate} onChangeText={setNewPlate} />
                    <TextInput style={styles.modalInput} placeholder="Modelo (ej: Toyota HiAce)" value={newModel} onChangeText={setNewModel} />
                    <TextInput style={styles.modalInput} placeholder="Año (ej: 2020)" value={newYear} onChangeText={setNewYear} keyboardType="numeric" />
                    <TextInput style={styles.modalInput} placeholder="Capacidad (Asientos)" value={newCapacity} onChangeText={setNewCapacity} keyboardType="numeric" />
                    <TextInput style={styles.modalInput} placeholder="ID Socio Propietario" value={newOwnerId} onChangeText={setNewOwnerId} keyboardType="numeric" />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAddVehicle}>
                      <Text style={styles.submitBtnText}>Guardar Vehículo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {mgmtType === 'routes' && (
                  <View>
                    <TextInput style={styles.modalInput} placeholder="Nombre Ruta (ej: Uyuni - Potosi)" value={newRouteName} onChangeText={setNewRouteName} />
                    <TextInput style={styles.modalInput} placeholder="Origen (ej: Uyuni)" value={newOrigin} onChangeText={setNewOrigin} />
                    <TextInput style={styles.modalInput} placeholder="Destino (ej: Potosi)" value={newDest} onChangeText={setNewDest} />
                    <TextInput style={styles.modalInput} placeholder="Duración Estimada (Minutos)" value={newDuration} onChangeText={setNewDuration} keyboardType="numeric" />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAddRoute}>
                      <Text style={styles.submitBtnText}>Guardar Ruta</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {mgmtType === 'trips' && (
                  <View>
                    <TextInput style={styles.modalInput} placeholder="ID de la Ruta" value={newTripRouteId} onChangeText={setNewTripRouteId} keyboardType="numeric" />
                    <TextInput style={styles.modalInput} placeholder="ID del Vehículo" value={newTripVehicleId} onChangeText={setNewTripVehicleId} keyboardType="numeric" />
                    <TextInput style={styles.modalInput} placeholder="ID del Chofer" value={newTripDriverId} onChangeText={setNewTripDriverId} keyboardType="numeric" />
                    <TextInput style={styles.modalInput} placeholder="Hora Salida (ej: 14:30)" value={newTripTime} onChangeText={setNewTripTime} />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAddTrip}>
                      <Text style={styles.submitBtnText}>Programar Viaje</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Registros Existentes</Text>
            {mgmtList.map((item) => (
              <View key={item.id} style={styles.alertCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>ID: #{item.id}</Text>
                  {mgmtType === 'users' && (
                    <Text style={styles.alertDesc}>{item.full_name} ({item.role}) - Log: {item.username}</Text>
                  )}
                  {mgmtType === 'vehicles' && (
                    <Text style={styles.alertDesc}>{item.plate} - {item.model} ({item.capacity} as.)</Text>
                  )}
                  {mgmtType === 'routes' && (
                    <Text style={styles.alertDesc}>{item.name} - {item.estimated_minutes} min.</Text>
                  )}
                  {mgmtType === 'trips' && (
                    <Text style={styles.alertDesc}>Ruta ID: {item.route_id} - Salida: {item.departure_time} - {item.status}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={[styles.resolveBtn, { backgroundColor: colors.danger }]}
                  onPress={() => {
                    if (mgmtType === 'users') handleDeleteUser(item.id);
                    if (mgmtType === 'vehicles') handleDeleteVehicle(item.id);
                    if (mgmtType === 'routes') handleDeleteRoute(item.id);
                    if (mgmtType === 'trips') handleDeleteTrip(item.id);
                  }}
                >
                  <Text style={styles.resolveBtnText}>Borrar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    fontFamily: typography.fontFamilyBold,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontFamily: typography.fontFamilyBold,
    marginBottom: 16,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  kpiValue: {
    ...typography.h2,
    color: colors.success,
    fontFamily: typography.fontFamilyBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    backgroundColor: colors.card,
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  gridTitle: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginTop: 8,
  },
  gridCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 8,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  alertTitle: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  alertDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  alertMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  resolveBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resolveBtnText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalInput: {
    ...typography.body,
    fontFamily: typography.fontFamily,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.background,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  }
});

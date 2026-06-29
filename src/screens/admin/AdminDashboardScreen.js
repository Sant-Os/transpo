import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';

export default function AdminDashboardScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // KPIs
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [parcelCount, setParcelCount] = useState(0);

  // Alertas
  const [alerts, setAlerts] = useState([]);

  // Contadores del sistema
  const [userCount, setUserCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [routeCount, setRouteCount] = useState(0);
  const [tripCount, setTripCount] = useState(0);

  // Estados de Modales e Interacciones Reales de Gestión
  const [activeModal, setActiveModal] = useState(null); // 'users' | 'vehicles' | 'routes' | 'trips'
  const [modalList, setModalList] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Listas de referencias para dropdowns
  const [sociosList, setSociosList] = useState([]);
  const [routesOptions, setRoutesOptions] = useState([]);
  const [vehiclesOptions, setVehiclesOptions] = useState([]);
  const [driversOptions, setDriversOptions] = useState([]);

  // Form: Usuarios
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newCI, setNewCI] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('SECRETARY');

  // Form: Vehículos
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newCapacity, setNewCapacity] = useState('18');
  const [newOwnerId, setNewOwnerId] = useState('');

  // Form: Rutas
  const [newRouteName, setNewRouteName] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newEstMinutes, setNewEstMinutes] = useState('');

  // Form: Viajes
  const [newRouteId, setNewRouteId] = useState('');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newDriverId, setNewDriverId] = useState('');
  const [newDepTime, setNewDepTime] = useState('14:00');

  // Cargadores dinámicos para los modales
  const openManagementModal = async (type) => {
    setActiveModal(type);
    setShowAddForm(false);
    setModalLoading(true);
    try {
      if (type === 'users') {
        const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        setModalList(data || []);
      } else if (type === 'vehicles') {
        const { data } = await supabase.from('vehicles').select('*, owner:users(full_name)').order('created_at', { ascending: false });
        setModalList(data || []);
        const { data: socios } = await supabase.from('users').select('id, full_name').eq('role', 'SOCIO');
        setSociosList(socios || []);
      } else if (type === 'routes') {
        const { data } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
        setModalList(data || []);
      } else if (type === 'trips') {
        const { data } = await supabase.from('trips').select('*, route:routes(name), vehicle:vehicles(plate), driver:users(full_name)').order('created_at', { ascending: false });
        setModalList(data || []);
        
        // Cargar opciones para crear viaje
        const { data: routes } = await supabase.from('routes').select('id, name');
        setRoutesOptions(routes || []);
        const { data: vehicles } = await supabase.from('vehicles').select('id, plate');
        setVehiclesOptions(vehicles || []);
        const { data: drivers } = await supabase.from('users').select('id, full_name').eq('role', 'DRIVER');
        setDriversOptions(drivers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword || !newFullName) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
    const { error } = await supabase.from('users').insert({
      username: newUsername,
      password: newPassword,
      full_name: newFullName,
      ci: newCI,
      phone: newPhone,
      role: newRole
    });
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Usuario creado con éxito');
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewCI('');
      setNewPhone('');
      setNewRole('SECRETARY');
      setShowAddForm(false);
      openManagementModal('users');
      loadSystemCounts();
    }
  };

  const handleDeleteUser = async (id) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      openManagementModal('users');
      loadSystemCounts();
    }
  };

  const handleAddVehicle = async () => {
    if (!newPlate) {
      alert('Placa es obligatoria');
      return;
    }
    const { error } = await supabase.from('vehicles').insert({
      plate: newPlate,
      model: newModel,
      year: newYear ? parseInt(newYear) : null,
      capacity: parseInt(newCapacity),
      owner_id: newOwnerId ? parseInt(newOwnerId) : null
    });
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Vehículo creado con éxito');
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

  const handleDeleteVehicle = async (id) => {
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
    const { data: routeData, error } = await supabase.from('routes').insert({
      name: newRouteName,
      origin: newOrigin,
      destination: newDest,
      estimated_minutes: newEstMinutes ? parseInt(newEstMinutes) : 180
    }).select().single();

    if (error) {
      alert('Error: ' + error.message);
    } else {
      // Agregar tramos por defecto
      await supabase.from('segments').insert([
        { route_id: routeData.id, origin: newOrigin, destination: 'Parada intermedia', order_index: 1, price: 15 },
        { route_id: routeData.id, origin: 'Parada intermedia', destination: newDest, order_index: 2, price: 20 }
      ]);
      alert('Ruta creada con éxito');
      setNewRouteName('');
      setNewOrigin('');
      setNewDest('');
      setNewEstMinutes('');
      setShowAddForm(false);
      openManagementModal('routes');
      loadSystemCounts();
    }
  };

  const handleDeleteRoute = async (id) => {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      openManagementModal('routes');
      loadSystemCounts();
    }
  };

  const handleAddTrip = async () => {
    if (!newRouteId || !newVehicleId || !newDriverId) {
      alert('Complete la ruta, vehículo y chofer');
      return;
    }
    const { error } = await supabase.from('trips').insert({
      route_id: parseInt(newRouteId),
      vehicle_id: parseInt(newVehicleId),
      driver_id: parseInt(newDriverId),
      departure_time: newDepTime,
      status: 'SCHEDULED'
    });
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Viaje programado con éxito');
      setNewRouteId('');
      setNewVehicleId('');
      setNewDriverId('');
      setNewDepTime('14:00');
      setShowAddForm(false);
      openManagementModal('trips');
      loadSystemCounts();
    }
  };

  const handleDeleteTrip = async (id) => {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      openManagementModal('trips');
      loadSystemCounts();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar usuario actual
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);

      // Cargar todos los datos en paralelo
      await Promise.all([
        loadFinances(),
        loadTickets(),
        loadParcels(),
        loadAlerts(),
        loadSystemCounts(),
      ]);
    } catch (error) {
      console.error('Error cargando datos del admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadFinances = async () => {
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
    const { data, count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });
    setTicketCount(count || 0);
  };

  const loadParcels = async () => {
    const { data, count } = await supabase
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

  const handleResolveAlert = async (alertId) => {
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

  const formatMoney = (amount) => {
    return `Bs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: 16 }}>
          Cargando panel de control...
        </Text>
      </SafeAreaView>
    );
  }

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
        
        {/* KPIs Financieros */}
        <Text style={styles.sectionTitle}>Resumen Financiero Global</Text>
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Ingresos Totales</Text>
            <Text style={styles.kpiValue}>{formatMoney(totalIncome)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Egresos</Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              {formatMoney(totalExpense)}
            </Text>
          </View>
        </View>

        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Utilidad Neta</Text>
            <Text style={[styles.kpiValue, { color: totalIncome - totalExpense >= 0 ? colors.success : colors.danger }]}>
              {formatMoney(totalIncome - totalExpense)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Boletos Vendidos</Text>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>{ticketCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Encomiendas</Text>
            <Text style={[styles.kpiValue, { color: colors.warning }]}>{parcelCount}</Text>
          </View>
        </View>

        {/* Alertas */}
        <Text style={styles.sectionTitle}>
          Alertas e Incidentes {alerts.length > 0 ? `(${alerts.length})` : ''}
        </Text>
        
        {alerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            <Text style={styles.emptyText}>Sin alertas activas</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={24} color={colors.danger} />
                <Text style={styles.alertTitle}>{alert.description || alert.alert_type}</Text>
              </View>
              <Text style={styles.alertDesc}>
                Chofer: {alert.driver?.full_name || 'Desconocido'}
              </Text>
              <Text style={styles.alertDesc}>
                Vehículo: {alert.vehicle?.plate || 'N/A'}
              </Text>
              <Text style={styles.alertDesc}>
                Estado: {alert.status === 'OPEN' ? '🔴 Abierta' : '🟡 Gestionando'}
              </Text>
              <View style={styles.alertActions}>
                {alert.status === 'OPEN' && (
                  <TouchableOpacity 
                    style={styles.btnManage}
                    onPress={async () => {
                      await supabase.from('alerts').update({ status: 'MANAGING' }).eq('id', alert.id);
                      alert('Alerta marcada como "En gestión"');
                      loadAlerts();
                    }}
                  >
                    <Text style={styles.btnTextManage}>Gestionar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.btnResolve}
                  onPress={() => handleResolveAlert(alert.id)}
                >
                  <Text style={styles.btnTextResolve}>Resolver</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Gestión del Sistema */}
        <Text style={styles.sectionTitle}>Gestión del Sistema</Text>
        <View style={styles.menuGrid}>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => openManagementModal('users')}
          >
            <Ionicons name="people" size={28} color={colors.primary} />
            <Text style={styles.menuText}>Usuarios</Text>
            <Text style={styles.menuCount}>{userCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => openManagementModal('vehicles')}
          >
            <Ionicons name="bus" size={28} color={colors.primary} />
            <Text style={styles.menuText}>Flota</Text>
            <Text style={styles.menuCount}>{vehicleCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => openManagementModal('routes')}
          >
            <Ionicons name="map" size={28} color={colors.primary} />
            <Text style={styles.menuText}>Rutas</Text>
            <Text style={styles.menuCount}>{routeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => openManagementModal('trips')}
          >
            <Ionicons name="document-text" size={28} color={colors.primary} />
            <Text style={styles.menuText}>Viajes</Text>
            <Text style={styles.menuCount}>{tripCount}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Modal General de Gestión */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseButton}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.primary, fontFamily: typography.fontFamilyBold }}>Volver</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {activeModal === 'users' ? 'Gestión de Usuarios' :
               activeModal === 'vehicles' ? 'Gestión de Flota' :
               activeModal === 'routes' ? 'Gestión de Rutas' :
               activeModal === 'trips' ? 'Programar Viajes' : 'Gestión'}
            </Text>
            <TouchableOpacity 
              style={styles.modalAddButton}
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <Ionicons name={showAddForm ? "list" : "add-circle"} size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {modalLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {showAddForm ? (
                /* FORMULARIOS DE CREACIÓN */
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Agregar Nuevo</Text>
                  
                  {activeModal === 'users' && (
                    <View>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Usuario (ej. secretaria2)"
                        placeholderTextColor={colors.textSecondary}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textSecondary}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Nombre Completo"
                        placeholderTextColor={colors.textSecondary}
                        value={newFullName}
                        onChangeText={setNewFullName}
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="C.I. / Documento"
                        placeholderTextColor={colors.textSecondary}
                        value={newCI}
                        onChangeText={setNewCI}
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Teléfono"
                        placeholderTextColor={colors.textSecondary}
                        value={newPhone}
                        onChangeText={setNewPhone}
                      />
                      <Text style={styles.formSectionLabel}>Rol de Usuario:</Text>
                      <View style={styles.roleSelectionGrid}>
                        {['ADMIN', 'SECRETARY', 'DRIVER', 'SOCIO'].map((role) => (
                          <TouchableOpacity
                            key={role}
                            style={[styles.roleSelectBtn, newRole === role && styles.roleSelectBtnActive]}
                            onPress={() => setNewRole(role)}
                          >
                            <Text style={[styles.roleSelectText, newRole === role && styles.roleSelectTextActive]}>
                              {role}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser}>
                        <Text style={styles.submitBtnText}>Crear Usuario</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {activeModal === 'vehicles' && (
                    <View>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Placa (ej. 2314-HBG)"
                        placeholderTextColor={colors.textSecondary}
                        value={newPlate}
                        onChangeText={setNewPlate}
                        autoCapitalize="characters"
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Modelo/Marca (ej. Toyota HiAce)"
                        placeholderTextColor={colors.textSecondary}
                        value={newModel}
                        onChangeText={setNewModel}
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Año"
                        placeholderTextColor={colors.textSecondary}
                        value={newYear}
                        onChangeText={setNewYear}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Capacidad de asientos (ej. 18)"
                        placeholderTextColor={colors.textSecondary}
                        value={newCapacity}
                        onChangeText={setNewCapacity}
                        keyboardType="numeric"
                      />
                      <Text style={styles.formSectionLabel}>Asignar Socio Propietario:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {sociosList.map((socio) => (
                          <TouchableOpacity
                            key={socio.id}
                            style={[styles.roleSelectBtn, newOwnerId == socio.id && styles.roleSelectBtnActive]}
                            onPress={() => setNewOwnerId(socio.id.toString())}
                          >
                            <Text style={[styles.roleSelectText, newOwnerId == socio.id && styles.roleSelectTextActive]}>
                              {socio.full_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TouchableOpacity style={styles.submitBtn} onPress={handleAddVehicle}>
                        <Text style={styles.submitBtnText}>Crear Vehículo</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {activeModal === 'routes' && (
                    <View>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Nombre de la ruta (ej. Uyuni - Potosí)"
                        placeholderTextColor={colors.textSecondary}
                        value={newRouteName}
                        onChangeText={setNewRouteName}
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Origen"
                        placeholderTextColor={colors.textSecondary}
                        value={newOrigin}
                        onChangeText={setNewOrigin}
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Destino"
                        placeholderTextColor={colors.textSecondary}
                        value={newDest}
                        onChangeText={setNewDest}
                      />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Minutos estimados de viaje"
                        placeholderTextColor={colors.textSecondary}
                        value={newEstMinutes}
                        onChangeText={setNewEstMinutes}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity style={styles.submitBtn} onPress={handleAddRoute}>
                        <Text style={styles.submitBtnText}>Crear Ruta</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {activeModal === 'trips' && (
                    <View>
                      <Text style={styles.formSectionLabel}>Seleccionar Ruta:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {routesOptions.map((route) => (
                          <TouchableOpacity
                            key={route.id}
                            style={[styles.roleSelectBtn, newRouteId == route.id && styles.roleSelectBtnActive]}
                            onPress={() => setNewRouteId(route.id.toString())}
                          >
                            <Text style={[styles.roleSelectText, newRouteId == route.id && styles.roleSelectTextActive]}>
                              {route.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.formSectionLabel}>Seleccionar Vehículo:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {vehiclesOptions.map((v) => (
                          <TouchableOpacity
                            key={v.id}
                            style={[styles.roleSelectBtn, newVehicleId == v.id && styles.roleSelectBtnActive]}
                            onPress={() => setNewVehicleId(v.id.toString())}
                          >
                            <Text style={[styles.roleSelectText, newVehicleId == v.id && styles.roleSelectTextActive]}>
                              {v.plate}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.formSectionLabel}>Seleccionar Chofer:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {driversOptions.map((d) => (
                          <TouchableOpacity
                            key={d.id}
                            style={[styles.roleSelectBtn, newDriverId == d.id && styles.roleSelectBtnActive]}
                            onPress={() => setNewDriverId(d.id.toString())}
                          >
                            <Text style={[styles.roleSelectText, newDriverId == d.id && styles.roleSelectTextActive]}>
                              {d.full_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <TextInput
                        style={styles.modalInput}
                        placeholder="Hora de Salida (ej. 14:00)"
                        placeholderTextColor={colors.textSecondary}
                        value={newDepTime}
                        onChangeText={setNewDepTime}
                      />
                      <TouchableOpacity style={styles.submitBtn} onPress={handleAddTrip}>
                        <Text style={styles.submitBtnText}>Programar Viaje</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => setShowAddForm(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* LISTADO DE ELEMENTOS EXISTENTES */
                <View>
                  {modalList.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>No hay elementos registrados</Text>
                    </View>
                  ) : (
                    modalList.map((item) => (
                      <View key={item.id} style={styles.recordCard}>
                        <View style={{ flex: 1 }}>
                          {activeModal === 'users' && (
                            <View>
                              <Text style={styles.recordTitle}>{item.full_name}</Text>
                              <Text style={styles.recordSub}>Usuario: {item.username} | Rol: {item.role}</Text>
                              <Text style={styles.recordSub}>CI: {item.ci || 'Sin CI'} | Tel: {item.phone || 'Sin Tel'}</Text>
                            </View>
                          )}
                          {activeModal === 'vehicles' && (
                            <View>
                              <Text style={styles.recordTitle}>Placa: {item.plate}</Text>
                              <Text style={styles.recordSub}>{item.model || 'Toyota HiAce'} | Asientos: {item.capacity}</Text>
                              <Text style={styles.recordSub}>Propietario: {item.owner?.full_name || 'Sin asignar'}</Text>
                            </View>
                          )}
                          {activeModal === 'routes' && (
                            <View>
                              <Text style={styles.recordTitle}>{item.name}</Text>
                              <Text style={styles.recordSub}>De {item.origin} a {item.destination}</Text>
                              <Text style={styles.recordSub}>Duración: {item.estimated_minutes} min</Text>
                            </View>
                          )}
                          {activeModal === 'trips' && (
                            <View>
                              <Text style={styles.recordTitle}>{item.route?.name || 'Ruta'}</Text>
                              <Text style={styles.recordSub}>Hora: {item.departure_time?.substring(0, 5)} | Placa: {item.vehicle?.plate || 'N/A'}</Text>
                              <Text style={styles.recordSub}>Chofer: {item.driver?.full_name || 'Sin asignar'}</Text>
                            </View>
                          )}
                        </View>
                        {item.username !== 'admin' && ( // No dejar eliminar al admin principal
                          <TouchableOpacity 
                            style={styles.deleteBtn}
                            onPress={() => {
                              if (activeModal === 'users') handleDeleteUser(item.id);
                              else if (activeModal === 'vehicles') handleDeleteVehicle(item.id);
                              else if (activeModal === 'routes') handleDeleteRoute(item.id);
                              else if (activeModal === 'trips') handleDeleteTrip(item.id);
                            }}
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}
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
    padding: 24,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  // KPIs
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  kpiValue: {
    ...typography.h2,
    color: colors.success,
  },
  // Alertas
  alertCard: {
    backgroundColor: '#FFE5E5',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFB3B3',
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    ...typography.h3,
    color: colors.danger,
    marginLeft: 8,
    flex: 1,
  },
  alertDesc: {
    ...typography.body,
    color: colors.text,
    marginBottom: 4,
  },
  alertActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btnManage: {
    backgroundColor: colors.warning,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnTextManage: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
  },
  btnResolve: {
    backgroundColor: colors.success,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnTextResolve: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  // Empty state
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
    color: colors.success,
    marginTop: 12,
  },
  // Menu
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  menuItem: {
    width: '47%',
    aspectRatio: 1.2,
    backgroundColor: colors.card,
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
  menuText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
    marginTop: 12,
  },
  menuCount: {
    ...typography.h3,
    color: colors.primary,
    marginTop: 4,
  },
  // Modal & Forms Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalHeaderTitle: {
    ...typography.h3,
    color: colors.text,
    fontFamily: typography.fontFamilyBold,
  },
  modalAddButton: {
    padding: 4,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
    fontFamily: typography.fontFamilyBold,
  },
  modalInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.background,
    color: colors.text,
  },
  formSectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 8,
  },
  roleSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  roleSelectBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleSelectText: {
    ...typography.caption,
    color: colors.text,
  },
  roleSelectTextActive: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
  },
  submitBtn: {
    backgroundColor: colors.success,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Record Cards
  recordCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  recordTitle: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  recordSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

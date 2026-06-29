import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import AnimatedPressable from '../../components/AnimatedPressable';
import Toast from '../../components/Toast';
import SegmentedControl from '../../components/SegmentedControl';
import { Usuario, Vehiculo, Ruta, Viaje } from '../../types';

export interface PropiedadesPantallaAdmin {
  navigation: any;
}

export default function AdminDashboardScreen({ navigation }: PropiedadesPantallaAdmin) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  // KPIs
  const [ingresoTotal, setIngresoTotal] = useState<number>(0);
  const [egresoTotal, setEgresoTotal] = useState<number>(0);
  const [cantidadBoletos, setCantidadBoletos] = useState<number>(0);
  const [cantidadEncomiendas, setCantidadEncomiendas] = useState<number>(0);

  // Contadores
  const [cantidadUsuarios, setCantidadUsuarios] = useState<number>(0);
  const [cantidadVehiculos, setCantidadVehiculos] = useState<number>(0);
  const [cantidadRutas, setCantidadRutas] = useState<number>(0);
  const [cantidadViajes, setCantidadViajes] = useState<number>(0);

  // Listas
  const [alertas, setAlertas] = useState<any[]>([]);

  // Estados CRUD
  const [mostrarModalGestion, setMostrarModalGestion] = useState<boolean>(false);
  const [tipoGestion, setTipoGestion] = useState<'usuarios' | 'vehiculos' | 'rutas' | 'viajes'>('usuarios');
  const [listaGestion, setListaGestion] = useState<any[]>([]);
  const [mostrarFormularioAgregar, setMostrarFormularioAgregar] = useState<boolean>(false);

  // Campos Formulario - Usuarios
  const [nuevoNombreUsuario, setNuevoNombreUsuario] = useState<string>('');
  const [nuevaContrasena, setNuevaContrasena] = useState<string>('');
  const [nuevoNombreCompleto, setNuevoNombreCompleto] = useState<string>('');
  const [nuevoCI, setNuevoCI] = useState<string>('');
  const [nuevoTelefono, setNuevoTelefono] = useState<string>('');
  const [nuevoRol, setNuevoRol] = useState<string>('SECRETARIA');
  const [oficinaId, setOficinaId] = useState<number>(1);

  // Campos Formulario - Vehículos
  const [nuevaPlaca, setNuevaPlaca] = useState<string>('');
  const [nuevoModelo, setNuevoModelo] = useState<string>('');
  const [nuevaGestion, setNuevaGestion] = useState<string>('');
  const [nuevaCapacidad, setNuevaCapacidad] = useState<string>('18');
  const [nuevoPropietarioId, setNuevoPropietarioId] = useState<string>('');

  // Campos Formulario - Rutas
  const [nuevoNombreRuta, setNuevoNombreRuta] = useState<string>('');
  const [nuevoOrigen, setNuevoOrigen] = useState<string>('');
  const [nuevoDestino, setNuevoDestino] = useState<string>('');
  const [nuevaDuracion, setNuevaDuracion] = useState<string>('180');

  // Campos Formulario - Viajes
  const [nuevoViajeRutaId, setNuevoViajeRutaId] = useState<string>('');
  const [nuevoViajeVehiculoId, setNuevoViajeVehiculoId] = useState<string>('');
  const [nuevoViajeChoferId, setNuevoViajeChoferId] = useState<string>('');
  const [nuevoViajeHora, setNuevoViajeHora] = useState<string>('14:00');

  useEffect(() => {
    cargarDatosPanel();
  }, []);

  const cargarDatosPanel = async () => {
    setCargando(true);
    try {
      const usuario = await AuthService.getCurrentUser();
      setUsuarioActual(usuario);

      await Promise.all([
        cargarFinanzas(),
        cargarBoletos(),
        cargarEncomiendas(),
        cargarAlertas(),
        cargarContadoresSistema()
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const cargarFinanzas = async () => {
    // Ingresos del día
    const { data: ingresos } = await supabase
      .from('finanzas')
      .select('monto')
      .eq('tipo', 'INGRESO');
    
    if (ingresos) {
      const total = ingresos.reduce((suma, f) => suma + parseFloat(f.monto), 0);
      setIngresoTotal(total);
    }

    // Egresos del día
    const { data: egresos } = await supabase
      .from('finanzas')
      .select('monto')
      .eq('tipo', 'EGRESO');
    
    if (egresos) {
      const total = egresos.reduce((suma, f) => suma + parseFloat(f.monto), 0);
      setEgresoTotal(total);
    }
  };

  const cargarBoletos = async () => {
    const { count } = await supabase
      .from('boletos')
      .select('*', { count: 'exact', head: true });
    setCantidadBoletos(count || 0);
  };

  const cargarEncomiendas = async () => {
    const { count } = await supabase
      .from('encomiendas')
      .select('*', { count: 'exact', head: true });
    setCantidadEncomiendas(count || 0);
  };

  const cargarAlertas = async () => {
    const { data } = await supabase
      .from('alertas')
      .select(`
        *,
        chofer:usuarios!alertas_chofer_id_fkey(nombre_completo),
        vehiculo:vehiculos!alertas_vehiculo_id_fkey(placa)
      `)
      .in('estado', ['ABIERTO', 'EN_PROCESO'])
      .order('creado_en', { ascending: false });
    
    if (data) setAlertas(data);
  };

  const cargarContadoresSistema = async () => {
    const { count: usuarios } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
    const { count: vehiculos } = await supabase.from('vehiculos').select('*', { count: 'exact', head: true });
    const { count: rutas } = await supabase.from('rutas').select('*', { count: 'exact', head: true });
    const { count: viajes } = await supabase.from('viajes').select('*', { count: 'exact', head: true });

    setCantidadUsuarios(usuarios || 0);
    setCantidadVehiculos(vehiculos || 0);
    setCantidadRutas(rutas || 0);
    setCantidadViajes(viajes || 0);
  };

  const resolverAlerta = async (alertaId: number) => {
    const { error } = await supabase
      .from('alertas')
      .update({ estado: 'RESUELTO', resuelto_en: new Date().toISOString() })
      .eq('id', alertaId);
    
    if (!error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cargarAlertas();
    }
  };

  const manejarCierreSesion = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  const formatearDinero = (monto: number) => {
    return `Bs. ${monto.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const manejarRefresco = async () => {
    setRefrescando(true);
    await cargarDatosPanel();
    setRefrescando(false);
  };

  // CRUD helpers
  const abrirModalGestion = async (tipo: 'usuarios' | 'vehiculos' | 'rutas' | 'viajes') => {
    setTipoGestion(tipo);
    setMostrarFormularioAgregar(false);
    try {
      const { data } = await supabase.from(tipo).select('*').order('id', { ascending: false });
      if (data) setListaGestion(data);
      setMostrarModalGestion(true);
    } catch (e: any) {
      console.error(e);
    }
  };

  const agregarUsuario = async () => {
    if (!nuevoNombreUsuario || !nuevaContrasena || !nuevoNombreCompleto) {
      return;
    }
    const { error } = await supabase.from('usuarios').insert({
      nombre_usuario: nuevoNombreUsuario,
      contrasena: nuevaContrasena,
      nombre_completo: nuevoNombreCompleto,
      ci: nuevoCI,
      telefono: nuevoTelefono,
      rol: nuevoRol,
      oficina_id: nuevoRol === 'SECRETARIA' ? oficinaId : null,
      activo: true
    });

    if (!error) {
      setNuevoNombreUsuario('');
      setNuevaContrasena('');
      setNuevoNombreCompleto('');
      setNuevoCI('');
      setNuevoTelefono('');
      setMostrarFormularioAgregar(false);
      abrirModalGestion('usuarios');
      cargarContadoresSistema();
    }
  };

  const borrarUsuario = async (id: number) => {
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (!error) {
      abrirModalGestion('usuarios');
      cargarContadoresSistema();
    }
  };

  const agregarVehiculo = async () => {
    if (!nuevaPlaca || !nuevaCapacidad) {
      return;
    }
    const { error } = await supabase.from('vehiculos').insert({
      placa: nuevaPlaca,
      modelo: nuevoModelo,
      gestion: parseInt(nuevaGestion) || 2020,
      capacidad: parseInt(nuevaCapacidad),
      propietario_id: parseInt(nuevoPropietarioId) || null,
      estado: 'ACTIVO'
    });

    if (!error) {
      setNuevaPlaca('');
      setNuevoModelo('');
      setNuevaGestion('');
      setNuevaCapacidad('18');
      setNuevoPropietarioId('');
      setMostrarFormularioAgregar(false);
      abrirModalGestion('vehiculos');
      cargarContadoresSistema();
    }
  };

  const borrarVehiculo = async (id: number) => {
    const { error } = await supabase.from('vehiculos').delete().eq('id', id);
    if (!error) {
      abrirModalGestion('vehiculos');
      cargarContadoresSistema();
    }
  };

  const agregarRuta = async () => {
    if (!nuevoNombreRuta || !nuevoOrigen || !nuevoDestino) {
      return;
    }
    const { error } = await supabase.from('rutas').insert({
      nombre: nuevoNombreRuta,
      origen: nuevoOrigen,
      destino: nuevoDestino,
      minutos_estimados: parseInt(nuevaDuracion) || 180
    });

    if (!error) {
      setNuevoNombreRuta('');
      setNuevoOrigen('');
      setNuevoDestino('');
      setNuevaDuracion('180');
      setMostrarFormularioAgregar(false);
      abrirModalGestion('rutas');
      cargarContadoresSistema();
    }
  };

  const borrarRuta = async (id: number) => {
    const { error } = await supabase.from('rutas').delete().eq('id', id);
    if (!error) {
      abrirModalGestion('rutas');
      cargarContadoresSistema();
    }
  };

  const agregarViaje = async () => {
    if (!nuevoViajeRutaId || !nuevoViajeVehiculoId || !nuevoViajeChoferId) {
      return;
    }
    const { error } = await supabase.from('viajes').insert({
      ruta_id: parseInt(nuevoViajeRutaId),
      vehiculo_id: parseInt(nuevoViajeVehiculoId),
      chofer_id: parseInt(nuevoViajeChoferId),
      hora_salida: nuevoViajeHora,
      estado: 'PROGRAMADO'
    });

    if (!error) {
      setNuevoViajeRutaId('');
      setNuevoViajeVehiculoId('');
      setNuevoViajeChoferId('');
      setNuevoViajeHora('14:00');
      setMostrarFormularioAgregar(false);
      abrirModalGestion('viajes');
      cargarContadoresSistema();
    }
  };

  const borrarViaje = async (id: number) => {
    const { error } = await supabase.from('viajes').delete().eq('id', id);
    if (!error) {
      abrirModalGestion('viajes');
      cargarContadoresSistema();
    }
  };

  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.header}>
        <View>
          <Text style={estilos.headerTitle}>Panel de Control</Text>
          <Text style={estilos.headerSubtitle}>
            {usuarioActual ? usuarioActual.nombre_completo : 'Administrador'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AnimatedPressable style={estilos.iconButton} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable style={estilos.iconButton} onPress={manejarRefresco}>
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
          <RefreshControl refreshing={refrescando} onRefresh={manejarRefresco} colors={[colors.primary]} />
        }
      >
        <Text style={estilos.sectionTitle}>Resumen Financiero Global</Text>
        <View style={estilos.kpiContainer}>
          <View style={estilos.kpiCard}>
            <Text style={estilos.kpiLabel}>Ingresos Totales</Text>
            <Text style={estilos.kpiValue}>{formatearDinero(ingresoTotal)}</Text>
          </View>
          <View style={estilos.kpiCard}>
            <Text style={estilos.kpiLabel}>Egresos Globales</Text>
            <Text style={[estilos.kpiValue, { color: colors.danger }]}>
              - {formatearDinero(egresoTotal)}
            </Text>
          </View>
        </View>

        <View style={[estilos.kpiCard, { alignItems: 'center', marginBottom: 24 }]}>
          <Text style={estilos.kpiLabel}>Utilidad Neta Global</Text>
          <Text style={[estilos.kpiValue, { color: ingresoTotal - egresoTotal >= 0 ? colors.success : colors.danger, fontSize: 32 }]}>
            {formatearDinero(ingresoTotal - egresoTotal)}
          </Text>
        </View>

        <Text style={estilos.sectionTitle}>Módulos de Gestión</Text>
        <View style={estilos.grid}>
          <AnimatedPressable style={estilos.gridCard} onPress={() => abrirModalGestion('usuarios')}>
            <Ionicons name="people-outline" size={32} color={colors.primary} />
            <Text style={estilos.gridTitle}>Usuarios</Text>
            <Text style={estilos.gridCount}>{cantidadUsuarios} Registros</Text>
          </AnimatedPressable>

          <AnimatedPressable style={estilos.gridCard} onPress={() => abrirModalGestion('vehiculos')}>
            <Ionicons name="bus-outline" size={32} color={colors.primary} />
            <Text style={estilos.gridTitle}>Flota (Vehículos)</Text>
            <Text style={estilos.gridCount}>{cantidadVehiculos} Unidades</Text>
          </AnimatedPressable>

          <AnimatedPressable style={estilos.gridCard} onPress={() => abrirModalGestion('rutas')}>
            <Ionicons name="map-outline" size={32} color={colors.primary} />
            <Text style={estilos.gridTitle}>Rutas y Precios</Text>
            <Text style={estilos.gridCount}>{cantidadRutas} Rutas</Text>
          </AnimatedPressable>

          <AnimatedPressable style={estilos.gridCard} onPress={() => abrirModalGestion('viajes')}>
            <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            <Text style={estilos.gridTitle}>Viajes del Día</Text>
            <Text style={estilos.gridCount}>{cantidadViajes} Salidas</Text>
          </AnimatedPressable>
        </View>

        <Text style={[estilos.sectionTitle, { marginTop: 24 }]}>Alertas e Incidentes en Ruta</Text>
        {alertas.length === 0 ? (
          <View style={estilos.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
            <Text style={estilos.emptyText}>No hay incidentes activos en las rutas hoy</Text>
          </View>
        ) : (
          alertas.map((alertaItem) => (
            <View key={alertaItem.id} style={estilos.alertCard}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.alertTitle}>
                  🚨 Alerta: {alertaItem.tipo_alerta === 'BLOQUEO' ? 'Bloqueo' : alertaItem.tipo_alerta}
                </Text>
                <Text style={estilos.alertDesc}>{alertaItem.descripcion}</Text>
                <Text style={estilos.alertMeta}>
                  Vehículo: {alertaItem.vehiculo?.placa} | Reporta: {alertaItem.chofer?.nombre_completo}
                </Text>
              </View>
              <AnimatedPressable 
                style={estilos.resolveBtn}
                onPress={() => resolverAlerta(alertaItem.id)}
              >
                <Text style={estilos.resolveBtnText}>Resolver</Text>
              </AnimatedPressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* CRUD MODAL */}
      <Modal visible={mostrarModalGestion} animationType="slide" onRequestClose={() => setMostrarModalGestion(false)}>
        <SafeAreaView style={estilos.modalContainer}>
          <View style={estilos.modalHeader}>
            <Text style={estilos.modalTitle}>
              Gestión: {tipoGestion === 'usuarios' ? 'Usuarios' :
                       tipoGestion === 'vehiculos' ? 'Vehículos' :
                       tipoGestion === 'rutas' ? 'Rutas' : 'Viajes'}
            </Text>
            <AnimatedPressable onPress={() => setMostrarModalGestion(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={28} color={colors.text} />
            </AnimatedPressable>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            <AnimatedPressable 
              style={[estilos.addBtn, { marginBottom: 16 }]} 
              onPress={() => setMostrarFormularioAgregar(!mostrarFormularioAgregar)}
            >
              <Text style={estilos.addBtnText}>{mostrarFormularioAgregar ? 'Cerrar Formulario' : 'Agregar Nuevo Registro'}</Text>
            </AnimatedPressable>

            {mostrarFormularioAgregar && (
              <View style={[estilos.card, { marginBottom: 20 }]}>
                <Text style={estilos.sectionTitle}>Nuevo Registro</Text>

                {tipoGestion === 'usuarios' && (
                  <View>
                    <TextInput style={estilos.modalInput} placeholder="Usuario (Login)" value={nuevoNombreUsuario} onChangeText={setNuevoNombreUsuario} />
                    <TextInput style={estilos.modalInput} placeholder="Contraseña" value={nuevaContrasena} onChangeText={setNuevaContrasena} secureTextEntry />
                    <TextInput style={estilos.modalInput} placeholder="Nombre Completo" value={nuevoNombreCompleto} onChangeText={setNuevoNombreCompleto} />
                    <TextInput style={estilos.modalInput} placeholder="CI" value={nuevoCI} onChangeText={setNuevoCI} />
                    <TextInput style={estilos.modalInput} placeholder="Teléfono" value={nuevoTelefono} onChangeText={setNuevoTelefono} />
                    
                    <Text style={[estilos.sectionTitle, { fontSize: 14, marginBottom: 8, marginTop: 4 }]}>Rol de Usuario</Text>
                    <View style={{ marginBottom: 16 }}>
                      <SegmentedControl
                        segments={['Secretaria', 'Chofer', 'Socio']}
                        selectedIndex={['SECRETARIA', 'CHOFER', 'SOCIO'].indexOf(nuevoRol) === -1 ? 0 : ['SECRETARIA', 'CHOFER', 'SOCIO'].indexOf(nuevoRol)}
                        onChange={(index) => {
                          const rolesMapeados = ['SECRETARIA', 'CHOFER', 'SOCIO'];
                          setNuevoRol(rolesMapeados[index]);
                        }}
                      />
                    </View>

                    {nuevoRol === 'SECRETARIA' && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={[estilos.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Oficina Asignada</Text>
                        <SegmentedControl
                          segments={['Central Uyuni', 'San Cristóbal']}
                          selectedIndex={oficinaId === 1 ? 0 : 1}
                          onChange={(index) => {
                            setOficinaId(index === 0 ? 1 : 2);
                          }}
                        />
                      </View>
                    )}

                    <AnimatedPressable style={estilos.submitBtn} onPress={agregarUsuario}>
                      <Text style={estilos.submitBtnText}>Guardar Usuario</Text>
                    </AnimatedPressable>
                  </View>
                )}

                {tipoGestion === 'vehiculos' && (
                  <View>
                    <TextInput style={estilos.modalInput} placeholder="Placa (ej: 2314-HBG)" value={nuevaPlaca} onChangeText={setNuevaPlaca} />
                    <TextInput style={estilos.modalInput} placeholder="Modelo (ej: Toyota HiAce)" value={nuevoModelo} onChangeText={setNuevoModelo} />
                    <TextInput style={estilos.modalInput} placeholder="Gestión (ej: 2020)" value={nuevaGestion} onChangeText={setNuevaGestion} keyboardType="numeric" />
                    <TextInput style={estilos.modalInput} placeholder="Capacidad (Asientos)" value={nuevaCapacidad} onChangeText={setNuevaCapacidad} keyboardType="numeric" />
                    <TextInput style={estilos.modalInput} placeholder="ID Socio Propietario" value={nuevoPropietarioId} onChangeText={setNuevoPropietarioId} keyboardType="numeric" />
                    <AnimatedPressable style={estilos.submitBtn} onPress={agregarVehiculo}>
                      <Text style={estilos.submitBtnText}>Guardar Vehículo</Text>
                    </AnimatedPressable>
                  </View>
                )}

                {tipoGestion === 'rutas' && (
                  <View>
                    <TextInput style={estilos.modalInput} placeholder="Nombre Ruta (ej: Uyuni - Potosi)" value={nuevoNombreRuta} onChangeText={setNuevoNombreRuta} />
                    <TextInput style={estilos.modalInput} placeholder="Origen (ej: Uyuni)" value={nuevoOrigen} onChangeText={setNuevoOrigen} />
                    <TextInput style={estilos.modalInput} placeholder="Destino (ej: Potosi)" value={nuevoDestino} onChangeText={setNuevoDestino} />
                    <TextInput style={estilos.modalInput} placeholder="Duración Estimada (Minutos)" value={nuevaDuracion} onChangeText={setNuevaDuracion} keyboardType="numeric" />
                    <AnimatedPressable style={estilos.submitBtn} onPress={agregarRuta}>
                      <Text style={estilos.submitBtnText}>Guardar Ruta</Text>
                    </AnimatedPressable>
                  </View>
                )}

                {tipoGestion === 'viajes' && (
                  <View>
                    <TextInput style={estilos.modalInput} placeholder="ID de la Ruta" value={nuevoViajeRutaId} onChangeText={setNuevoViajeRutaId} keyboardType="numeric" />
                    <TextInput style={estilos.modalInput} placeholder="ID del Vehículo" value={nuevoViajeVehiculoId} onChangeText={setNuevoViajeVehiculoId} keyboardType="numeric" />
                    <TextInput style={estilos.modalInput} placeholder="ID del Chofer" value={nuevoViajeChoferId} onChangeText={setNuevoViajeChoferId} keyboardType="numeric" />
                    <TextInput style={estilos.modalInput} placeholder="Hora Salida (ej: 14:30)" value={nuevoViajeHora} onChangeText={setNuevoViajeHora} />
                    <AnimatedPressable style={estilos.submitBtn} onPress={agregarViaje}>
                      <Text style={estilos.submitBtnText}>Programar Viaje</Text>
                    </AnimatedPressable>
                  </View>
                )}
              </View>
            )}

            <Text style={[estilos.sectionTitle, { marginBottom: 12 }]}>Registros Existentes</Text>
            {listaGestion.map((item) => (
              <View key={item.id} style={estilos.alertCard}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.alertTitle}>ID: #{item.id}</Text>
                  {tipoGestion === 'usuarios' && (
                    <Text style={estilos.alertDesc}>{item.nombre_completo} ({item.rol}) - Log: {item.nombre_usuario}</Text>
                  )}
                  {tipoGestion === 'vehiculos' && (
                    <Text style={estilos.alertDesc}>{item.placa} - {item.modelo} ({item.capacidad} as.)</Text>
                  )}
                  {tipoGestion === 'rutas' && (
                    <Text style={estilos.alertDesc}>{item.nombre} - {item.minutos_estimados} min.</Text>
                  )}
                  {tipoGestion === 'viajes' && (
                    <Text style={estilos.alertDesc}>Ruta ID: {item.ruta_id} - Salida: {item.hora_salida} - {item.estado}</Text>
                  )}
                </View>
                <AnimatedPressable 
                  style={[estilos.resolveBtn, { backgroundColor: colors.danger }]}
                  onPress={() => {
                    if (tipoGestion === 'usuarios') borrarUsuario(item.id);
                    if (tipoGestion === 'vehiculos') borrarVehiculo(item.id);
                    if (tipoGestion === 'rutas') borrarRuta(item.id);
                    if (tipoGestion === 'viajes') borrarViaje(item.id);
                  }}
                >
                  <Text style={estilos.resolveBtnText}>Borrar</Text>
                </AnimatedPressable>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  sectionTitle: { ...typography.title3, color: colors.text, marginBottom: 12 },
  kpiContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: colors.card, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  kpiLabel: { ...typography.footnote, color: colors.textSecondary, marginBottom: 6 },
  kpiValue: { ...typography.title2, color: colors.success },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { backgroundColor: colors.card, width: '48%', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  gridTitle: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: colors.text, marginTop: 10 },
  gridCount: { ...typography.caption1, color: colors.textSecondary, marginTop: 4 },
  emptyCard: { backgroundColor: colors.card, padding: 32, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  emptyText: { ...typography.subhead, color: colors.textSecondary, marginTop: 8 },
  alertCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  alertTitle: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: colors.text },
  alertDesc: { ...typography.caption1, color: colors.textSecondary, marginTop: 3 },
  alertMeta: { ...typography.caption2, color: colors.textTertiary, marginTop: 3 },
  resolveBtn: { backgroundColor: colors.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  resolveBtnText: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.card, borderBottomWidth: 0.5, borderBottomColor: colors.separator },
  modalTitle: { ...typography.title2, color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  addBtnText: { ...typography.headline, color: '#FFF' },
  card: { backgroundColor: colors.card, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  modalInput: { ...typography.body, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, color: colors.text },
  submitBtn: { backgroundColor: colors.success, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  submitBtnText: { ...typography.headline, color: '#FFF' },
});

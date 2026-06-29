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
  const [nuevaGestion, setNuevaGestion] = useState<string>('');
  const [listaSocios, setListaSocios] = useState<any[]>([]);
  const [modeloSeleccionado, setModeloSeleccionado] = useState<string>('Toyota HiAce');
  const [modeloManual, setModeloManual] = useState<string>('');
  const [capacidadSeleccionada, setCapacidadSeleccionada] = useState<string>('18');
  const [capacidadManual, setCapacidadManual] = useState<string>('');
  const [propietarioSocioId, setPropietarioSocioId] = useState<string>('');

  // Campos Formulario - Rutas
  const [nuevoNombreRuta, setNuevoNombreRuta] = useState<string>('');
  const [origenSeleccionado, setOrigenSeleccionado] = useState<string>('Uyuni');
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<string>('San Cristóbal');
  const [origenManual, setOrigenManual] = useState<string>('');
  const [destinoManual, setDestinoManual] = useState<string>('');
  const [nuevoPrecio, setNuevoPrecio] = useState<string>('35');

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

      if (tipo === 'vehiculos') {
        const { data: socios } = await supabase
          .from('usuarios')
          .select('id, nombre_completo')
          .eq('rol', 'SOCIO')
          .eq('activo', true)
          .order('nombre_completo', { ascending: true });
        if (socios) setListaSocios(socios);
      }

      setMostrarModalGestion(true);
    } catch (e: any) {
      console.error(e);
    }
  };

  const agregarUsuario = async () => {
    if (!nuevoNombreUsuario || !nuevaContrasena || !nuevoNombreCompleto) {
      alert('Por favor complete los campos obligatorios: Usuario, Contraseña y Nombre.');
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

    if (error) {
      alert('Error guardando usuario: ' + error.message);
    } else {
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
    if (error) {
      alert('Error borrando usuario: ' + error.message);
    } else {
      abrirModalGestion('usuarios');
      cargarContadoresSistema();
    }
  };

  const agregarVehiculo = async () => {
    const modeloFinal = modeloSeleccionado === 'Otro' ? modeloManual : modeloSeleccionado;
    const capacidadFinal = capacidadSeleccionada === 'Otro' ? parseInt(capacidadManual) : parseInt(capacidadSeleccionada);
    const propietarioIdFinal = propietarioSocioId ? parseInt(propietarioSocioId) : null;

    if (!nuevaPlaca || !modeloFinal || !capacidadFinal) {
      alert('Por favor complete los campos obligatorios: Placa, Modelo y Capacidad.');
      return;
    }
    const { error } = await supabase.from('vehiculos').insert({
      placa: nuevaPlaca,
      modelo: modeloFinal,
      gestion: parseInt(nuevaGestion) || 2020,
      capacidad: capacidadFinal,
      propietario_id: propietarioIdFinal,
      estado: 'ACTIVO'
    });

    if (error) {
      alert('Error guardando vehículo: ' + error.message);
    } else {
      setNuevaPlaca('');
      setModeloSeleccionado('Toyota HiAce');
      setModeloManual('');
      setCapacidadSeleccionada('18');
      setCapacidadManual('');
      setPropietarioSocioId('');
      setNuevaGestion('');
      setMostrarFormularioAgregar(false);
      abrirModalGestion('vehiculos');
      cargarContadoresSistema();
    }
  };

  const borrarVehiculo = async (id: number) => {
    const { error } = await supabase.from('vehiculos').delete().eq('id', id);
    if (error) {
      alert('Error borrando vehículo: ' + error.message);
    } else {
      abrirModalGestion('vehiculos');
      cargarContadoresSistema();
    }
  };

  const agregarRuta = async () => {
    const origenFinal = origenSeleccionado === 'Otro' ? origenManual : origenSeleccionado;
    const destinoFinal = destinoSeleccionado === 'Otro' ? destinoManual : destinoSeleccionado;
    const nombreRutaFinal = `${origenFinal} - ${destinoFinal}`;

    if (!origenFinal || !destinoFinal) {
      alert('Por favor complete los campos obligatorios: Origen y Destino.');
      return;
    }

    const { error } = await supabase.from('rutas').insert({
      nombre: nombreRutaFinal,
      origen: origenFinal,
      destino: destinoFinal,
      precio: parseInt(nuevoPrecio) || 0
    });

    if (error) {
      alert('Error guardando ruta: ' + error.message);
    } else {
      setNuevoNombreRuta('');
      setOrigenSeleccionado('Uyuni');
      setDestinoSeleccionado('San Cristóbal');
      setOrigenManual('');
      setDestinoManual('');
      setNuevoPrecio('35');
      setMostrarFormularioAgregar(false);
      abrirModalGestion('rutas');
      cargarContadoresSistema();
    }
  };

  const borrarRuta = async (id: number) => {
    const { error } = await supabase.from('rutas').delete().eq('id', id);
    if (error) {
      alert('Error borrando ruta: ' + error.message);
    } else {
      abrirModalGestion('rutas');
      cargarContadoresSistema();
    }
  };

  const agregarViaje = async () => {
    if (!nuevoViajeRutaId || !nuevoViajeVehiculoId || !nuevoViajeChoferId) {
      alert('Por favor complete los campos obligatorios: ID de Ruta, ID de Vehículo e ID de Chofer.');
      return;
    }
    const { error } = await supabase.from('viajes').insert({
      ruta_id: parseInt(nuevoViajeRutaId),
      vehiculo_id: parseInt(nuevoViajeVehiculoId),
      chofer_id: parseInt(nuevoViajeChoferId),
      hora_salida: nuevoViajeHora,
      estado: 'PROGRAMADO'
    });

    if (error) {
      alert('Error guardando viaje: ' + error.message);
    } else {
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
    if (error) {
      alert('Error borrando viaje: ' + error.message);
    } else {
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
                          segments={['Uyuni', 'San Cristóbal']}
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
                    
                    <Text style={[estilos.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Modelo de Vehículo</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {['Toyota HiAce', 'Toyota Noah', 'Nissan Caravan', 'Mitsubishi L300', 'Otro'].map((mod) => (
                        <AnimatedPressable
                          key={`modelo-${mod}`}
                          style={[
                            estilos.chip,
                            modeloSeleccionado === mod && estilos.chipActive
                          ]}
                          onPress={() => setModeloSeleccionado(mod)}
                        >
                          <Text style={[estilos.chipText, modeloSeleccionado === mod && estilos.chipTextActive]}>{mod}</Text>
                        </AnimatedPressable>
                      ))}
                    </ScrollView>
                    {modeloSeleccionado === 'Otro' && (
                      <TextInput
                        style={estilos.modalInput}
                        placeholder="Escriba el modelo a mano"
                        value={modeloManual}
                        onChangeText={setModeloManual}
                      />
                    )}

                    <TextInput style={estilos.modalInput} placeholder="Gestión (Año - ej: 2020)" value={nuevaGestion} onChangeText={setNuevaGestion} keyboardType="numeric" />
                    
                    <Text style={[estilos.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Capacidad (Asientos)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {['7', '15', '18', '22', 'Otro'].map((cap) => (
                        <AnimatedPressable
                          key={`capacidad-${cap}`}
                          style={[
                            estilos.chip,
                            capacidadSeleccionada === cap && estilos.chipActive
                          ]}
                          onPress={() => setCapacidadSeleccionada(cap)}
                        >
                          <Text style={[estilos.chipText, capacidadSeleccionada === cap && estilos.chipTextActive]}>{cap}</Text>
                        </AnimatedPressable>
                      ))}
                    </ScrollView>
                    {capacidadSeleccionada === 'Otro' && (
                      <TextInput
                        style={estilos.modalInput}
                        placeholder="Escriba la capacidad a mano"
                        value={capacidadManual}
                        onChangeText={setCapacidadManual}
                        keyboardType="numeric"
                      />
                    )}

                    <Text style={[estilos.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Socio Propietario</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      <AnimatedPressable
                        style={[
                          estilos.chip,
                          propietarioSocioId === '' && estilos.chipActive
                        ]}
                        onPress={() => setPropietarioSocioId('')}
                      >
                        <Text style={[estilos.chipText, propietarioSocioId === '' && estilos.chipTextActive]}>Ninguno (Sin asignar)</Text>
                      </AnimatedPressable>
                      {listaSocios.map((socio) => (
                        <AnimatedPressable
                          key={`socio-${socio.id}`}
                          style={[
                            estilos.chip,
                            propietarioSocioId === socio.id.toString() && estilos.chipActive
                          ]}
                          onPress={() => setPropietarioSocioId(socio.id.toString())}
                        >
                          <Text style={[estilos.chipText, propietarioSocioId === socio.id.toString() && estilos.chipTextActive]}>
                            {socio.nombre_completo}
                          </Text>
                        </AnimatedPressable>
                      ))}
                    </ScrollView>

                    <AnimatedPressable style={estilos.submitBtn} onPress={agregarVehiculo}>
                      <Text style={estilos.submitBtnText}>Guardar Vehículo</Text>
                    </AnimatedPressable>
                  </View>
                )}

                {tipoGestion === 'rutas' && (
                  <View>
                    <Text style={[estilos.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Origen de la Ruta</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {['Uyuni', 'Ramaditas', 'Vila Vila', 'San Cristóbal', 'Culpina', 'Potosí'].map((loc) => (
                        <AnimatedPressable
                          key={`origen-${loc}`}
                          style={[
                            estilos.chip,
                            origenSeleccionado === loc && estilos.chipActive
                          ]}
                          onPress={() => setOrigenSeleccionado(loc)}
                        >
                          <Text style={[estilos.chipText, origenSeleccionado === loc && estilos.chipTextActive]}>{loc}</Text>
                        </AnimatedPressable>
                      ))}
                    </ScrollView>

                    <Text style={[estilos.sectionTitle, { fontSize: 14, marginBottom: 8, marginTop: 4 }]}>Destino de la Ruta</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {['Uyuni', 'Ramaditas', 'Vila Vila', 'San Cristóbal', 'Culpina', 'Potosí', 'Otro'].map((loc) => (
                        <AnimatedPressable
                          key={`destino-${loc}`}
                          style={[
                            estilos.chip,
                            destinoSeleccionado === loc && estilos.chipActive
                          ]}
                          onPress={() => setDestinoSeleccionado(loc)}
                        >
                          <Text style={[estilos.chipText, destinoSeleccionado === loc && estilos.chipTextActive]}>{loc}</Text>
                        </AnimatedPressable>
                      ))}
                    </ScrollView>
                    {destinoSeleccionado === 'Otro' && (
                      <TextInput
                        style={estilos.modalInput}
                        placeholder="Escriba el destino a mano"
                        value={destinoManual}
                        onChangeText={setDestinoManual}
                      />
                    )}

                    <View style={[estilos.modalInput, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.separator, justifyContent: 'center' }]}>
                      <Text style={{ ...typography.body, color: colors.text }}>
                        Nombre: {origenSeleccionado === 'Otro' ? (origenManual || 'Otro') : origenSeleccionado} - {destinoSeleccionado === 'Otro' ? (destinoManual || 'Otro') : destinoSeleccionado}
                      </Text>
                    </View>
                    <TextInput
                      style={estilos.modalInput}
                      placeholder="Costo (Bs. - ej: 35)"
                      value={nuevoPrecio}
                      onChangeText={(val) => setNuevoPrecio(val.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
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
                    <Text style={estilos.alertDesc}>{item.nombre} - Costo: {parseInt(item.precio)} Bs.</Text>
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
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator, justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption1, color: colors.textSecondary, fontFamily: typography.fontFamilyMedium },
  chipTextActive: { color: '#FFF', fontFamily: typography.fontFamilySemiBold },
});

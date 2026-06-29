import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import SeatMap from '../../components/SeatMap';
import SegmentedControl from '../../components/SegmentedControl';
import AnimatedPressable from '../../components/AnimatedPressable';
import Toast from '../../components/Toast';
import { Usuario, Viaje, Tramo, Boleto, CajaDiaria } from '../../types';

export interface PropiedadesPantallaBoleteria {
  navigation: any;
}

export default function SecretaryPosScreen({ navigation }: PropiedadesPantallaBoleteria) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [indicePestanaActiva, setIndicePestanaActiva] = useState<number>(0);
  const [cargando, setCargando] = useState<boolean>(false);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Datos comunes
  const [listaViajes, setListaViajes] = useState<any[]>([]);
  const [viajeSeleccionadoId, setViajeSeleccionadoId] = useState<string | null>(null);

  // TAB 1: Pasajes
  const [asientosSeleccionados, setAsientosSeleccionados] = useState<number[]>([]);
  const [nombrePasajero, setNombrePasajero] = useState<string>('');
  const [ciPasajero, setCiPasajero] = useState<string>('');
  const [tramoOrigen, setTramoOrigen] = useState<string>('Uyuni');
  const [tramoDestino, setTramoDestino] = useState<string>('San Cristóbal');

  const [listaRutasTarifas, setListaRutasTarifas] = useState<any[]>([]);
  const [precioBoleto, setPrecioBoleto] = useState<number>(35);
  const [destinoSeleccionadoId, setDestinoSeleccionadoId] = useState<string | null>(null);
  const [asientosOcupados, setAsientosOcupados] = useState<number[]>([]);
  const [listaBoletosViaje, setListaBoletosViaje] = useState<any[]>([]);
  const [idBoletoConfirmar, setIdBoletoConfirmar] = useState<number | null>(null);
  const [asientoAccionMenu, setAsientoAccionMenu] = useState<number | null>(null);

  // Formulario Programar Viaje (Secretaria)
  const [mostrarModalProgramarViaje, setMostrarModalProgramarViaje] = useState<boolean>(false);
  const [viajeNuevoRutaId, setViajeNuevoRutaId] = useState<string>('');
  const [viajeNuevoVehiculoId, setViajeNuevoVehiculoId] = useState<string>('');
  const [viajeNuevoChoferId, setViajeNuevoChoferId] = useState<string>('');
  const [viajeNuevoHoraSeleccionada, setViajeNuevoHoraSeleccionada] = useState<string>(new Date().getHours().toString().padStart(2, '0'));
  const [viajeNuevoMinutoSeleccionado, setViajeNuevoMinutoSeleccionado] = useState<string>((Math.round(new Date().getMinutes() / 5) * 5 % 60).toString().padStart(2, '0'));
  const [viajeNuevoFecha, setViajeNuevoFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [listaVehiculos, setListaVehiculos] = useState<any[]>([]);
  const [listaChoferes, setListaChoferes] = useState<any[]>([]);

  const [mostrarReciboModal, setMostrarReciboModal] = useState<boolean>(false);
  const [ultimoBoletoVendido, setUltimoBoletoVendido] = useState<any>(null);

  // TAB 2: Encomiendas
  const [nombreRemitente, setNombreRemitente] = useState<string>('');
  const [ciRemitente, setCiRemitente] = useState<string>('');
  const [telefonoRemitente, setTelefonoRemitente] = useState<string>('');
  const [nombreDestinatario, setNombreDestinatario] = useState<string>('');
  const [ciDestinatario, setCiDestinatario] = useState<string>('');
  const [telefonoDestinatario, setTelefonoDestinatario] = useState<string>('');
  const [descripcionEncomienda, setDescripcionEncomienda] = useState<string>('');
  const [pesoEncomienda, setPesoEncomienda] = useState<string>('');
  const [precioEncomienda, setPrecioEncomienda] = useState<string>('');
  const [listaEncomiendas, setListaEncomiendas] = useState<any[]>([]);

  // TAB 3: Caja y Gastos
  const [conceptoGasto, setConceptoGasto] = useState<string>('');
  const [montoGasto, setMontoGasto] = useState<string>('');
  const [misVentasHoy, setMisVentasHoy] = useState<any[]>([]);
  const [ingresosOficina, setIngresosOficina] = useState<number>(0);
  const [egresosOficina, setEgresosOficina] = useState<number>(0);

  // Cuentas Corporativas
  const [listaCuentasCorp, setListaCuentasCorp] = useState<any[]>([]);
  const [corpSeleccionadaId, setCorpSeleccionadaId] = useState<string | null>(null);
  const [esCorporativo, setEsCorporativo] = useState<boolean>(false);

  // Apertura y Cierre de Caja
  const [cajaDiaria, setCajaDiaria] = useState<CajaDiaria | null>(null);
  const [montoInicialCaja, setMontoInicialCaja] = useState<string>('100.00');
  const [mostrarModalAbrirCaja, setMostrarModalAbrirCaja] = useState<boolean>(false);
  const [mostrarModalCerrarCaja, setMostrarModalCerrarCaja] = useState<boolean>(false);
  const [montoFinalCajaInput, setMontoFinalCajaInput] = useState<string>('0.00');

  const nombresPestanas = ['Pasajes', 'Encomiendas', 'Salidas', 'Caja'];

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      const usuario = await AuthService.getCurrentUser();
      setUsuarioActual(usuario);

      if (usuario) {
        const { data: registroActivo } = await supabase
          .from('cajas_diarias')
          .select('*')
          .eq('abierta_por', usuario.id)
          .eq('estado', 'ABIERTO')
          .limit(1)
          .maybeSingle();

        if (registroActivo) {
          setCajaDiaria(registroActivo as CajaDiaria);
        } else {
          setMostrarModalAbrirCaja(true);
        }
      }

      const { data: viajes } = await supabase
        .from('viajes')
        .select('*, ruta:rutas(nombre, origen, destino), vehiculo:vehiculos(placa, modelo), chofer:usuarios(nombre_completo)')
        .order('hora_salida', { ascending: true });

      if (viajes && viajes.length > 0) {
        setListaViajes(viajes);
        setViajeSeleccionadoId(viajes[0].id.toString());
      }

      const origenSecretaria = usuario?.oficina_id === 2 ? 'San Cristóbal' : 'Uyuni';
      setTramoOrigen(origenSecretaria);

      const { data: rutasTarifas } = await supabase
        .from('rutas')
        .select('*')
        .eq('origen', origenSecretaria)
        .order('id', { ascending: true });

      if (rutasTarifas && rutasTarifas.length > 0) {
        setListaRutasTarifas(rutasTarifas);
        const primeraTarifa = rutasTarifas[0];
        setTramoDestino(primeraTarifa.destino);
        setDestinoSeleccionadoId(primeraTarifa.id.toString());
        setPrecioBoleto(parseFloat(primeraTarifa.precio));
      }

      const { data: cuentasCorp } = await supabase
        .from('cuentas_corporativas')
        .select('*')
        .eq('activo', true);
      if (cuentasCorp) {
        setListaCuentasCorp(cuentasCorp);
        if (cuentasCorp.length > 0) setCorpSeleccionadaId(cuentasCorp[0].id.toString());
      }

      // Cargar vehículos activos
      const { data: vehiculos } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('estado', 'ACTIVO')
        .order('placa', { ascending: true });
      if (vehiculos) setListaVehiculos(vehiculos);

      // Cargar choferes activos
      const { data: choferes } = await supabase
        .from('usuarios')
        .select('id, nombre_completo')
        .eq('rol', 'CHOFER')
        .eq('activo', true)
        .order('nombre_completo', { ascending: true });
      if (choferes) setListaChoferes(choferes);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!viajeSeleccionadoId) return;
    obtenerDetallesViaje();

    const canalBoletos = supabase
      .channel(`canal_realtime_boletos_viaje_${viajeSeleccionadoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boletos', filter: `viaje_id=eq.${viajeSeleccionadoId}` }, () => { obtenerDetallesViaje(); })
      .subscribe();

    const canalViajes = supabase
      .channel('canal_realtime_viajes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'viajes' }, () => { cargarDatosIniciales(); })
      .subscribe();

    return () => {
      supabase.removeChannel(canalBoletos);
      supabase.removeChannel(canalViajes);
    };
  }, [viajeSeleccionadoId]);

  const obtenerDetallesViaje = async () => {
    if (!viajeSeleccionadoId) return;
    try {
      const { data: boletos } = await supabase
        .from('boletos')
        .select('id, numero_asiento, estado, nombre_pasajero, ci_pasajero')
        .eq('viaje_id', parseInt(viajeSeleccionadoId))
        .in('estado', ['OCUPADO', 'RESERVADO']);

      if (boletos) {
        setListaBoletosViaje(boletos);
        setAsientosOcupados(boletos.filter((b: any) => b.estado === 'OCUPADO').map((b: any) => b.numero_asiento));
      } else {
        setListaBoletosViaje([]);
        setAsientosOcupados([]);
      }

      const { data: encomiendas } = await supabase
        .from('encomiendas')
        .select('*')
        .eq('viaje_id', parseInt(viajeSeleccionadoId))
        .order('creado_en', { ascending: false });

      if (encomiendas) setListaEncomiendas(encomiendas);

      if (usuarioActual) {
        const { data: ventas } = await supabase
          .from('boletos')
          .select('*, viaje:viajes(hora_salida, ruta:rutas(nombre))')
          .eq('vendido_por', usuarioActual.id)
          .order('creado_en', { ascending: false });
        if (ventas) setMisVentasHoy(ventas);

        const { data: finanzas } = await supabase
          .from('finanzas')
          .select('*')
          .eq('usuario_id', usuarioActual.id);

        if (finanzas) {
          const inc = finanzas.filter((f: any) => f.tipo === 'INGRESO').reduce((suma, f) => suma + parseFloat(f.monto), 0);
          const exp = finanzas.filter((f: any) => f.tipo === 'EGRESO').reduce((suma, f) => suma + parseFloat(f.monto), 0);
          setIngresosOficina(inc);
          setEgresosOficina(exp);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const manejarCierreSesion = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  const manejarAperturaCaja = async () => {
    if (!montoInicialCaja) { mostrarToast('Ingrese un monto inicial', 'warning'); return; }
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('cajas_diarias')
        .insert({ abierta_por: usuarioActual?.id, monto_inicial: parseFloat(montoInicialCaja), estado: 'ABIERTO' })
        .select()
        .single();
      if (error) throw error;
      setCajaDiaria(data as CajaDiaria);
      setMostrarModalAbrirCaja(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mostrarToast('Caja abierta con éxito', 'success');
    } catch (e: any) {
      mostrarToast('Error abriendo caja: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const manejarCierreCaja = async () => {
    if (!cajaDiaria) return;
    try {
      setCargando(true);
      const { error } = await supabase
        .from('cajas_diarias')
        .update({ cerrada_en: new Date().toISOString(), monto_final: parseFloat(montoFinalCajaInput), estado: 'CERRADO' })
        .eq('id', cajaDiaria.id);
      if (error) throw error;
      setCajaDiaria(null);
      setMostrarModalCerrarCaja(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mostrarToast('Caja cerrada con éxito', 'success');
      setMostrarModalAbrirCaja(true);
    } catch (e: any) {
      mostrarToast('Error cerrando caja: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const compartirWhatsApp = () => {
    if (!ultimoBoletoVendido) return;
    const mensaje = `*SINDICATO TRANS — BOLETO DE VIAJE*\n\n` +
      `*Boleto ID:* #${ultimoBoletoVendido.id}\n` +
      `*Pasajero:* ${ultimoBoletoVendido.nombre_pasajero}\n` +
      `*C.I.:* ${ultimoBoletoVendido.ci_pasajero}\n` +
      `*Asiento:* #${ultimoBoletoVendido.numero_asiento}\n` +
      `*Ruta:* ${ultimoBoletoVendido.origen} ➔ ${ultimoBoletoVendido.destino}\n` +
      `*Fecha/Hora:* ${ultimoBoletoVendido.fecha_viaje} ${ultimoBoletoVendido.hora_salida?.substring(0, 5)}\n` +
      `*Monto:* Bs. ${parseFloat(ultimoBoletoVendido.precio_pagado).toFixed(2)}\n` +
      `*Vehículo:* ${ultimoBoletoVendido.placa}\n` +
      `*Chofer:* ${ultimoBoletoVendido.chofer}\n\n` +
      `*Verificar Boleto:* https://sindicatotrans.com/boleto/${ultimoBoletoVendido.id}`;
    mostrarToast('Enlace de WhatsApp generado', 'info');
  };

  const manejarSeleccionAsiento = (numeroAsiento: number, estado: string) => {
    if (estado === 'ocupado') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      mostrarToast(`El asiento ${numeroAsiento} ya está ocupado (vendido)`, 'warning');
      return;
    }

    if (estado === 'reservado') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setAsientoAccionMenu(numeroAsiento);
      return;
    }

    // Toggle libre/seleccionado
    setAsientosSeleccionados(prev => {
      if (prev.includes(numeroAsiento)) {
        return prev.filter(a => a !== numeroAsiento);
      } else {
        return [...prev, numeroAsiento];
      }
    });
  };

  const liberarReserva = async (numeroAsiento: number) => {
    try {
      setCargando(true);
      const boleto = listaBoletosViaje.find(b => b.numero_asiento === numeroAsiento && b.estado === 'RESERVADO');
      if (!boleto) return;

      const { error } = await supabase
        .from('boletos')
        .delete()
        .eq('id', boleto.id);

      if (error) throw error;

      mostrarToast(`Reserva del asiento ${numeroAsiento} liberada`, 'success');
      setAsientoAccionMenu(null);
      await obtenerDetallesViaje();
    } catch (e: any) {
      mostrarToast('Error al liberar reserva: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const iniciarConfirmacionReserva = (numeroAsiento: number) => {
    const boleto = listaBoletosViaje.find(b => b.numero_asiento === numeroAsiento && b.estado === 'RESERVADO');
    if (!boleto) return;

    setNombrePasajero(boleto.nombre_pasajero);
    setCiPasajero(boleto.ci_pasajero);
    setAsientosSeleccionados([numeroAsiento]);
    setIdBoletoConfirmar(boleto.id);
    setAsientoAccionMenu(null);
    mostrarToast(`Cargado asiento ${numeroAsiento} para confirmar venta`, 'info');
  };

  const manejarCompraBoleto = async (tipoBoleto: 'OCUPADO' | 'RESERVADO' = 'OCUPADO') => {
    if (asientosSeleccionados.length === 0 || !nombrePasajero || !ciPasajero || !viajeSeleccionadoId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      mostrarToast('Complete todos los campos de pasajero y asiento', 'warning');
      return;
    }

    try {
      setCargando(true);
      const viaje = listaViajes.find(t => t.id.toString() === viajeSeleccionadoId);
      const empresaCorp = esCorporativo ? listaCuentasCorp.find(c => c.id.toString() === corpSeleccionadaId) : null;

      if (idBoletoConfirmar) {
        // Confirmar reserva existente
        const { error } = await supabase
          .from('boletos')
          .update({
            nombre_pasajero: nombrePasajero,
            ci_pasajero: ciPasajero,
            ruta_destino_id: destinoSeleccionadoId ? parseInt(destinoSeleccionadoId) : null,
            precio_pagado: precioBoleto,
            estado: 'OCUPADO',
            vendido_por: usuarioActual?.id
          })
          .eq('id', idBoletoConfirmar);

        if (error) throw error;

        await supabase.from('finanzas').insert({
          viaje_id: parseInt(viajeSeleccionadoId),
          usuario_id: usuarioActual?.id,
          concepto: `Reserva Asiento ${asientosSeleccionados[0]} confirmada de venta (${nombrePasajero})`,
          monto: precioBoleto,
          tipo: 'INGRESO'
        });

        mostrarToast('Reserva vendida con éxito', 'success');
        setIdBoletoConfirmar(null);
      } else {
        // Registrar múltiples boletos
        const boletosInsertar = asientosSeleccionados.map(asiento => ({
          viaje_id: parseInt(viajeSeleccionadoId),
          numero_asiento: asiento,
          nombre_pasajero: nombrePasajero,
          ci_pasajero: ciPasajero,
          ruta_destino_id: destinoSeleccionadoId ? parseInt(destinoSeleccionadoId) : null,
          precio_pagado: precioBoleto,
          estado: tipoBoleto,
          vendido_por: usuarioActual?.id
        }));

        const { data, error } = await supabase
          .from('boletos')
          .insert(boletosInsertar)
          .select();

        if (error) throw error;

        if (tipoBoleto === 'OCUPADO') {
          const totalCosto = precioBoleto * asientosSeleccionados.length;
          await supabase.from('finanzas').insert({
            viaje_id: parseInt(viajeSeleccionadoId),
            usuario_id: usuarioActual?.id,
            concepto: esCorporativo
              ? `Venta Boletos Asientos: ${asientosSeleccionados.join(', ')} (${nombrePasajero}) - Convenio: ${empresaCorp?.nombre_empresa}`
              : `Venta Boletos Asientos: ${asientosSeleccionados.join(', ')} (${nombrePasajero})`,
            monto: totalCosto,
            tipo: 'INGRESO'
          });
        }

        if (data && data.length > 0) {
          setUltimoBoletoVendido({
            id: data[0].id,
            numero_asiento: data[0].numero_asiento,
            nombre_pasajero: nombrePasajero,
            ci_pasajero: ciPasajero,
            origen: tramoOrigen,
            destino: tramoDestino,
            precio_pagado: precioBoleto,
            fecha_viaje: viaje ? viaje.fecha_viaje : 'Hoy',
            hora_salida: viaje ? viaje.hora_salida : '14:00',
            placa: viaje?.vehiculo?.placa || '2314-HBG',
            chofer: viaje?.chofer?.nombre_completo || 'Marcos Ruiz'
          });
        }

        mostrarToast(tipoBoleto === 'RESERVADO' ? 'Reserva guardada con éxito' : 'Pasaje vendido con éxito', 'success');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (tipoBoleto === 'OCUPADO') {
        setMostrarReciboModal(true);
      }
      setAsientosSeleccionados([]);
      setNombrePasajero('');
      setCiPasajero('');
      await obtenerDetallesViaje();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      mostrarToast('Error al procesar pasaje: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const manejarProgramarViaje = async () => {
    if (!viajeNuevoRutaId || !viajeNuevoVehiculoId || !viajeNuevoChoferId || !viajeNuevoHoraSeleccionada || !viajeNuevoMinutoSeleccionado) {
      mostrarToast('Por favor complete todos los campos obligatorios.', 'warning');
      return;
    }

    try {
      setCargando(true);
      const horaSalidaFinal = `${viajeNuevoHoraSeleccionada}:${viajeNuevoMinutoSeleccionado}`;
      const { error } = await supabase.from('viajes').insert({
        ruta_id: parseInt(viajeNuevoRutaId),
        vehiculo_id: parseInt(viajeNuevoVehiculoId),
        chofer_id: parseInt(viajeNuevoChoferId),
        hora_salida: horaSalidaFinal,
        fecha_viaje: viajeNuevoFecha,
        estado: 'PROGRAMADO',
        oficina_id: usuarioActual?.oficina_id || null
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mostrarToast('Viaje programado con éxito', 'success');
      setMostrarModalProgramarViaje(false);
      setViajeNuevoRutaId('');
      setViajeNuevoVehiculoId('');
      setViajeNuevoChoferId('');
      const ahora = new Date();
      setViajeNuevoHoraSeleccionada(ahora.getHours().toString().padStart(2, '0'));
      setViajeNuevoMinutoSeleccionado((Math.round(ahora.getMinutes() / 5) * 5 % 60).toString().padStart(2, '0'));
      setViajeNuevoFecha(ahora.toISOString().split('T')[0]);
      await cargarDatosIniciales();
    } catch (e: any) {
      mostrarToast('Error programando viaje: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const registrarEncomienda = async () => {
    if (!nombreRemitente || !nombreDestinatario || !descripcionEncomienda || !precioEncomienda || !viajeSeleccionadoId) {
      mostrarToast('Complete los datos de la encomienda', 'warning');
      return;
    }

    try {
      setCargando(true);
      const sufijoUnico = Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      const codigoQRGenerado = `QR-${sufijoUnico}`;

      const { error } = await supabase.from('encomiendas').insert({
        viaje_id: parseInt(viajeSeleccionadoId),
        nombre_remitente: nombreRemitente, ci_remitente: ciRemitente, telefono_remitente: telefonoRemitente,
        nombre_destinatario: nombreDestinatario, ci_destinatario: ciDestinatario, telefono_destinatario: telefonoDestinatario,
        descripcion: descripcionEncomienda, peso_kg: pesoEncomienda ? parseFloat(pesoEncomienda) : 0,
        precio: parseFloat(precioEncomienda), estado: 'PENDIENTE', codigo_qr: codigoQRGenerado, registrado_por: usuarioActual?.id
      });

      if (error) throw error;

      await supabase.from('finanzas').insert({
        viaje_id: parseInt(viajeSeleccionadoId), usuario_id: usuarioActual?.id,
        concepto: `Envío encomienda - De ${nombreRemitente} para ${nombreDestinatario}`,
        monto: parseFloat(precioEncomienda), tipo: 'INGRESO'
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mostrarToast(`Encomienda registrada — QR: ${codigoQRGenerado}`, 'success');
      setNombreRemitente(''); setCiRemitente(''); setTelefonoRemitente('');
      setNombreDestinatario(''); setCiDestinatario(''); setTelefonoDestinatario('');
      setDescripcionEncomienda(''); setPesoEncomienda(''); setPrecioEncomienda('');
      obtenerDetallesViaje();
    } catch (e: any) {
      mostrarToast('Error al registrar encomienda: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const registrarEgreso = async () => {
    if (!conceptoGasto || !montoGasto) {
      mostrarToast('Ingrese concepto y monto del gasto', 'warning');
      return;
    }
    try {
      setCargando(true);
      const { error } = await supabase.from('finanzas').insert({
        viaje_id: viajeSeleccionadoId ? parseInt(viajeSeleccionadoId) : null,
        usuario_id: usuarioActual?.id,
        concepto: `Gasto Oficina: ${conceptoGasto}`,
        monto: parseFloat(montoGasto),
        tipo: 'EGRESO'
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mostrarToast('Gasto registrado correctamente', 'success');
      setConceptoGasto('');
      setMontoGasto('');
      obtenerDetallesViaje();
    } catch (e: any) {
      mostrarToast('Error al registrar gasto: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const anularBoleto = async (boletoId: number, precioPagado: number) => {
    try {
      setCargando(true);
      const { error } = await supabase.from('boletos').update({ estado: 'CANCELADO' }).eq('id', boletoId);
      if (error) throw error;
      await supabase.from('finanzas').insert({
        viaje_id: viajeSeleccionadoId ? parseInt(viajeSeleccionadoId) : null,
        usuario_id: usuarioActual?.id,
        concepto: `Anulación de boleto #${boletoId}`,
        monto: precioPagado, tipo: 'EGRESO'
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      mostrarToast('Boleto anulado y reembolsado', 'info');
      obtenerDetallesViaje();
    } catch (e: any) {
      mostrarToast('Error anulando boleto: ' + e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const manejarRefresco = async () => {
    setRefrescando(true);
    await obtenerDetallesViaje();
    setRefrescando(false);
  };

  const datosAsientoEstado: Record<number, string> = {};
  listaBoletosViaje.forEach(boleto => {
    datosAsientoEstado[boleto.numero_asiento] = boleto.estado.toLowerCase(); // 'ocupado' o 'reservado'
  });
  asientosSeleccionados.forEach(asiento => {
    datosAsientoEstado[asiento] = 'seleccionado';
  });

  return (
    <SafeAreaView style={estilos.contenedor}>
      <Toast visible={toastVisible} message={toastMensaje} type={toastTipo} onDismiss={() => setToastVisible(false)} />

      {/* Header */}
      <View style={estilos.header}>
        <View>
          <Text style={estilos.tituloHeader}>Boletería</Text>
          <Text style={estilos.subtituloHeader}>
            {usuarioActual ? usuarioActual.nombre_completo : 'Operador'}
          </Text>
        </View>
        <View style={estilos.accionesHeader}>
          <AnimatedPressable style={estilos.botonIcono} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable style={estilos.botonIcono} onPress={manejarCierreSesion}>
            <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.danger} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={estilos.envolturaSegmented}>
        <SegmentedControl
          segments={nombresPestanas}
          selectedIndex={indicePestanaActiva}
          onChange={setIndicePestanaActiva}
        />
      </View>

      {cargando && !refrescando ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={estilos.textoCargando}>Procesando...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={estilos.contenidoScroll}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={manejarRefresco} tintColor={colors.primary} />}
        >
          {/* SELECCIONAR VIAJE ACTIVO */}
          <View style={estilos.tarjeta}>
            <Text style={estilos.etiquetaTarjeta}>Viaje Activo</Text>
            {listaViajes.length === 0 ? (
              <Text style={estilos.textoVacio}>No hay viajes programados</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
                {listaViajes.map((viaje) => (
                  <AnimatedPressable
                    key={viaje.id}
                    style={[estilos.botonChip, viajeSeleccionadoId == viaje.id.toString() && estilos.botonChipActivo]}
                    onPress={() => setViajeSeleccionadoId(viaje.id.toString())}
                  >
                    <Text style={[estilos.textoChip, viajeSeleccionadoId == viaje.id.toString() && estilos.textoChipActivo]}>
                      {viaje.ruta?.nombre} ({viaje.hora_salida?.substring(0, 5)})
                    </Text>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* TAB 1: PASAJES */}
          {indicePestanaActiva === 0 && (
            <View style={estilos.contenidoPestana}>
              <SeatMap datosAsientos={datosAsientoEstado} alPresionarAsiento={manejarSeleccionAsiento} />

              <View style={estilos.tarjeta}>
                <Text style={estilos.tituloTarjeta}>Detalles del Pasaje</Text>

                {/* Asiento(s) seleccionado(s) */}
                <View style={estilos.filaInsigniaAsiento}>
                  <Text style={estilos.etiquetaCampo}>Asiento(s)</Text>
                  <View style={[estilos.insigniaAsiento, asientosSeleccionados.length === 0 && { backgroundColor: colors.surface }]}>
                    <Text style={[estilos.textoInsigniaAsiento, asientosSeleccionados.length === 0 && { color: colors.textSecondary }]}>
                      {asientosSeleccionados.length > 0 ? asientosSeleccionados.map(a => `#${a}`).join(', ') : '—'}
                    </Text>
                  </View>
                </View>

                {/* Destino */}
                <Text style={estilos.etiquetaCampo}>Destino (desde {tramoOrigen})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {listaRutasTarifas.map((rutaTarifa) => (
                    <AnimatedPressable
                      key={rutaTarifa.id}
                      style={[estilos.botonChip, destinoSeleccionadoId == rutaTarifa.id.toString() && estilos.botonChipActivo]}
                      onPress={() => {
                        setDestinoSeleccionadoId(rutaTarifa.id.toString());
                        setTramoDestino(rutaTarifa.destino);
                        setPrecioBoleto(parseInt(rutaTarifa.precio.toString()));
                      }}
                    >
                      <Text style={[estilos.textoChip, destinoSeleccionadoId == rutaTarifa.id.toString() && estilos.textoChipActivo]}>
                        {rutaTarifa.destino} — Bs. {parseInt(rutaTarifa.precio)}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>

                {/* Tipo de pago */}
                <Text style={estilos.etiquetaCampo}>Tipo de Pago</Text>
                <View style={estilos.filaPago}>
                  <AnimatedPressable
                    style={[estilos.botonChip, !esCorporativo && estilos.botonChipActivo]}
                    onPress={() => setEsCorporativo(false)}
                  >
                    <Text style={[estilos.textoChip, !esCorporativo && estilos.textoChipActivo]}>Efectivo</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[estilos.botonChip, esCorporativo && estilos.botonChipActivo]}
                    onPress={() => setEsCorporativo(true)}
                  >
                    <Text style={[estilos.textoChip, esCorporativo && estilos.textoChipActivo]}>Convenio</Text>
                  </AnimatedPressable>
                </View>

                {esCorporativo && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {listaCuentasCorp.map((corp) => (
                      <AnimatedPressable
                        key={corp.id}
                        style={[estilos.botonChip, corpSeleccionadaId == corp.id.toString() && estilos.botonChipActivo]}
                        onPress={() => setCorpSeleccionadaId(corp.id.toString())}
                      >
                        <Text style={[estilos.textoChip, corpSeleccionadaId == corp.id.toString() && estilos.textoChipActivo]}>
                          {corp.nombre_empresa}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                )}

                {/* Campos de pasajero */}
                <Text style={estilos.etiquetaCampo}>C.I. / Documento</Text>
                <TextInput style={estilos.input} placeholder="Ej. 1234567-LP" placeholderTextColor={colors.textTertiary}
                  value={ciPasajero} onChangeText={setCiPasajero} autoCapitalize="characters" />

                <Text style={estilos.etiquetaCampo}>Nombre del Pasajero</Text>
                <TextInput style={estilos.input} placeholder="Nombre Completo" placeholderTextColor={colors.textTertiary}
                  value={nombrePasajero} onChangeText={setNombrePasajero} />

                {/* Precio */}
                <View style={estilos.filaPrecio}>
                  <Text style={estilos.etiquetaPrecio}>Total</Text>
                  <Text style={estilos.valorPrecio}>Bs. {precioBoleto * (asientosSeleccionados.length || 1)}</Text>
                </View>

                {/* Botón emitir / reservar */}
                {idBoletoConfirmar ? (
                  <View style={{ gap: 8 }}>
                    <AnimatedPressable
                      style={[estilos.botonPrincipal, { backgroundColor: '#34C759' }]}
                      onPress={() => manejarCompraBoleto('OCUPADO')}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={estilos.textoBotonPrincipal}>Confirmar Venta (Bs. {precioBoleto})</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={[estilos.botonPrincipal, { backgroundColor: '#FF3B30' }]}
                      onPress={() => {
                        setIdBoletoConfirmar(null);
                        setAsientosSeleccionados([]);
                        setNombrePasajero('');
                        setCiPasajero('');
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFF" />
                      <Text style={estilos.textoBotonPrincipal}>Cancelar Confirmación</Text>
                    </AnimatedPressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <AnimatedPressable
                      style={[estilos.botonPrincipal, { flex: 1, backgroundColor: '#34C759' }, asientosSeleccionados.length === 0 && estilos.botonDeshabilitado]}
                      disabled={asientosSeleccionados.length === 0}
                      onPress={() => manejarCompraBoleto('OCUPADO')}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                      <Text style={estilos.textoBotonPrincipal}>Vender</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={[estilos.botonPrincipal, { flex: 1, backgroundColor: '#FFCC00' }, asientosSeleccionados.length === 0 && estilos.botonDeshabilitado]}
                      disabled={asientosSeleccionados.length === 0}
                      onPress={() => manejarCompraBoleto('RESERVADO')}
                    >
                      <Ionicons name="bookmark" size={18} color="#000" />
                      <Text style={[estilos.textoBotonPrincipal, { color: '#000' }]}>Reservar</Text>
                    </AnimatedPressable>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 2: ENCOMIENDAS */}
          {indicePestanaActiva === 1 && (
            <View style={estilos.contenidoPestana}>
              <View style={estilos.tarjeta}>
                <Text style={estilos.tituloTarjeta}>Nueva Encomienda</Text>

                <Text style={estilos.etiquetaSeccion}>Remitente</Text>
                <TextInput style={estilos.input} placeholder="Nombre" placeholderTextColor={colors.textTertiary}
                  value={nombreRemitente} onChangeText={setNombreRemitente} />
                <View style={estilos.filaInput}>
                  <TextInput style={[estilos.input, { flex: 1 }]} placeholder="C.I." placeholderTextColor={colors.textTertiary}
                    value={ciRemitente} onChangeText={setCiRemitente} />
                  <TextInput style={[estilos.input, { flex: 1 }]} placeholder="Teléfono" placeholderTextColor={colors.textTertiary}
                    value={telefonoRemitente} onChangeText={setTelefonoRemitente} keyboardType="phone-pad" />
                </View>

                <Text style={estilos.etiquetaSeccion}>Destinatario</Text>
                <TextInput style={estilos.input} placeholder="Nombre" placeholderTextColor={colors.textTertiary}
                  value={nombreDestinatario} onChangeText={setNombreDestinatario} />
                <View style={estilos.filaInput}>
                  <TextInput style={[estilos.input, { flex: 1 }]} placeholder="C.I." placeholderTextColor={colors.textTertiary}
                    value={ciDestinatario} onChangeText={setCiDestinatario} />
                  <TextInput style={[estilos.input, { flex: 1 }]} placeholder="Teléfono" placeholderTextColor={colors.textTertiary}
                    value={telefonoDestinatario} onChangeText={setTelefonoDestinatario} keyboardType="phone-pad" />
                </View>

                <Text style={estilos.etiquetaSeccion}>Detalle del Envío</Text>
                <TextInput style={estilos.input} placeholder="Descripción (ej. Caja de repuestos)" placeholderTextColor={colors.textTertiary}
                  value={descripcionEncomienda} onChangeText={setDescripcionEncomienda} />
                <View style={estilos.filaInput}>
                  <TextInput style={[estilos.input, { flex: 1 }]} placeholder="Peso (Kg)" placeholderTextColor={colors.textTertiary}
                    value={pesoEncomienda} onChangeText={setPesoEncomienda} keyboardType="numeric" />
                  <TextInput style={[estilos.input, { flex: 1 }]} placeholder="Costo (Bs.)" placeholderTextColor={colors.textTertiary}
                    value={precioEncomienda} onChangeText={setPrecioEncomienda} keyboardType="numeric" />
                </View>

                <AnimatedPressable style={estilos.botonPrincipal} onPress={registrarEncomienda}>
                  <Ionicons name="cube" size={20} color="#FFF" />
                  <Text style={estilos.textoBotonPrincipal}>Registrar Encomienda</Text>
                </AnimatedPressable>
              </View>

              {/* Lista de encomiendas */}
              <Text style={estilos.tituloLista}>Encomiendas del Viaje ({listaEncomiendas.length})</Text>
              {listaEncomiendas.length === 0 ? (
                <View style={estilos.tarjetaVacia}><Text style={estilos.textoVacio}>Sin encomiendas en este viaje</Text></View>
              ) : (
                listaEncomiendas.map(encomienda => (
                  <View key={encomienda.id} style={estilos.tarjetaLista}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.tituloTarjetaLista}>{encomienda.descripcion}</Text>
                      <Text style={estilos.subtituloTarjetaLista}>De: {encomienda.nombre_remitente} → {encomienda.nombre_destinatario}</Text>
                      <Text style={estilos.subtituloTarjetaLista}>{encomienda.peso_kg} Kg · Bs. {parseFloat(encomienda.precio).toFixed(2)} · {encomienda.codigo_qr}</Text>
                    </View>
                    <View style={[estilos.pastillaEstado, {
                      backgroundColor: encomienda.estado === 'ENTREGADO' ? colors.tintSuccess :
                        encomienda.estado === 'EN_RUTA' ? colors.tint : colors.tintWarning
                    }]}>
                      <Text style={[estilos.textoPastillaEstado, {
                        color: encomienda.estado === 'ENTREGADO' ? colors.success :
                          encomienda.estado === 'EN_RUTA' ? colors.primary : colors.warning
                      }]}>
                        {encomienda.estado === 'PENDIENTE' ? 'Pendiente' : encomienda.estado === 'EN_RUTA' ? 'En Ruta' : 'Entregado'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: SALIDAS (KANBAN) */}
          {indicePestanaActiva === 2 && (
            <View style={estilos.contenidoPestana}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[estilos.tituloLista, { marginBottom: 0 }]}>Control de Despacho</Text>
                <AnimatedPressable
                  style={[estilos.botonPrincipal, { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, marginVertical: 0 }]}
                  onPress={() => {
                    // Cargar ruta inicial por defecto
                    if (listaRutasTarifas.length > 0) setViajeNuevoRutaId(listaRutasTarifas[0].id.toString());
                    if (listaVehiculos.length > 0) setViajeNuevoVehiculoId(listaVehiculos[0].id.toString());
                    if (listaChoferes.length > 0) setViajeNuevoChoferId(listaChoferes[0].id.toString());
                    setMostrarModalProgramarViaje(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#FFF" />
                  <Text style={[estilos.textoBotonPrincipal, { fontSize: 13 }]}>Programar Viaje</Text>
                </AnimatedPressable>
              </View>

              {/* Programados */}
              <View style={estilos.seccionKanban}>
                <View style={[estilos.cabeceraKanban, { borderLeftColor: colors.primary }]}>
                  <Text style={estilos.textoCabeceraKanban}>📅 Programados</Text>
                </View>
                {listaViajes.filter(t => t.estado === 'PROGRAMADO').length === 0 ? (
                  <Text style={estilos.textoVacioKanban}>Sin viajes programados</Text>
                ) : (
                  listaViajes.filter(t => t.estado === 'PROGRAMADO').map(viaje => (
                    <View key={viaje.id} style={estilos.tarjetaKanban}>
                      <Text style={estilos.tituloTarjetaKanban}>{viaje.ruta?.nombre}</Text>
                      <Text style={estilos.subtituloTarjetaKanban}>Salida: {viaje.hora_salida?.substring(0, 5)} · {viaje.vehiculo?.placa} · {viaje.chofer?.nombre_completo}</Text>
                      <AnimatedPressable style={[estilos.botonKanban, { backgroundColor: colors.primary }]}
                        onPress={async () => { setCargando(true); await supabase.from('viajes').update({ estado: 'ABORDANDO' }).eq('id', viaje.id); mostrarToast('Minibús en abordaje', 'info'); cargarDatosIniciales(); }}>
                        <Text style={estilos.textoBotonKanban}>Iniciar Abordaje</Text>
                      </AnimatedPressable>
                    </View>
                  ))
                )}
              </View>

              {/* Abordando */}
              <View style={estilos.seccionKanban}>
                <View style={[estilos.cabeceraKanban, { borderLeftColor: colors.warning }]}>
                  <Text style={estilos.textoCabeceraKanban}>🚪 Abordando</Text>
                </View>
                {listaViajes.filter(t => t.estado === 'ABORDANDO').length === 0 ? (
                  <Text style={estilos.textoVacioKanban}>Sin viajes en abordaje</Text>
                ) : (
                  listaViajes.filter(t => t.estado === 'ABORDANDO').map(viaje => (
                    <View key={viaje.id} style={estilos.tarjetaKanban}>
                      <Text style={estilos.tituloTarjetaKanban}>{viaje.ruta?.nombre}</Text>
                      <Text style={estilos.subtituloTarjetaKanban}>Salida: {viaje.hora_salida?.substring(0, 5)} · {viaje.vehiculo?.placa} · {viaje.chofer?.nombre_completo}</Text>
                      <AnimatedPressable style={[estilos.botonKanban, { backgroundColor: colors.success }]}
                        onPress={async () => {
                          setCargando(true);
                          await supabase.from('viajes').update({ estado: 'EN_RUTA' }).eq('id', viaje.id);
                          await supabase.from('eventos').insert({
                            viaje_id: viaje.id, chofer_id: viaje.chofer_id, tipo_evento: 'MARCA_SALIDA',
                            datos: { ubicacion: viaje.ruta?.origen, hora: new Date().toISOString() }
                          });
                          mostrarToast('Minibús despachado a ruta', 'success');
                          cargarDatosIniciales();
                        }}>
                        <Text style={estilos.textoBotonKanban}>Despachar</Text>
                      </AnimatedPressable>
                    </View>
                  ))
                )}
              </View>

              {/* En Ruta */}
              <View style={estilos.seccionKanban}>
                <View style={[estilos.cabeceraKanban, { borderLeftColor: colors.success }]}>
                  <Text style={estilos.textoCabeceraKanban}>🟢 En Ruta</Text>
                </View>
                {listaViajes.filter(t => t.estado === 'EN_RUTA').length === 0 ? (
                  <Text style={estilos.textoVacioKanban}>Sin viajes en ruta</Text>
                ) : (
                  listaViajes.filter(t => t.estado === 'EN_RUTA').map(viaje => (
                    <View key={viaje.id} style={estilos.tarjetaKanban}>
                      <Text style={estilos.tituloTarjetaKanban}>{viaje.ruta?.nombre}</Text>
                      <Text style={estilos.subtituloTarjetaKanban}>{viaje.hora_salida?.substring(0, 5)} · {viaje.vehiculo?.placa} · {viaje.chofer?.nombre_completo}</Text>
                      <View style={[estilos.pastillaEstado, { backgroundColor: colors.tintSuccess, alignSelf: 'flex-start', marginTop: 8 }]}>
                        <Text style={[estilos.textoPastillaEstado, { color: colors.success }]}>En viaje</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB 4: CAJA */}
          {indicePestanaActiva === 3 && (
            <View style={estilos.contenidoPestana}>
              {/* KPIs */}
              <View style={estilos.filaKpi}>
                <View style={[estilos.tarjetaKpi, { borderLeftColor: colors.success }]}>
                  <Text style={estilos.etiquetaKpi}>Ingresos</Text>
                  <Text style={[estilos.valorKpi, { color: colors.success }]}>Bs. {ingresosOficina.toFixed(2)}</Text>
                </View>
                <View style={[estilos.tarjetaKpi, { borderLeftColor: colors.danger }]}>
                  <Text style={estilos.etiquetaKpi}>Egresos</Text>
                  <Text style={[estilos.valorKpi, { color: colors.danger }]}>Bs. {egresosOficina.toFixed(2)}</Text>
                </View>
              </View>

              <View style={[estilos.tarjeta, { alignItems: 'center', paddingVertical: 24 }]}>
                <Text style={estilos.etiquetaKpi}>Saldo Neto</Text>
                <Text style={[estilos.valorKpiGrande, { color: ingresosOficina - egresosOficina >= 0 ? colors.primary : colors.danger }]}>
                  Bs. {(ingresosOficina - egresosOficina).toFixed(2)}
                </Text>
              </View>

              {cajaDiaria && (
                <AnimatedPressable
                  style={[estilos.botonPrincipal, { backgroundColor: colors.danger }]}
                  onPress={() => {
                    const esperado = parseFloat(cajaDiaria.monto_inicial.toString()) + ingresosOficina - egresosOficina;
                    setMontoFinalCajaInput(esperado.toFixed(2));
                    setMostrarModalCerrarCaja(true);
                  }}
                >
                  <Ionicons name="lock-closed" size={20} color="#FFF" />
                  <Text style={estilos.textoBotonPrincipal}>Cerrar Caja</Text>
                </AnimatedPressable>
              )}

              {/* Registrar gasto */}
              <View style={[estilos.tarjeta, { marginTop: 16 }]}>
                <Text style={estilos.tituloTarjeta}>Registrar Gasto</Text>
                <TextInput style={estilos.input} placeholder="Concepto (ej. Compra de hojas)" placeholderTextColor={colors.textTertiary}
                  value={conceptoGasto} onChangeText={setConceptoGasto} />
                <TextInput style={estilos.input} placeholder="Monto (Bs.)" placeholderTextColor={colors.textTertiary}
                  value={montoGasto} onChangeText={setMontoGasto} keyboardType="numeric" />
                <AnimatedPressable style={[estilos.botonPrincipal, { backgroundColor: colors.danger }]} onPress={registrarEgreso}>
                  <Ionicons name="remove-circle" size={20} color="#FFF" />
                  <Text style={estilos.textoBotonPrincipal}>Registrar Egreso</Text>
                </AnimatedPressable>
              </View>

              {/* Ventas del turno */}
              <Text style={[estilos.tituloLista, { marginTop: 24 }]}>Ventas del Turno ({misVentasHoy.length})</Text>
              {misVentasHoy.length === 0 ? (
                <View style={estilos.tarjetaVacia}><Text style={estilos.textoVacio}>Sin ventas en este turno</Text></View>
              ) : (
                misVentasHoy.map((venta) => (
                  <View key={venta.id} style={estilos.tarjetaLista}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.tituloTarjetaLista}>Asiento #{venta.numero_asiento} — {venta.nombre_pasajero}</Text>
                      <Text style={estilos.subtituloTarjetaLista}>{venta.viaje?.ruta?.nombre} · {venta.viaje?.hora_salida?.substring(0, 5)} · Bs. {parseFloat(venta.precio_pagado).toFixed(2)}</Text>
                    </View>
                    {venta.estado === 'ACTIVO' ? (
                      <AnimatedPressable style={estilos.pastillaAnulacion} onPress={() => anularBoleto(venta.id, parseFloat(venta.precio_pagado))}>
                        <Text style={estilos.textoPastillaAnulacion}>Anular</Text>
                      </AnimatedPressable>
                    ) : (
                      <View style={[estilos.pastillaEstado, { backgroundColor: colors.tintDanger }]}>
                        <Text style={[estilos.textoPastillaEstado, { color: colors.danger }]}>Anulado</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL BOLETO DIGITAL */}
      <Modal visible={mostrarReciboModal} transparent animationType="fade" onRequestClose={() => setMostrarReciboModal(false)}>
        <View style={estilos.pantallaModal}>
          <View style={estilos.tarjetaModal}>
            <Text style={estilos.cabeceraRecibo}>SINDICATO TRANS</Text>
            <Text style={estilos.subRecibo}>Boleto Digital de Viaje</Text>
            <View style={estilos.divisor} />
            {ultimoBoletoVendido && (
              <View style={estilos.cuerpoRecibo}>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>ID</Text><Text style={estilos.valorRecibo}>#{ultimoBoletoVendido.id}</Text></View>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Fecha</Text><Text style={estilos.valorRecibo}>{ultimoBoletoVendido.fecha_viaje} {ultimoBoletoVendido.hora_salida?.substring(0, 5)}</Text></View>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Vehículo</Text><Text style={estilos.valorRecibo}>{ultimoBoletoVendido.placa}</Text></View>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Chofer</Text><Text style={estilos.valorRecibo}>{ultimoBoletoVendido.chofer}</Text></View>
                <View style={estilos.divisor} />
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Pasajero</Text><Text style={estilos.valorReciboNegrita}>{ultimoBoletoVendido.nombre_pasajero}</Text></View>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>C.I.</Text><Text style={estilos.valorRecibo}>{ultimoBoletoVendido.ci_pasajero}</Text></View>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Ruta</Text><Text style={estilos.valorRecibo}>{ultimoBoletoVendido.origen} ➔ {ultimoBoletoVendido.destino}</Text></View>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Asiento</Text><Text style={[estilos.valorReciboNegrita, { color: colors.primary, fontSize: 20 }]}>{ultimoBoletoVendido.numero_asiento}</Text></View>
                <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Monto</Text><Text style={[estilos.valorReciboNegrita, { color: colors.success, fontSize: 20 }]}>Bs. {parseFloat(ultimoBoletoVendido.precio_pagado).toFixed(2)}</Text></View>
              </View>
            )}
            <View style={estilos.divisor} />
            <View style={estilos.accionesModal}>
              <AnimatedPressable style={[estilos.botonModal, { backgroundColor: colors.primary }]}
                onPress={() => { mostrarToast('Imprimiendo recibo...', 'info'); setMostrarReciboModal(false); }}>
                <Ionicons name="print-outline" size={18} color="#FFF" />
                <Text style={estilos.textoBotonModal}>Imprimir</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[estilos.botonModal, { backgroundColor: '#25D366' }]} onPress={compartirWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                <Text style={estilos.textoBotonModal}>Enviar</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[estilos.botonModal, { backgroundColor: colors.surface }]} onPress={() => setMostrarReciboModal(false)}>
                <Text style={[estilos.textoBotonModal, { color: colors.text }]}>Cerrar</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL APERTURA DE CAJA */}
      <Modal visible={mostrarModalAbrirCaja && !cajaDiaria} transparent animationType="fade">
        <View style={estilos.pantallaModal}>
          <View style={[estilos.tarjetaModal, { padding: 28 }]}>
            <View style={[estilos.circuloIconoModal, { backgroundColor: colors.tint }]}>
              <Ionicons name="lock-open" size={32} color={colors.primary} />
            </View>
            <Text style={estilos.tituloModal}>Apertura de Caja</Text>
            <Text style={estilos.descripcionModal}>Registre el saldo inicial de caja para iniciar operaciones.</Text>
            <TextInput style={[estilos.input, { textAlign: 'center', fontSize: 20 }]} placeholder="Monto Inicial (Bs.)"
              value={montoInicialCaja} onChangeText={setMontoInicialCaja} keyboardType="numeric" />
            <AnimatedPressable style={estilos.botonPrincipal} onPress={manejarAperturaCaja}>
              <Text style={estilos.textoBotonPrincipal}>Abrir Caja</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* MODAL CIERRE DE CAJA */}
      <Modal visible={mostrarModalCerrarCaja} transparent animationType="fade" onRequestClose={() => setMostrarModalCerrarCaja(false)}>
        <View style={estilos.pantallaModal}>
          <View style={[estilos.tarjetaModal, { padding: 28 }]}>
            <View style={[estilos.circuloIconoModal, { backgroundColor: colors.tintDanger }]}>
              <Ionicons name="lock-closed" size={32} color={colors.danger} />
            </View>
            <Text style={estilos.tituloModal}>Cierre de Caja</Text>
            <Text style={estilos.descripcionModal}>Arqueo de caja. Ingrese el total de efectivo físico.</Text>
            <View style={estilos.cuerpoRecibo}>
              <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Saldo Inicial</Text><Text style={estilos.valorRecibo}>Bs. {parseFloat(cajaDiaria?.monto_inicial.toString() || '0').toFixed(2)}</Text></View>
              <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Ingresos</Text><Text style={estilos.valorRecibo}>Bs. {ingresosOficina.toFixed(2)}</Text></View>
              <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Gastos</Text><Text style={estilos.valorRecibo}>Bs. {egresosOficina.toFixed(2)}</Text></View>
              <View style={estilos.divisor} />
              <View style={estilos.filaRecibo}><Text style={estilos.etiquetaRecibo}>Esperado</Text><Text style={estilos.valorReciboNegrita}>Bs. {(parseFloat(cajaDiaria?.monto_inicial.toString() || '0') + ingresosOficina - egresosOficina).toFixed(2)}</Text></View>
            </View>
            <TextInput style={[estilos.input, { textAlign: 'center', fontSize: 20 }]} placeholder="Efectivo en mano (Bs.)"
              value={montoFinalCajaInput} onChangeText={setMontoFinalCajaInput} keyboardType="numeric" />
            <AnimatedPressable style={[estilos.botonPrincipal, { backgroundColor: colors.danger }]} onPress={manejarCierreCaja}>
              <Text style={estilos.textoBotonPrincipal}>Confirmar Cierre</Text>
            </AnimatedPressable>
            <AnimatedPressable style={estilos.botonTexto} onPress={() => setMostrarModalCerrarCaja(false)}>
              <Text style={estilos.etiquetaBotonTexto}>Cancelar</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* MODAL ACCIONES ASIENTO RESERVADO */}
      <Modal visible={asientoAccionMenu !== null} transparent animationType="fade" onRequestClose={() => setAsientoAccionMenu(null)}>
        <View style={estilos.pantallaModal}>
          <View style={[estilos.tarjetaModal, { padding: 28 }]}>
            <View style={[estilos.circuloIconoModal, { backgroundColor: '#FFF9E6' }]}>
              <Ionicons name="bookmark" size={32} color="#FFCC00" />
            </View>
            <Text style={estilos.tituloModal}>Asiento #{asientoAccionMenu} Reservado</Text>
            <Text style={estilos.descripcionModal}>
              ¿Qué acción desea realizar con esta reserva?
            </Text>
            
            <AnimatedPressable
              style={[estilos.botonPrincipal, { width: '100%', backgroundColor: '#34C759', marginBottom: 12 }]}
              onPress={() => asientoAccionMenu && iniciarConfirmacionReserva(asientoAccionMenu)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={estilos.textoBotonPrincipal}>Confirmar Venta</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[estilos.botonPrincipal, { width: '100%', backgroundColor: '#FF3B30', marginBottom: 12 }]}
              onPress={() => asientoAccionMenu && liberarReserva(asientoAccionMenu)}
            >
              <Ionicons name="trash" size={20} color="#FFF" />
              <Text style={estilos.textoBotonPrincipal}>Liberar Asiento</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[estilos.botonTexto, { marginTop: 4 }]}
              onPress={() => setAsientoAccionMenu(null)}
            >
              <Text style={estilos.etiquetaBotonTexto}>Cerrar</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* MODAL PROGRAMAR VIAJE */}
      <Modal visible={mostrarModalProgramarViaje} transparent animationType="slide" onRequestClose={() => setMostrarModalProgramarViaje(false)}>
        <View style={estilos.pantallaModal}>
          <View style={[estilos.tarjetaModal, { padding: 20, maxWidth: 390, maxHeight: '90%' }]}>
            <Text style={[estilos.tituloModal, { alignSelf: 'flex-start', fontSize: 18, marginBottom: 16 }]}>Programar Nuevo Viaje</Text>
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              
              {/* Ruta (Filtrada a la ruta principal de ida y vuelta) */}
              <Text style={estilos.etiquetaCampo}>Seleccionar Ruta Principal</Text>
              {(() => {
                const mainRutas = listaRutasTarifas.filter(ruta => 
                  ruta.origen === tramoOrigen && 
                  (ruta.destino === 'San Cristóbal' || ruta.destino === 'Uyuni')
                );
                const rutasMostrar = mainRutas.length > 0 ? mainRutas : listaRutasTarifas.filter(r => r.origen === tramoOrigen);

                if (rutasMostrar.length === 0) {
                  return <Text style={estilos.textoVacio}>No hay rutas registradas para esta oficina</Text>;
                }

                // Autoseleccionar la primera ruta si no hay ninguna seleccionada
                if (!viajeNuevoRutaId && rutasMostrar.length > 0) {
                  setTimeout(() => setViajeNuevoRutaId(rutasMostrar[0].id.toString()), 50);
                }

                return (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {rutasMostrar.map((ruta) => (
                      <AnimatedPressable
                        key={ruta.id}
                        style={[estilos.botonChip, viajeNuevoRutaId == ruta.id.toString() && estilos.botonChipActivo]}
                        onPress={() => setViajeNuevoRutaId(ruta.id.toString())}
                      >
                        <Text style={[estilos.textoChip, viajeNuevoRutaId == ruta.id.toString() && estilos.textoChipActivo]}>
                          {ruta.nombre}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                );
              })()}

              {/* Vehículo */}
              <Text style={estilos.etiquetaCampo}>Seleccionar Vehículo (Flota)</Text>
              {listaVehiculos.length === 0 ? (
                <Text style={estilos.textoVacio}>No hay vehículos activos</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {listaVehiculos.map((v) => (
                    <AnimatedPressable
                      key={v.id}
                      style={[estilos.botonChip, viajeNuevoVehiculoId == v.id.toString() && estilos.botonChipActivo]}
                      onPress={() => {
                        setViajeNuevoVehiculoId(v.id.toString());
                        // Autoseleccionar el chofer vinculado a este vehículo
                        if (v.chofer_id) {
                          setViajeNuevoChoferId(v.chofer_id.toString());
                        }
                      }}
                    >
                      <Text style={[estilos.textoChip, viajeNuevoVehiculoId == v.id.toString() && estilos.textoChipActivo]}>
                        {v.placa} ({v.modelo})
                      </Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              )}

              {/* Chofer */}
              <Text style={estilos.etiquetaCampo}>Seleccionar Chofer</Text>
              {listaChoferes.length === 0 ? (
                <Text style={estilos.textoVacio}>No hay choferes activos</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {listaChoferes.map((c) => (
                    <AnimatedPressable
                      key={c.id}
                      style={[estilos.botonChip, viajeNuevoChoferId == c.id.toString() && estilos.botonChipActivo]}
                      onPress={() => {
                        setViajeNuevoChoferId(c.id.toString());
                        // Autoseleccionar el vehículo vinculado a este chofer
                        const veh = listaVehiculos.find(v => v.chofer_id?.toString() === c.id.toString());
                        if (veh) {
                          setViajeNuevoVehiculoId(veh.id.toString());
                        }
                      }}
                    >
                      <Text style={[estilos.textoChip, viajeNuevoChoferId == c.id.toString() && estilos.textoChipActivo]}>
                        {c.nombre_completo}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              )}

              {/* Horario con Scroll */}
              <Text style={estilos.etiquetaCampo}>Hora de Salida</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.etiquetaCampo, { fontSize: 11, marginTop: 0 }]}>Hora</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const hStr = h.toString().padStart(2, '0');
                      return (
                        <AnimatedPressable
                          key={`hr-${hStr}`}
                          style={[estilos.botonChip, { paddingHorizontal: 10, paddingVertical: 6 }, viajeNuevoHoraSeleccionada === hStr && estilos.botonChipActivo]}
                          onPress={() => setViajeNuevoHoraSeleccionada(hStr)}
                        >
                          <Text style={[estilos.textoChip, { fontSize: 13 }, viajeNuevoHoraSeleccionada === hStr && estilos.textoChipActivo]}>{hStr}</Text>
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <Text style={{ fontSize: 18, color: colors.textSecondary, marginTop: 14 }}>:</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.etiquetaCampo, { fontSize: 11, marginTop: 0 }]}>Minuto</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((mStr) => {
                      return (
                        <AnimatedPressable
                          key={`min-${mStr}`}
                          style={[estilos.botonChip, { paddingHorizontal: 10, paddingVertical: 6 }, viajeNuevoMinutoSeleccionado === mStr && estilos.botonChipActivo]}
                          onPress={() => setViajeNuevoMinutoSeleccionado(mStr)}
                        >
                          <Text style={[estilos.textoChip, { fontSize: 13 }, viajeNuevoMinutoSeleccionado === mStr && estilos.textoChipActivo]}>{mStr}</Text>
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              {/* Fecha de Viaje con Scroll */}
              <Text style={estilos.etiquetaCampo}>Fecha del Viaje</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {(() => {
                  const dias = [];
                  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                  const hoy = new Date();
                  for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(hoy.getDate() + i);
                    const fechaStr = d.toISOString().split('T')[0];
                    const etiqueta = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${nombresDias[d.getDay()]} ${d.getDate()}`;
                    dias.push({ etiqueta, fechaStr });
                  }
                  return dias.map((dia) => (
                    <AnimatedPressable
                      key={dia.fechaStr}
                      style={[estilos.botonChip, viajeNuevoFecha === dia.fechaStr && estilos.botonChipActivo]}
                      onPress={() => setViajeNuevoFecha(dia.fechaStr)}
                    >
                      <Text style={[estilos.textoChip, viajeNuevoFecha === dia.fechaStr && estilos.textoChipActivo]}>
                        {dia.etiqueta}
                      </Text>
                    </AnimatedPressable>
                  ));
                })()}
              </ScrollView>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 16 }}>
              <AnimatedPressable
                style={[estilos.botonModal, { backgroundColor: colors.primary }]}
                onPress={manejarProgramarViaje}
              >
                <Text style={estilos.textoBotonModal}>Programar</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[estilos.botonModal, { backgroundColor: colors.surface }]}
                onPress={() => setMostrarModalProgramarViaje(false)}
              >
                <Text style={[estilos.textoBotonModal, { color: colors.textSecondary }]}>Cerrar</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card },
  tituloHeader: { ...typography.title2, color: colors.text },
  subtituloHeader: { ...typography.footnote, color: colors.textSecondary, marginTop: 2 },
  accionesHeader: { flexDirection: 'row', gap: 8 },
  botonIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },

  // Segmented
  envolturaSegmented: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 0.5, borderBottomColor: colors.separator },

  // Scroll
  contenidoScroll: { padding: 20, paddingBottom: 40, gap: 16 },
  textoCargando: { ...typography.footnote, color: colors.textSecondary, marginTop: 12 },

  // Cards
  tarjeta: { backgroundColor: colors.card, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  etiquetaTarjeta: { ...typography.footnote, color: colors.textSecondary, fontFamily: typography.fontFamilySemiBold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  tituloTarjeta: { ...typography.title3, color: colors.text, marginBottom: 16 },

  // Chips
  botonChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, marginRight: 8 },
  botonChipActivo: { backgroundColor: colors.primary },
  textoChip: { ...typography.subhead, color: colors.text },
  textoChipActivo: { color: '#FFF', fontFamily: typography.fontFamilySemiBold },

  // Tabs content
  contenidoPestana: { gap: 16 },

  // Seat badge
  filaInsigniaAsiento: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  insigniaAsiento: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  textoInsigniaAsiento: { ...typography.headline, color: '#FFF' },
  etiquetaCampo: { ...typography.footnote, color: colors.textSecondary, fontFamily: typography.fontFamilySemiBold, marginBottom: 6, marginTop: 4 },

  // Payment row
  filaPago: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  // Inputs
  input: { ...typography.body, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, marginBottom: 12 },
  filaInput: { flexDirection: 'row', gap: 8 },

  // Price
  filaPrecio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 0.5, borderTopColor: colors.separator, marginBottom: 8 },
  etiquetaPrecio: { ...typography.headline, color: colors.text },
  valorPrecio: { ...typography.title2, color: colors.success },

  // Buttons
  botonPrincipal: { flexDirection: 'row', height: 52, backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  botonDeshabilitado: { backgroundColor: colors.surface, shadowOpacity: 0 },
  textoBotonPrincipal: { ...typography.headline, color: '#FFF' },
  botonTexto: { paddingVertical: 12, alignItems: 'center' },
  etiquetaBotonTexto: { ...typography.subhead, color: colors.textSecondary },

  // Section label
  etiquetaSeccion: { ...typography.caption1, color: colors.primary, fontFamily: typography.fontFamilySemiBold, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Lists
  tituloLista: { ...typography.title3, color: colors.text, marginBottom: 8 },
  tarjetaLista: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  tituloTarjetaLista: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: colors.text },
  subtituloTarjetaLista: { ...typography.caption1, color: colors.textSecondary, marginTop: 3 },

  // Status pills
  pastillaEstado: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  textoPastillaEstado: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold },
  pastillaAnulacion: { backgroundColor: colors.tintDanger, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  textoPastillaAnulacion: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold, color: colors.danger },

  // Empty
  tarjetaVacia: { backgroundColor: colors.card, padding: 32, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  textoVacio: { ...typography.subhead, color: colors.textSecondary },

  // Kanban
  seccionKanban: { backgroundColor: colors.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cabeceraKanban: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 12 },
  textoCabeceraKanban: { ...typography.headline, color: colors.text },
  tarjetaKanban: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 10 },
  tituloTarjetaKanban: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: colors.text },
  subtituloTarjetaKanban: { ...typography.caption1, color: colors.textSecondary, marginTop: 3 },
  botonKanban: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  textoBotonKanban: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },
  textoVacioKanban: { ...typography.subhead, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },

  // KPIs
  filaKpi: { flexDirection: 'row', gap: 12 },
  tarjetaKpi: { flex: 1, backgroundColor: colors.card, padding: 20, borderRadius: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  etiquetaKpi: { ...typography.footnote, color: colors.textSecondary, marginBottom: 6 },
  valorKpi: { ...typography.title2, color: colors.text },
  valorKpiGrande: { ...typography.largeTitle, marginTop: 4 },

  // Modal
  pantallaModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  tarjetaModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  circuloIconoModal: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  tituloModal: { ...typography.title3, color: colors.text, marginBottom: 6 },
  descripcionModal: { ...typography.footnote, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  accionesModal: { flexDirection: 'row', width: '100%', gap: 8, marginTop: 16 },
  botonModal: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 },
  textoBotonModal: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },

  // Receipt
  cabeceraRecibo: { ...typography.headline, color: colors.text, textAlign: 'center' },
  subRecibo: { ...typography.caption1, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  divisor: { height: 0.5, backgroundColor: colors.separator, width: '100%', marginVertical: 14 },
  cuerpoRecibo: { width: '100%' },
  filaRecibo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  etiquetaRecibo: { ...typography.caption1, color: colors.textSecondary },
  valorRecibo: { ...typography.caption1, color: colors.text },
  valorReciboNegrita: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold, color: colors.text },
});

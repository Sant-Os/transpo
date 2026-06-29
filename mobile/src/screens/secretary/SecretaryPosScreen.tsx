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
import { User, Trip, Segment, Ticket, CashRegister } from '../../types';

export interface SecretaryPosScreenProps {
  navigation: any;
}

export default function SecretaryPosScreen({ navigation }: SecretaryPosScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Datos comunes
  const [tripsList, setTripsList] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // TAB 1: Pasajes
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerCI, setPassengerCI] = useState<string>('');
  const [startSegment, setStartSegment] = useState<string>('Uyuni');
  const [endSegment, setEndSegment] = useState<string>('San Cristóbal');

  const [segmentsList, setSegmentsList] = useState<Segment[]>([]);
  const [ticketPrice, setTicketPrice] = useState<number>(35.00);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);

  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [lastSoldTicket, setLastSoldTicket] = useState<any>(null);

  // TAB 2: Encomiendas
  const [senderName, setSenderName] = useState<string>('');
  const [senderCI, setSenderCI] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverCI, setReceiverCI] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [parcelDesc, setParcelDesc] = useState<string>('');
  const [parcelWeight, setParcelWeight] = useState<string>('');
  const [parcelPrice, setParcelPrice] = useState<string>('');
  const [parcelsList, setParcelsList] = useState<any[]>([]);

  // TAB 3: Caja y Gastos
  const [expenseConcept, setExpenseConcept] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [mySalesToday, setMySalesToday] = useState<any[]>([]);
  const [officeIncomes, setOfficeIncomes] = useState<number>(0);
  const [officeExpenses, setOfficeExpenses] = useState<number>(0);

  // Cuentas Corporativas
  const [corporateAccountsList, setCorporateAccountsList] = useState<any[]>([]);
  const [selectedCorpId, setSelectedCorpId] = useState<string | null>(null);
  const [isCorporate, setIsCorporate] = useState<boolean>(false);

  // Apertura y Cierre de Caja
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [initialCashInput, setInitialCashInput] = useState<string>('100.00');
  const [showCashOpenModal, setShowCashOpenModal] = useState<boolean>(false);
  const [showCashCloseModal, setShowCashCloseModal] = useState<boolean>(false);
  const [finalCashInput, setFinalCashInput] = useState<string>('0.00');

  const tabNames = ['Pasajes', 'Encomiendas', 'Salidas', 'Caja'];

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        const { data: activeReg } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('opened_by', user.id)
          .eq('status', 'OPEN')
          .limit(1)
          .maybeSingle();

        if (activeReg) {
          setCashRegister(activeReg as CashRegister);
        } else {
          setShowCashOpenModal(true);
        }
      }

      const { data: trips } = await supabase
        .from('trips')
        .select('*, route:routes(name, origin, destination), vehicle:vehicles(plate, model), driver:users(full_name)')
        .order('departure_time', { ascending: true });

      if (trips && trips.length > 0) {
        setTripsList(trips);
        setSelectedTripId(trips[0].id.toString());
      }

      const { data: segments } = await supabase
        .from('segments')
        .select('*')
        .order('order_index', { ascending: true });

      if (segments && segments.length > 0) {
        setSegmentsList(segments as Segment[]);
        const lastSeg = segments[segments.length - 1];
        setEndSegment(lastSeg.destination);
        setSelectedDestId(lastSeg.id.toString());
        setTicketPrice(parseFloat(lastSeg.price));
      }

      const { data: corps } = await supabase
        .from('corporate_accounts')
        .select('*')
        .eq('is_active', true);
      if (corps) {
        setCorporateAccountsList(corps);
        if (corps.length > 0) setSelectedCorpId(corps[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTripId) return;
    fetchTripDetails();

    const ticketSubscription = supabase
      .channel(`realtime_tickets_trip_${selectedTripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `trip_id=eq.${selectedTripId}` }, () => { fetchTripDetails(); })
      .subscribe();

    const tripSubscription = supabase
      .channel('realtime_trips')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, () => { loadInitialData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketSubscription);
      supabase.removeChannel(tripSubscription);
    };
  }, [selectedTripId]);

  const fetchTripDetails = async () => {
    if (!selectedTripId) return;
    try {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('seat_number')
        .eq('trip_id', parseInt(selectedTripId))
        .eq('status', 'ACTIVE');

      if (tickets) {
        setOccupiedSeats(tickets.map((t: any) => t.seat_number));
      } else {
        setOccupiedSeats([]);
      }

      const { data: parcels } = await supabase
        .from('parcels')
        .select('*')
        .eq('trip_id', parseInt(selectedTripId))
        .order('created_at', { ascending: false });

      if (parcels) setParcelsList(parcels);

      if (currentUser) {
        const { data: sales } = await supabase
          .from('tickets')
          .select('*, trip:trips(departure_time, route:routes(name))')
          .eq('sold_by', currentUser.id)
          .order('created_at', { ascending: false });
        if (sales) setMySalesToday(sales);

        const { data: finances } = await supabase
          .from('finances')
          .select('*')
          .eq('user_id', currentUser.id);

        if (finances) {
          const inc = finances.filter((f: any) => f.type === 'INCOME').reduce((sum, f) => sum + parseFloat(f.amount), 0);
          const exp = finances.filter((f: any) => f.type === 'EXPENSE').reduce((sum, f) => sum + parseFloat(f.amount), 0);
          setOfficeIncomes(inc);
          setOfficeExpenses(exp);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  const handleOpenCashRegister = async () => {
    if (!initialCashInput) { showToast('Ingrese un monto inicial', 'warning'); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({ opened_by: currentUser?.id, initial_amount: parseFloat(initialCashInput), status: 'OPEN' })
        .select()
        .single();
      if (error) throw error;
      setCashRegister(data as CashRegister);
      setShowCashOpenModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Caja abierta con éxito', 'success');
    } catch (e: any) {
      showToast('Error abriendo caja: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCashRegister = async () => {
    if (!cashRegister) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('cash_registers')
        .update({ closed_at: new Date().toISOString(), final_amount: parseFloat(finalCashInput), status: 'CLOSED' })
        .eq('id', cashRegister.id);
      if (error) throw error;
      setCashRegister(null);
      setShowCashCloseModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Caja cerrada con éxito', 'success');
      setShowCashOpenModal(true);
    } catch (e: any) {
      showToast('Error cerrando caja: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastSoldTicket) return;
    const message = `*SINDICATO TRANS — BOLETO DE VIAJE*\n\n` +
      `*Boleto ID:* #${lastSoldTicket.id}\n` +
      `*Pasajero:* ${lastSoldTicket.passenger_name}\n` +
      `*C.I.:* ${lastSoldTicket.passenger_ci}\n` +
      `*Asiento:* #${lastSoldTicket.seat_number}\n` +
      `*Ruta:* ${lastSoldTicket.origin} ➔ ${lastSoldTicket.destination}\n` +
      `*Fecha/Hora:* ${lastSoldTicket.trip_date} ${lastSoldTicket.departure_time?.substring(0, 5)}\n` +
      `*Monto:* Bs. ${parseFloat(lastSoldTicket.price_paid).toFixed(2)}\n` +
      `*Vehículo:* ${lastSoldTicket.plate}\n` +
      `*Chofer:* ${lastSoldTicket.driver}\n\n` +
      `*Verificar Boleto:* https://sindicatotrans.com/ticket/${lastSoldTicket.id}`;
    showToast('Enlace de WhatsApp generado', 'info');
  };

  const handleSeatPress = (seatNumber: number, status: string) => {
    if (status !== 'free') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(`El asiento ${seatNumber} no está disponible`, 'warning');
      return;
    }
    setSelectedSeat(seatNumber);
  };

  const handlePurchase = async () => {
    if (!selectedSeat || !passengerName || !passengerCI || !selectedTripId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Complete todos los campos de pasajero y asiento', 'warning');
      return;
    }

    try {
      setLoading(true);
      const trip = tripsList.find(t => t.id.toString() === selectedTripId);
      const selectedCorp = isCorporate ? corporateAccountsList.find(c => c.id.toString() === selectedCorpId) : null;

      const ticketInsert = {
        trip_id: parseInt(selectedTripId),
        seat_number: selectedSeat,
        passenger_name: passengerName,
        passenger_ci: passengerCI,
        dest_segment_id: selectedDestId ? parseInt(selectedDestId) : null,
        price_paid: ticketPrice,
        status: 'ACTIVE',
        sold_by: currentUser?.id
      };

      const { data, error } = await supabase
        .from('tickets')
        .insert(ticketInsert)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('finances').insert({
        trip_id: parseInt(selectedTripId),
        user_id: currentUser?.id,
        concept: isCorporate
          ? `Boleto Asiento ${selectedSeat} (${passengerName}) - Convenio: ${selectedCorp?.company_name}`
          : `Venta boleto - Asiento ${selectedSeat} (${passengerName})`,
        amount: ticketPrice,
        type: 'INCOME'
      });

      setLastSoldTicket({
        id: data.id,
        seat_number: selectedSeat,
        passenger_name: passengerName,
        passenger_ci: passengerCI,
        origin: 'Uyuni',
        destination: endSegment,
        price_paid: ticketPrice,
        trip_date: trip ? trip.trip_date : 'Hoy',
        departure_time: trip ? trip.departure_time : '14:00',
        plate: trip?.vehicle?.plate || '2314-HBG',
        driver: trip?.driver?.full_name || 'Marcos Ruiz'
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowReceiptModal(true);
      setSelectedSeat(null);
      setPassengerName('');
      setPassengerCI('');
      fetchTripDetails();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Error vendiendo pasaje: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterParcel = async () => {
    if (!senderName || !receiverName || !parcelDesc || !parcelPrice || !selectedTripId) {
      showToast('Complete los datos de la encomienda', 'warning');
      return;
    }

    try {
      setLoading(true);
      const uniqueSuffix = Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      const randomQR = `QR-${uniqueSuffix}`;

      const { error } = await supabase.from('parcels').insert({
        trip_id: parseInt(selectedTripId),
        sender_name: senderName, sender_ci: senderCI, sender_phone: senderPhone,
        receiver_name: receiverName, receiver_ci: receiverCI, receiver_phone: receiverPhone,
        description: parcelDesc, weight_kg: parcelWeight ? parseFloat(parcelWeight) : 0,
        price: parseFloat(parcelPrice), status: 'PENDING', qr_code: randomQR, registered_by: currentUser?.id
      });

      if (error) throw error;

      await supabase.from('finances').insert({
        trip_id: parseInt(selectedTripId), user_id: currentUser?.id,
        concept: `Envío encomienda - De ${senderName} para ${receiverName}`,
        amount: parseFloat(parcelPrice), type: 'INCOME'
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Encomienda registrada — QR: ${randomQR}`, 'success');
      setSenderName(''); setSenderCI(''); setSenderPhone('');
      setReceiverName(''); setReceiverCI(''); setReceiverPhone('');
      setParcelDesc(''); setParcelWeight(''); setParcelPrice('');
      fetchTripDetails();
    } catch (e: any) {
      showToast('Error al registrar encomienda: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterExpense = async () => {
    if (!expenseConcept || !expenseAmount) {
      showToast('Ingrese concepto y monto del gasto', 'warning');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('finances').insert({
        trip_id: selectedTripId ? parseInt(selectedTripId) : null,
        user_id: currentUser?.id,
        concept: `Gasto Oficina: ${expenseConcept}`,
        amount: parseFloat(expenseAmount),
        type: 'EXPENSE'
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Gasto registrado correctamente', 'success');
      setExpenseConcept('');
      setExpenseAmount('');
      fetchTripDetails();
    } catch (e: any) {
      showToast('Error al registrar gasto: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicket = async (ticketId: number, pricePaid: number) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('tickets').update({ status: 'CANCELLED' }).eq('id', ticketId);
      if (error) throw error;
      await supabase.from('finances').insert({
        trip_id: selectedTripId ? parseInt(selectedTripId) : null,
        user_id: currentUser?.id,
        concept: `Anulación de boleto #${ticketId}`,
        amount: pricePaid, type: 'EXPENSE'
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Boleto anulado y reembolsado', 'info');
      fetchTripDetails();
    } catch (e: any) {
      showToast('Error anulando boleto: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTripDetails();
    setRefreshing(false);
  };

  const seatStatusData: Record<number, string> = {};
  occupiedSeats.forEach(seat => { seatStatusData[seat] = 'occupied'; });
  if (selectedSeat) { seatStatusData[selectedSeat] = 'reserved'; }

  return (
    <SafeAreaView style={styles.container}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onDismiss={() => setToastVisible(false)} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Boletería</Text>
          <Text style={styles.headerSubtitle}>
            {currentUser ? currentUser.full_name : 'Operador'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <AnimatedPressable style={styles.iconButton} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable style={styles.iconButton} onPress={handleLogout}>
            <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.danger} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedWrapper}>
        <SegmentedControl
          segments={tabNames}
          selectedIndex={activeTabIndex}
          onChange={setActiveTabIndex}
        />
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Procesando...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* SELECCIONAR VIAJE ACTIVO */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Viaje Activo</Text>
            {tripsList.length === 0 ? (
              <Text style={styles.emptyText}>No hay viajes programados</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
                {tripsList.map((trip) => (
                  <AnimatedPressable
                    key={trip.id}
                    style={[styles.chipButton, selectedTripId == trip.id.toString() && styles.chipButtonActive]}
                    onPress={() => setSelectedTripId(trip.id.toString())}
                  >
                    <Text style={[styles.chipText, selectedTripId == trip.id.toString() && styles.chipTextActive]}>
                      {trip.route?.name} ({trip.departure_time?.substring(0, 5)})
                    </Text>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* TAB 1: PASAJES */}
          {activeTabIndex === 0 && (
            <View style={styles.tabContent}>
              <SeatMap seatsData={seatStatusData} onSeatPress={handleSeatPress} />

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Detalles del Pasaje</Text>

                {/* Asiento seleccionado */}
                <View style={styles.seatBadgeRow}>
                  <Text style={styles.fieldLabel}>Asiento</Text>
                  <View style={[styles.seatBadge, !selectedSeat && { backgroundColor: colors.surface }]}>
                    <Text style={[styles.seatBadgeText, !selectedSeat && { color: colors.textSecondary }]}>
                      {selectedSeat ? `#${selectedSeat}` : '—'}
                    </Text>
                  </View>
                </View>

                {/* Tramo de destino */}
                <Text style={styles.fieldLabel}>Destino</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {segmentsList.map((seg) => (
                    <AnimatedPressable
                      key={seg.id}
                      style={[styles.chipButton, selectedDestId == seg.id.toString() && styles.chipButtonActive]}
                      onPress={() => { setSelectedDestId(seg.id.toString()); setEndSegment(seg.destination); setTicketPrice(parseFloat(seg.price.toString())); }}
                    >
                      <Text style={[styles.chipText, selectedDestId == seg.id.toString() && styles.chipTextActive]}>
                        {seg.destination} — Bs. {seg.price}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>

                {/* Tipo de pago */}
                <Text style={styles.fieldLabel}>Tipo de Pago</Text>
                <View style={styles.paymentRow}>
                  <AnimatedPressable
                    style={[styles.chipButton, !isCorporate && styles.chipButtonActive]}
                    onPress={() => setIsCorporate(false)}
                  >
                    <Text style={[styles.chipText, !isCorporate && styles.chipTextActive]}>Efectivo</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[styles.chipButton, isCorporate && styles.chipButtonActive]}
                    onPress={() => setIsCorporate(true)}
                  >
                    <Text style={[styles.chipText, isCorporate && styles.chipTextActive]}>Convenio</Text>
                  </AnimatedPressable>
                </View>

                {isCorporate && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {corporateAccountsList.map((corp) => (
                      <AnimatedPressable
                        key={corp.id}
                        style={[styles.chipButton, selectedCorpId == corp.id.toString() && styles.chipButtonActive]}
                        onPress={() => setSelectedCorpId(corp.id.toString())}
                      >
                        <Text style={[styles.chipText, selectedCorpId == corp.id.toString() && styles.chipTextActive]}>
                          {corp.company_name}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                )}

                {/* Campos de pasajero */}
                <Text style={styles.fieldLabel}>C.I. / Documento</Text>
                <TextInput style={styles.input} placeholder="Ej. 1234567-LP" placeholderTextColor={colors.textTertiary}
                  value={passengerCI} onChangeText={setPassengerCI} autoCapitalize="characters" />

                <Text style={styles.fieldLabel}>Nombre del Pasajero</Text>
                <TextInput style={styles.input} placeholder="Nombre Completo" placeholderTextColor={colors.textTertiary}
                  value={passengerName} onChangeText={setPassengerName} />

                {/* Precio */}
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total</Text>
                  <Text style={styles.priceValue}>Bs. {ticketPrice.toFixed(2)}</Text>
                </View>

                {/* Botón emitir */}
                <AnimatedPressable
                  style={[styles.primaryButton, !selectedSeat && styles.buttonDisabled]}
                  disabled={!selectedSeat}
                  onPress={handlePurchase}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.primaryButtonText}>Emitir Boleto</Text>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* TAB 2: ENCOMIENDAS */}
          {activeTabIndex === 1 && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nueva Encomienda</Text>

                <Text style={styles.sectionLabel}>Remitente</Text>
                <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={colors.textTertiary}
                  value={senderName} onChangeText={setSenderName} />
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="C.I." placeholderTextColor={colors.textTertiary}
                    value={senderCI} onChangeText={setSenderCI} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Teléfono" placeholderTextColor={colors.textTertiary}
                    value={senderPhone} onChangeText={setSenderPhone} keyboardType="phone-pad" />
                </View>

                <Text style={styles.sectionLabel}>Destinatario</Text>
                <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={colors.textTertiary}
                  value={receiverName} onChangeText={setReceiverName} />
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="C.I." placeholderTextColor={colors.textTertiary}
                    value={receiverCI} onChangeText={setReceiverCI} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Teléfono" placeholderTextColor={colors.textTertiary}
                    value={receiverPhone} onChangeText={setReceiverPhone} keyboardType="phone-pad" />
                </View>

                <Text style={styles.sectionLabel}>Detalle del Envío</Text>
                <TextInput style={styles.input} placeholder="Descripción (ej. Caja de repuestos)" placeholderTextColor={colors.textTertiary}
                  value={parcelDesc} onChangeText={setParcelDesc} />
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Peso (Kg)" placeholderTextColor={colors.textTertiary}
                    value={parcelWeight} onChangeText={setParcelWeight} keyboardType="numeric" />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Costo (Bs.)" placeholderTextColor={colors.textTertiary}
                    value={parcelPrice} onChangeText={setParcelPrice} keyboardType="numeric" />
                </View>

                <AnimatedPressable style={styles.primaryButton} onPress={handleRegisterParcel}>
                  <Ionicons name="cube" size={20} color="#FFF" />
                  <Text style={styles.primaryButtonText}>Registrar Encomienda</Text>
                </AnimatedPressable>
              </View>

              {/* Lista de encomiendas */}
              <Text style={styles.listTitle}>Encomiendas del Viaje ({parcelsList.length})</Text>
              {parcelsList.length === 0 ? (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>Sin encomiendas en este viaje</Text></View>
              ) : (
                parcelsList.map(parcel => (
                  <View key={parcel.id} style={styles.listCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listCardTitle}>{parcel.description}</Text>
                      <Text style={styles.listCardSub}>De: {parcel.sender_name} → {parcel.receiver_name}</Text>
                      <Text style={styles.listCardSub}>{parcel.weight_kg} Kg · Bs. {parseFloat(parcel.price).toFixed(2)} · {parcel.qr_code}</Text>
                    </View>
                    <View style={[styles.statusPill, {
                      backgroundColor: parcel.status === 'DELIVERED' ? colors.tintSuccess :
                        parcel.status === 'IN_TRANSIT' ? colors.tint : colors.tintWarning
                    }]}>
                      <Text style={[styles.statusPillText, {
                        color: parcel.status === 'DELIVERED' ? colors.success :
                          parcel.status === 'IN_TRANSIT' ? colors.primary : colors.warning
                      }]}>
                        {parcel.status === 'PENDING' ? 'Pendiente' : parcel.status === 'IN_TRANSIT' ? 'En Ruta' : 'Entregado'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: SALIDAS (KANBAN) */}
          {activeTabIndex === 2 && (
            <View style={styles.tabContent}>
              <Text style={styles.listTitle}>Control de Despacho</Text>

              {/* Programados */}
              <View style={styles.kanbanSection}>
                <View style={[styles.kanbanHeader, { borderLeftColor: colors.primary }]}>
                  <Text style={styles.kanbanHeaderText}>📅 Programados</Text>
                </View>
                {tripsList.filter(t => t.status === 'SCHEDULED').length === 0 ? (
                  <Text style={styles.kanbanEmpty}>Sin viajes programados</Text>
                ) : (
                  tripsList.filter(t => t.status === 'SCHEDULED').map(trip => (
                    <View key={trip.id} style={styles.kanbanCard}>
                      <Text style={styles.kanbanCardTitle}>{trip.route?.name}</Text>
                      <Text style={styles.kanbanCardSub}>Salida: {trip.departure_time?.substring(0, 5)} · {trip.vehicle?.plate} · {trip.driver?.full_name}</Text>
                      <AnimatedPressable style={[styles.kanbanBtn, { backgroundColor: colors.primary }]}
                        onPress={async () => { setLoading(true); await supabase.from('trips').update({ status: 'BOARDING' }).eq('id', trip.id); showToast('Minibús en abordaje', 'info'); loadInitialData(); }}>
                        <Text style={styles.kanbanBtnText}>Iniciar Abordaje</Text>
                      </AnimatedPressable>
                    </View>
                  ))
                )}
              </View>

              {/* Abordando */}
              <View style={styles.kanbanSection}>
                <View style={[styles.kanbanHeader, { borderLeftColor: colors.warning }]}>
                  <Text style={styles.kanbanHeaderText}>🚪 Abordando</Text>
                </View>
                {tripsList.filter(t => t.status === 'BOARDING').length === 0 ? (
                  <Text style={styles.kanbanEmpty}>Sin viajes en abordaje</Text>
                ) : (
                  tripsList.filter(t => t.status === 'BOARDING').map(trip => (
                    <View key={trip.id} style={styles.kanbanCard}>
                      <Text style={styles.kanbanCardTitle}>{trip.route?.name}</Text>
                      <Text style={styles.kanbanCardSub}>Salida: {trip.departure_time?.substring(0, 5)} · {trip.vehicle?.plate} · {trip.driver?.full_name}</Text>
                      <AnimatedPressable style={[styles.kanbanBtn, { backgroundColor: colors.success }]}
                        onPress={async () => {
                          setLoading(true);
                          await supabase.from('trips').update({ status: 'IN_PROGRESS' }).eq('id', trip.id);
                          await supabase.from('events').insert({
                            trip_id: trip.id, driver_id: trip.driver_id, event_type: 'DEPARTURE_MARK',
                            payload: { location: trip.route?.origin, time: new Date().toISOString() }
                          });
                          showToast('Minibús despachado a ruta', 'success');
                          loadInitialData();
                        }}>
                        <Text style={styles.kanbanBtnText}>Despachar</Text>
                      </AnimatedPressable>
                    </View>
                  ))
                )}
              </View>

              {/* En Ruta */}
              <View style={styles.kanbanSection}>
                <View style={[styles.kanbanHeader, { borderLeftColor: colors.success }]}>
                  <Text style={styles.kanbanHeaderText}>🟢 En Ruta</Text>
                </View>
                {tripsList.filter(t => t.status === 'IN_PROGRESS').length === 0 ? (
                  <Text style={styles.kanbanEmpty}>Sin viajes en ruta</Text>
                ) : (
                  tripsList.filter(t => t.status === 'IN_PROGRESS').map(trip => (
                    <View key={trip.id} style={styles.kanbanCard}>
                      <Text style={styles.kanbanCardTitle}>{trip.route?.name}</Text>
                      <Text style={styles.kanbanCardSub}>{trip.departure_time?.substring(0, 5)} · {trip.vehicle?.plate} · {trip.driver?.full_name}</Text>
                      <View style={[styles.statusPill, { backgroundColor: colors.tintSuccess, alignSelf: 'flex-start', marginTop: 8 }]}>
                        <Text style={[styles.statusPillText, { color: colors.success }]}>En viaje</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB 4: CAJA */}
          {activeTabIndex === 3 && (
            <View style={styles.tabContent}>
              {/* KPIs */}
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { borderLeftColor: colors.success }]}>
                  <Text style={styles.kpiLabel}>Ingresos</Text>
                  <Text style={[styles.kpiValue, { color: colors.success }]}>Bs. {officeIncomes.toFixed(2)}</Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: colors.danger }]}>
                  <Text style={styles.kpiLabel}>Egresos</Text>
                  <Text style={[styles.kpiValue, { color: colors.danger }]}>Bs. {officeExpenses.toFixed(2)}</Text>
                </View>
              </View>

              <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
                <Text style={styles.kpiLabel}>Saldo Neto</Text>
                <Text style={[styles.kpiValueLarge, { color: officeIncomes - officeExpenses >= 0 ? colors.primary : colors.danger }]}>
                  Bs. {(officeIncomes - officeExpenses).toFixed(2)}
                </Text>
              </View>

              {cashRegister && (
                <AnimatedPressable
                  style={[styles.primaryButton, { backgroundColor: colors.danger }]}
                  onPress={() => {
                    const expected = parseFloat(cashRegister.initial_amount.toString()) + officeIncomes - officeExpenses;
                    setFinalCashInput(expected.toFixed(2));
                    setShowCashCloseModal(true);
                  }}
                >
                  <Ionicons name="lock-closed" size={20} color="#FFF" />
                  <Text style={styles.primaryButtonText}>Cerrar Caja</Text>
                </AnimatedPressable>
              )}

              {/* Registrar gasto */}
              <View style={[styles.card, { marginTop: 16 }]}>
                <Text style={styles.cardTitle}>Registrar Gasto</Text>
                <TextInput style={styles.input} placeholder="Concepto (ej. Compra de hojas)" placeholderTextColor={colors.textTertiary}
                  value={expenseConcept} onChangeText={setExpenseConcept} />
                <TextInput style={styles.input} placeholder="Monto (Bs.)" placeholderTextColor={colors.textTertiary}
                  value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="numeric" />
                <AnimatedPressable style={[styles.primaryButton, { backgroundColor: colors.danger }]} onPress={handleRegisterExpense}>
                  <Ionicons name="remove-circle" size={20} color="#FFF" />
                  <Text style={styles.primaryButtonText}>Registrar Egreso</Text>
                </AnimatedPressable>
              </View>

              {/* Ventas del turno */}
              <Text style={[styles.listTitle, { marginTop: 24 }]}>Ventas del Turno ({mySalesToday.length})</Text>
              {mySalesToday.length === 0 ? (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>Sin ventas en este turno</Text></View>
              ) : (
                mySalesToday.map((sale) => (
                  <View key={sale.id} style={styles.listCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listCardTitle}>Asiento #{sale.seat_number} — {sale.passenger_name}</Text>
                      <Text style={styles.listCardSub}>{sale.trip?.route?.name} · {sale.trip?.departure_time?.substring(0, 5)} · Bs. {parseFloat(sale.price_paid).toFixed(2)}</Text>
                    </View>
                    {sale.status === 'ACTIVE' ? (
                      <AnimatedPressable style={styles.cancelPill} onPress={() => handleCancelTicket(sale.id, parseFloat(sale.price_paid))}>
                        <Text style={styles.cancelPillText}>Anular</Text>
                      </AnimatedPressable>
                    ) : (
                      <View style={[styles.statusPill, { backgroundColor: colors.tintDanger }]}>
                        <Text style={[styles.statusPillText, { color: colors.danger }]}>Anulado</Text>
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
      <Modal visible={showReceiptModal} transparent animationType="fade" onRequestClose={() => setShowReceiptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.receiptHeader}>SINDICATO TRANS</Text>
            <Text style={styles.receiptSub}>Boleto Digital de Viaje</Text>
            <View style={styles.divider} />
            {lastSoldTicket && (
              <View style={styles.receiptBody}>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>ID</Text><Text style={styles.receiptVal}>#{lastSoldTicket.id}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Fecha</Text><Text style={styles.receiptVal}>{lastSoldTicket.trip_date} {lastSoldTicket.departure_time?.substring(0, 5)}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Vehículo</Text><Text style={styles.receiptVal}>{lastSoldTicket.plate}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Chofer</Text><Text style={styles.receiptVal}>{lastSoldTicket.driver}</Text></View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Pasajero</Text><Text style={styles.receiptValBold}>{lastSoldTicket.passenger_name}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>C.I.</Text><Text style={styles.receiptVal}>{lastSoldTicket.passenger_ci}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Ruta</Text><Text style={styles.receiptVal}>{lastSoldTicket.origin} ➔ {lastSoldTicket.destination}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Asiento</Text><Text style={[styles.receiptValBold, { color: colors.primary, fontSize: 20 }]}>{lastSoldTicket.seat_number}</Text></View>
                <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Monto</Text><Text style={[styles.receiptValBold, { color: colors.success, fontSize: 20 }]}>Bs. {parseFloat(lastSoldTicket.price_paid).toFixed(2)}</Text></View>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.modalActions}>
              <AnimatedPressable style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => { showToast('Imprimiendo recibo...', 'info'); setShowReceiptModal(false); }}>
                <Ionicons name="print-outline" size={18} color="#FFF" />
                <Text style={styles.modalBtnText}>Imprimir</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[styles.modalBtn, { backgroundColor: '#25D366' }]} onPress={handleShareWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                <Text style={styles.modalBtnText}>Enviar</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setShowReceiptModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cerrar</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL APERTURA DE CAJA */}
      <Modal visible={showCashOpenModal && !cashRegister} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 28 }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.tint }]}>
              <Ionicons name="lock-open" size={32} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Apertura de Caja</Text>
            <Text style={styles.modalDesc}>Registre el saldo inicial de caja para iniciar operaciones.</Text>
            <TextInput style={[styles.input, { textAlign: 'center', fontSize: 20 }]} placeholder="Monto Inicial (Bs.)"
              value={initialCashInput} onChangeText={setInitialCashInput} keyboardType="numeric" />
            <AnimatedPressable style={styles.primaryButton} onPress={handleOpenCashRegister}>
              <Text style={styles.primaryButtonText}>Abrir Caja</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* MODAL CIERRE DE CAJA */}
      <Modal visible={showCashCloseModal} transparent animationType="fade" onRequestClose={() => setShowCashCloseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 28 }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.tintDanger }]}>
              <Ionicons name="lock-closed" size={32} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Cierre de Caja</Text>
            <Text style={styles.modalDesc}>Arqueo de caja. Ingrese el total de efectivo físico.</Text>
            <View style={styles.receiptBody}>
              <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Saldo Inicial</Text><Text style={styles.receiptVal}>Bs. {parseFloat(cashRegister?.initial_amount.toString() || '0').toFixed(2)}</Text></View>
              <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Ingresos</Text><Text style={styles.receiptVal}>Bs. {officeIncomes.toFixed(2)}</Text></View>
              <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Gastos</Text><Text style={styles.receiptVal}>Bs. {officeExpenses.toFixed(2)}</Text></View>
              <View style={styles.divider} />
              <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Esperado</Text><Text style={styles.receiptValBold}>Bs. {(parseFloat(cashRegister?.initial_amount.toString() || '0') + officeIncomes - officeExpenses).toFixed(2)}</Text></View>
            </View>
            <TextInput style={[styles.input, { textAlign: 'center', fontSize: 20 }]} placeholder="Efectivo en mano (Bs.)"
              value={finalCashInput} onChangeText={setFinalCashInput} keyboardType="numeric" />
            <AnimatedPressable style={[styles.primaryButton, { backgroundColor: colors.danger }]} onPress={handleCloseCashRegister}>
              <Text style={styles.primaryButtonText}>Confirmar Cierre</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.textButton} onPress={() => setShowCashCloseModal(false)}>
              <Text style={styles.textButtonLabel}>Cancelar</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card },
  headerTitle: { ...typography.title2, color: colors.text },
  headerSubtitle: { ...typography.footnote, color: colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },

  // Segmented
  segmentedWrapper: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 0.5, borderBottomColor: colors.separator },

  // Scroll
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  loadingText: { ...typography.footnote, color: colors.textSecondary, marginTop: 12 },

  // Cards
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardLabel: { ...typography.footnote, color: colors.textSecondary, fontFamily: typography.fontFamilySemiBold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { ...typography.title3, color: colors.text, marginBottom: 16 },

  // Chips
  chipButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, marginRight: 8 },
  chipButtonActive: { backgroundColor: colors.primary },
  chipText: { ...typography.subhead, color: colors.text },
  chipTextActive: { color: '#FFF', fontFamily: typography.fontFamilySemiBold },

  // Tabs content
  tabContent: { gap: 16 },

  // Seat badge
  seatBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  seatBadge: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  seatBadgeText: { ...typography.headline, color: '#FFF' },
  fieldLabel: { ...typography.footnote, color: colors.textSecondary, fontFamily: typography.fontFamilySemiBold, marginBottom: 6, marginTop: 4 },

  // Payment row
  paymentRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  // Inputs
  input: { ...typography.body, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 8 },

  // Price
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 0.5, borderTopColor: colors.separator, marginBottom: 8 },
  priceLabel: { ...typography.headline, color: colors.text },
  priceValue: { ...typography.title2, color: colors.success },

  // Buttons
  primaryButton: { flexDirection: 'row', height: 52, backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { backgroundColor: colors.surface, shadowOpacity: 0 },
  primaryButtonText: { ...typography.headline, color: '#FFF' },
  textButton: { paddingVertical: 12, alignItems: 'center' },
  textButtonLabel: { ...typography.subhead, color: colors.textSecondary },

  // Section label
  sectionLabel: { ...typography.caption1, color: colors.primary, fontFamily: typography.fontFamilySemiBold, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Lists
  listTitle: { ...typography.title3, color: colors.text, marginBottom: 8 },
  listCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  listCardTitle: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: colors.text },
  listCardSub: { ...typography.caption1, color: colors.textSecondary, marginTop: 3 },

  // Status pills
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold },
  cancelPill: { backgroundColor: colors.tintDanger, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  cancelPillText: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold, color: colors.danger },

  // Empty
  emptyCard: { backgroundColor: colors.card, padding: 32, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  emptyText: { ...typography.subhead, color: colors.textSecondary },

  // Kanban
  kanbanSection: { backgroundColor: colors.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  kanbanHeader: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 12 },
  kanbanHeaderText: { ...typography.headline, color: colors.text },
  kanbanCard: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 10 },
  kanbanCardTitle: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: colors.text },
  kanbanCardSub: { ...typography.caption1, color: colors.textSecondary, marginTop: 3 },
  kanbanBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  kanbanBtnText: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },
  kanbanEmpty: { ...typography.subhead, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },

  // KPIs
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: { flex: 1, backgroundColor: colors.card, padding: 20, borderRadius: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  kpiLabel: { ...typography.footnote, color: colors.textSecondary, marginBottom: 6 },
  kpiValue: { ...typography.title2, color: colors.text },
  kpiValueLarge: { ...typography.largeTitle, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  modalIconCircle: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.title3, color: colors.text, marginBottom: 6 },
  modalDesc: { ...typography.footnote, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', width: '100%', gap: 8, marginTop: 16 },
  modalBtn: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 },
  modalBtnText: { ...typography.subhead, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },

  // Receipt
  receiptHeader: { ...typography.headline, color: colors.text, textAlign: 'center' },
  receiptSub: { ...typography.caption1, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  divider: { height: 0.5, backgroundColor: colors.separator, width: '100%', marginVertical: 14 },
  receiptBody: { width: '100%' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptLabel: { ...typography.caption1, color: colors.textSecondary },
  receiptVal: { ...typography.caption1, color: colors.text },
  receiptValBold: { ...typography.caption1, fontFamily: typography.fontFamilySemiBold, color: colors.text },
});

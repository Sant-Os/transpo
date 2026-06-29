import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import SeatMap from '../../components/SeatMap';

export default function SecretaryPosScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pasajes'); // 'pasajes' | 'encomiendas' | 'caja'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Datos comunes
  const [tripsList, setTripsList] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  // TAB 1: Pasajes
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [passengerName, setPassengerName] = useState('');
  const [passengerCI, setPassengerCI] = useState('');
  const [startSegment, setStartSegment] = useState('Uyuni');
  const [endSegment, setEndSegment] = useState('San Cristóbal');

  // Dynamic booking details
  const [segmentsList, setSegmentsList] = useState([]);
  const [ticketPrice, setTicketPrice] = useState(35.00);
  const [selectedDestId, setSelectedDestId] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  
  // Modal de Boleto Digital
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSoldTicket, setLastSoldTicket] = useState(null);

  // TAB 2: Encomiendas
  const [senderName, setSenderName] = useState('');
  const [senderCI, setSenderCI] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverCI, setReceiverCI] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [parcelDesc, setParcelDesc] = useState('');
  const [parcelWeight, setParcelWeight] = useState('');
  const [parcelPrice, setParcelPrice] = useState('');
  const [parcelsList, setParcelsList] = useState([]);

  // TAB 3: Caja y Gastos
  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [mySalesToday, setMySalesToday] = useState([]);
  const [officeIncomes, setOfficeIncomes] = useState(0);
  const [officeExpenses, setOfficeExpenses] = useState(0);

  // Cuentas Corporativas
  const [corporateAccountsList, setCorporateAccountsList] = useState([]);
  const [selectedCorpId, setSelectedCorpId] = useState(null);
  const [isCorporate, setIsCorporate] = useState(false);

  // Apertura y Cierre de Caja
  const [cashRegister, setCashRegister] = useState(null);
  const [initialCashInput, setInitialCashInput] = useState('100.00');
  const [showCashOpenModal, setShowCashOpenModal] = useState(false);
  const [showCashCloseModal, setShowCashCloseModal] = useState(false);
  const [finalCashInput, setFinalCashInput] = useState('0.00');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        // Cargar Caja Abierta
        const { data: activeReg } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('opened_by', user.id)
          .eq('status', 'OPEN')
          .limit(1)
          .maybeSingle();

        if (activeReg) {
          setCashRegister(activeReg);
        } else {
          setShowCashOpenModal(true);
        }
      }

      // Cargar viajes del día
      const { data: trips } = await supabase
        .from('trips')
        .select('*, route:routes(name, origin, destination), vehicle:vehicles(plate, model), driver:users(full_name)')
        .order('departure_time', { ascending: true });
      
      if (trips && trips.length > 0) {
        setTripsList(trips);
        setSelectedTripId(trips[0].id.toString());
      }

      // Cargar tramos
      const { data: segments } = await supabase
        .from('segments')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (segments && segments.length > 0) {
        setSegmentsList(segments);
        const lastSeg = segments[segments.length - 1];
        setEndSegment(lastSeg.destination);
        setSelectedDestId(lastSeg.id.toString());
        setTicketPrice(parseFloat(lastSeg.price));
      }

      // Cargar cuentas corporativas
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

  // Cargar boletos y encomiendas cuando cambia el viaje seleccionado
  useEffect(() => {
    if (!selectedTripId) return;
    fetchTripDetails();
  }, [selectedTripId]);

  const fetchTripDetails = async () => {
    try {
      // Asientos ocupados
      const { data: tickets } = await supabase
        .from('tickets')
        .select('seat_number')
        .eq('trip_id', parseInt(selectedTripId))
        .eq('status', 'ACTIVE');
      
      if (tickets) {
        setOccupiedSeats(tickets.map(t => t.seat_number));
      } else {
        setOccupiedSeats([]);
      }

      // Encomiendas del viaje
      const { data: parcels } = await supabase
        .from('parcels')
        .select('*')
        .eq('trip_id', parseInt(selectedTripId))
        .order('created_at', { ascending: false });
      
      if (parcels) setParcelsList(parcels);

      // Cargar resumen financiero y ventas del día de esta secretaria
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
          const inc = finances.filter(f => f.type === 'INCOME').reduce((sum, f) => sum + parseFloat(f.amount), 0);
          const exp = finances.filter(f => f.type === 'EXPENSE').reduce((sum, f) => sum + parseFloat(f.amount), 0);
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
    if (!initialCashInput) {
      alert('Ingrese un monto inicial');
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          opened_by: currentUser?.id,
          initial_amount: parseFloat(initialCashInput),
          status: 'OPEN'
        })
        .select()
        .single();
      if (error) throw error;
      setCashRegister(data);
      setShowCashOpenModal(false);
      alert('Caja abierta con éxito');
    } catch (e) {
      alert('Error abriendo caja: ' + e.message);
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
        .update({
          closed_at: new Date().toISOString(),
          final_amount: parseFloat(finalCashInput),
          status: 'CLOSED'
        })
        .eq('id', cashRegister.id);
      if (error) throw error;
      setCashRegister(null);
      setShowCashCloseModal(false);
      alert('Caja cerrada con éxito');
      setShowCashOpenModal(true);
    } catch (e) {
      alert('Error cerrando caja: ' + e.message);
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
    
    alert(`Enlace de WhatsApp generado:\n\nhttps://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const handleSeatPress = (seatNumber, status) => {
    if (status !== 'free') {
      alert(`El asiento ${seatNumber} no está disponible.`);
      return;
    }
    setSelectedSeat(seatNumber);
  };

  // Vender Boleto
  const handlePurchase = async () => {
    if (!selectedSeat || !passengerName || !passengerCI || !selectedTripId) {
      alert("Por favor complete todos los campos de pasajero y asiento");
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

      // Registrar movimiento de ingreso (especificando si es convenio corp)
      await supabase.from('finances').insert({
        trip_id: parseInt(selectedTripId),
        user_id: currentUser?.id,
        concept: isCorporate 
          ? `Boleto Asiento ${selectedSeat} (${passengerName}) - Convenio: ${selectedCorp?.company_name}`
          : `Venta boleto - Asiento ${selectedSeat} (${passengerName})`,
        amount: ticketPrice,
        type: 'INCOME'
      });

      // Guardar información del boleto vendido para el recibo modal
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

      setShowReceiptModal(true);

      // Limpiar formulario pasajes
      setSelectedSeat(null);
      setPassengerName('');
      setPassengerCI('');
      fetchTripDetails();
    } catch (e) {
      alert('Error vendiendo pasaje: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Registrar Encomienda
  const handleRegisterParcel = async () => {
    if (!senderName || !receiverName || !parcelDesc || !parcelPrice || !selectedTripId) {
      alert('Por favor complete los datos de la encomienda (remitente, destinatario, detalle y costo)');
      return;
    }

    try {
      setLoading(true);
      const randomQR = 'QR-' + Math.floor(100000 + Math.random() * 900000);

      const { error } = await supabase.from('parcels').insert({
        trip_id: parseInt(selectedTripId),
        sender_name: senderName,
        sender_ci: senderCI,
        sender_phone: senderPhone,
        receiver_name: receiverName,
        receiver_ci: receiverCI,
        receiver_phone: receiverPhone,
        description: parcelDesc,
        weight_kg: parcelWeight ? parseFloat(parcelWeight) : 0,
        price: parseFloat(parcelPrice),
        status: 'PENDING',
        qr_code: randomQR,
        registered_by: currentUser?.id
      });

      if (error) throw error;

      // Registrar movimiento de ingreso
      await supabase.from('finances').insert({
        trip_id: parseInt(selectedTripId),
        user_id: currentUser?.id,
        concept: `Envío encomienda - De ${senderName} para ${receiverName}`,
        amount: parseFloat(parcelPrice),
        type: 'INCOME'
      });

      alert(`Encomienda registrada con éxito!\nCódigo QR asignado: ${randomQR}`);

      // Limpiar formulario encomiendas
      setSenderName('');
      setSenderCI('');
      setSenderPhone('');
      setReceiverName('');
      setReceiverCI('');
      setReceiverPhone('');
      setParcelDesc('');
      setParcelWeight('');
      setParcelPrice('');
      fetchTripDetails();
    } catch (e) {
      alert('Error al registrar encomienda: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Registrar Gasto
  const handleRegisterExpense = async () => {
    if (!expenseConcept || !expenseAmount) {
      alert('Ingrese concepto y monto del gasto');
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

      alert('Gasto registrado correctamente');
      setExpenseConcept('');
      setExpenseAmount('');
      fetchTripDetails();
    } catch (e) {
      alert('Error al registrar gasto: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Anular boleto vendido
  const handleCancelTicket = async (ticketId, pricePaid) => {
    try {
      setLoading(true);
      // Actualizar estado del ticket
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'CANCELLED' })
        .eq('id', ticketId);

      if (error) throw error;

      // Registrar movimiento de egreso compensatorio
      await supabase.from('finances').insert({
        trip_id: selectedTripId ? parseInt(selectedTripId) : null,
        user_id: currentUser?.id,
        concept: `Anulación de boleto #${ticketId}`,
        amount: parseFloat(pricePaid),
        type: 'EXPENSE'
      });

      alert('Boleto anulado y reembolsado');
      fetchTripDetails();
    } catch (e) {
      alert('Error anulando boleto: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTripDetails();
    setRefreshing(false);
  };

  // Render Seat Status Map
  const seatStatusData = {};
  occupiedSeats.forEach(seat => {
    seatStatusData[seat] = 'occupied';
  });
  if (selectedSeat) {
    seatStatusData[selectedSeat] = 'reserved';
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Boletería POS</Text>
          <Text style={styles.headerSubtitle}>
            {currentUser ? `Operador: ${currentUser.full_name}` : 'Boletería'}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'pasajes' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pasajes')}
        >
          <Ionicons name="ticket" size={20} color={activeTab === 'pasajes' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'pasajes' && styles.tabTextActive]}>Pasajes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'encomiendas' && styles.tabButtonActive]}
          onPress={() => setActiveTab('encomiendas')}
        >
          <Ionicons name="cube" size={20} color={activeTab === 'encomiendas' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'encomiendas' && styles.tabTextActive]}>Encomiendas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'salidas' && styles.tabButtonActive]}
          onPress={() => setActiveTab('salidas')}
        >
          <Ionicons name="git-pull-request-outline" size={20} color={activeTab === 'salidas' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'salidas' && styles.tabTextActive]}>Salidas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'caja' && styles.tabButtonActive]}
          onPress={() => setActiveTab('caja')}
        >
          <Ionicons name="cash" size={20} color={activeTab === 'caja' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'caja' && styles.tabTextActive]}>Caja/Gastos</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, ...typography.caption, color: colors.textSecondary }}>Procesando operación...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {/* SELECCIONAR VIAJE ACTIVO AL INICIO DE LA PESTAÑA */}
          <View style={[styles.card, { marginBottom: 16 }]}>
            <Text style={styles.label}>Seleccionar Viaje Activo</Text>
            {tripsList.length === 0 ? (
              <Text style={{ color: colors.danger, ...typography.caption }}>No hay viajes programados hoy</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                {tripsList.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={[
                      styles.selectionBtn,
                      selectedTripId == trip.id.toString() && styles.selectionBtnActive
                    ]}
                    onPress={() => setSelectedTripId(trip.id.toString())}
                  >
                    <Text style={[
                      styles.selectionBtnText,
                      selectedTripId == trip.id.toString() && styles.selectionBtnTextActive
                    ]}>
                      {trip.route?.name} ({trip.departure_time?.substring(0, 5)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ========================================================= */}
          {/* TAB 1: BOLETERÍA PASAJES */}
          {/* ========================================================= */}
          {activeTab === 'pasajes' && (
            <View style={styles.contentLayout}>
              {/* Lado Izquierdo: Asientos */}
              <View style={styles.mapSection}>
                <Text style={styles.sectionTitle}>Selección de Asiento</Text>
                <SeatMap seatsData={seatStatusData} onSeatPress={handleSeatPress} />
              </View>

              {/* Lado Derecho: Formulario */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Detalles de Pasaje</Text>
                <View style={styles.card}>
                  <View style={styles.seatBadgeContainer}>
                    <Text style={styles.seatBadgeLabel}>Asiento Seleccionado</Text>
                    <View style={styles.seatBadge}>
                      <Text style={styles.seatBadgeText}>
                        {selectedSeat ? `#${selectedSeat}` : 'Ninguno'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tramo de Destino</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                      {segmentsList.map((seg) => (
                        <TouchableOpacity
                          key={seg.id}
                          style={[
                            styles.selectionBtn,
                            selectedDestId == seg.id.toString() && styles.selectionBtnActive
                          ]}
                          onPress={() => {
                            setSelectedDestId(seg.id.toString());
                            setEndSegment(seg.destination);
                            setTicketPrice(parseFloat(seg.price));
                          }}
                        >
                          <Text style={[
                            styles.selectionBtnText,
                            selectedDestId == seg.id.toString() && styles.selectionBtnTextActive
                          ]}>
                            {seg.destination} (Bs. {seg.price})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tipo de Pago / Convenio</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <TouchableOpacity
                        style={[styles.selectionBtn, !isCorporate && styles.selectionBtnActive]}
                        onPress={() => setIsCorporate(false)}
                      >
                        <Text style={[styles.selectionBtnText, !isCorporate && styles.selectionBtnTextActive]}>
                          Normal (Efectivo)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.selectionBtn, isCorporate && styles.selectionBtnActive]}
                        onPress={() => setIsCorporate(true)}
                      >
                        <Text style={[styles.selectionBtnText, isCorporate && styles.selectionBtnTextActive]}>
                          Convenio Corporativo
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isCorporate && (
                      <View>
                        <Text style={styles.label}>Seleccionar Empresa</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                          {corporateAccountsList.map((corp) => (
                            <TouchableOpacity
                              key={corp.id}
                              style={[
                                styles.selectionBtn,
                                selectedCorpId == corp.id.toString() && styles.selectionBtnActive
                              ]}
                              onPress={() => setSelectedCorpId(corp.id.toString())}
                            >
                              <Text style={[
                                styles.selectionBtnText,
                                selectedCorpId == corp.id.toString() && styles.selectionBtnTextActive
                              ]}>
                                {corp.company_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>C.I. / Documento Identidad</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. 1234567-LP"
                      placeholderTextColor={colors.textSecondary}
                      value={passengerCI}
                      onChangeText={passengerCI => setPassengerCI(passengerCI)}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre de Pasajero</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre Completo"
                      placeholderTextColor={colors.textSecondary}
                      value={passengerName}
                      onChangeText={passengerName => setPassengerName(passengerName)}
                    />
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Monto total a Pagar</Text>
                    <Text style={styles.priceValue}>Bs. {ticketPrice.toFixed(2)}</Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.buyButton, !selectedSeat && styles.buyButtonDisabled]}
                    disabled={!selectedSeat}
                    onPress={handlePurchase}
                  >
                    <Ionicons name="ticket" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.buyButtonText}>Emitir Boleto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ENCOMIENDAS */}
          {/* ========================================================= */}
          {activeTab === 'encomiendas' && (
            <View>
              <Text style={styles.sectionTitle}>Registrar Nueva Encomienda</Text>
              <View style={styles.card}>
                <Text style={styles.formSubtitleHeader}>Datos del Remitente (Envía)</Text>
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 8 }]}
                    placeholder="Nombre Remitente"
                    placeholderTextColor={colors.textSecondary}
                    value={senderName}
                    onChangeText={setSenderName}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 8, marginLeft: 8 }]}
                    placeholder="C.I. Remitente"
                    placeholderTextColor={colors.textSecondary}
                    value={senderCI}
                    onChangeText={setSenderCI}
                  />
                </View>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Teléfono Remitente"
                  placeholderTextColor={colors.textSecondary}
                  value={senderPhone}
                  onChangeText={setSenderPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.formSubtitleHeader}>Datos del Destinatario (Recibe)</Text>
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 8 }]}
                    placeholder="Nombre Destinatario"
                    placeholderTextColor={colors.textSecondary}
                    value={receiverName}
                    onChangeText={setReceiverName}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 8, marginLeft: 8 }]}
                    placeholder="C.I. Destinatario"
                    placeholderTextColor={colors.textSecondary}
                    value={receiverCI}
                    onChangeText={setReceiverCI}
                  />
                </View>
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Teléfono Destinatario"
                  placeholderTextColor={colors.textSecondary}
                  value={receiverPhone}
                  onChangeText={setReceiverPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.formSubtitleHeader}>Detalles del Envío</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 12 }]}
                  placeholder="Detalle o descripción (ej. Caja con repuestos)"
                  placeholderTextColor={colors.textSecondary}
                  value={parcelDesc}
                  onChangeText={setParcelDesc}
                />
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 16 }]}
                    placeholder="Peso (Kg)"
                    placeholderTextColor={colors.textSecondary}
                    value={parcelWeight}
                    onChangeText={setParcelWeight}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 16, marginLeft: 8 }]}
                    placeholder="Costo de Envío (Bs.)"
                    placeholderTextColor={colors.textSecondary}
                    value={parcelPrice}
                    onChangeText={setParcelPrice}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity style={styles.buyButton} onPress={handleRegisterParcel}>
                  <Ionicons name="cube" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buyButtonText}>Registrar Encomienda</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Encomiendas del Viaje Actual ({parcelsList.length})</Text>
              {parcelsList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No hay encomiendas asignadas a este viaje</Text>
                </View>
              ) : (
                parcelsList.map(parcel => (
                  <View key={parcel.id} style={styles.recordCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordTitle}>{parcel.description}</Text>
                      <Text style={styles.recordSub}>De: {parcel.sender_name} | Para: {parcel.receiver_name}</Text>
                      <Text style={styles.recordSub}>Peso: {parcel.weight_kg} Kg | Envío: Bs. {parseFloat(parcel.price).toFixed(2)}</Text>
                      <Text style={styles.recordSub}>Código QR: {parcel.qr_code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: parcel.status === 'DELIVERED' ? colors.success : 
                        parcel.status === 'IN_TRANSIT' ? colors.primary : colors.warning 
                    }]}>
                      <Text style={styles.statusBadgeText}>
                        {parcel.status === 'PENDING' ? 'Pendiente' : 
                         parcel.status === 'IN_TRANSIT' ? 'En Ruta' : 'Entregado'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB: SALIDAS (KANBAN DE DESPACHO) */}
          {/* ========================================================= */}
          {activeTab === 'salidas' && (
            <View>
              <Text style={styles.sectionTitle}>Kanban de Despacho de Salidas</Text>
              
              <View style={styles.kanbanContainer}>
                {/* Columna 1: Programados */}
                <View style={styles.kanbanColumn}>
                  <Text style={[styles.kanbanColumnTitle, { borderBottomColor: colors.primary }]}>
                    📅 Programados
                  </Text>
                  {tripsList.filter(t => t.status === 'SCHEDULED').length === 0 ? (
                    <Text style={styles.kanbanEmpty}>Sin viajes</Text>
                  ) : (
                    tripsList.filter(t => t.status === 'SCHEDULED').map(trip => (
                      <View key={trip.id} style={styles.kanbanCard}>
                        <Text style={styles.kanbanCardTitle}>{trip.route?.name}</Text>
                        <Text style={styles.kanbanCardSub}>Salida: {trip.departure_time?.substring(0, 5)}</Text>
                        <Text style={styles.kanbanCardSub}>Vehículo: {trip.vehicle?.plate}</Text>
                        <Text style={styles.kanbanCardSub}>Chofer: {trip.driver?.full_name}</Text>
                        <TouchableOpacity
                          style={[styles.kanbanActionBtn, { backgroundColor: colors.primary }]}
                          onPress={async () => {
                            setLoading(true);
                            await supabase.from('trips').update({ status: 'BOARDING' }).eq('id', trip.id);
                            alert('Minibús puesto en estado de Abordaje');
                            loadInitialData();
                          }}
                        >
                          <Text style={styles.kanbanActionBtnText}>Iniciar Abordaje</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                {/* Columna 2: Abordando */}
                <View style={styles.kanbanColumn}>
                  <Text style={[styles.kanbanColumnTitle, { borderBottomColor: colors.warning }]}>
                    🚪 Abordando
                  </Text>
                  {tripsList.filter(t => t.status === 'BOARDING').length === 0 ? (
                    <Text style={styles.kanbanEmpty}>Sin viajes</Text>
                  ) : (
                    tripsList.filter(t => t.status === 'BOARDING').map(trip => (
                      <View key={trip.id} style={styles.kanbanCard}>
                        <Text style={styles.kanbanCardTitle}>{trip.route?.name}</Text>
                        <Text style={styles.kanbanCardSub}>Salida: {trip.departure_time?.substring(0, 5)}</Text>
                        <Text style={styles.kanbanCardSub}>Vehículo: {trip.vehicle?.plate}</Text>
                        <Text style={styles.kanbanCardSub}>Chofer: {trip.driver?.full_name}</Text>
                        <TouchableOpacity
                          style={[styles.kanbanActionBtn, { backgroundColor: colors.success }]}
                          onPress={async () => {
                            setLoading(true);
                            await supabase.from('trips').update({ status: 'IN_PROGRESS' }).eq('id', trip.id);
                            
                            // Log event sourcing
                            await supabase.from('events').insert({
                              trip_id: trip.id,
                              driver_id: trip.driver_id,
                              event_type: 'DEPARTURE_MARK',
                              payload: { location: trip.route?.origin, time: new Date().toISOString() }
                            });

                            alert('Minibús despachado a ruta exitosamente');
                            loadInitialData();
                          }}
                        >
                          <Text style={styles.kanbanActionBtnText}>Despachar Minibús</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                {/* Columna 3: En Ruta */}
                <View style={styles.kanbanColumn}>
                  <Text style={[styles.kanbanColumnTitle, { borderBottomColor: colors.success }]}>
                    🟢 En Ruta
                  </Text>
                  {tripsList.filter(t => t.status === 'IN_PROGRESS').length === 0 ? (
                    <Text style={styles.kanbanEmpty}>Sin viajes en ruta</Text>
                  ) : (
                    tripsList.filter(t => t.status === 'IN_PROGRESS').map(trip => (
                      <View key={trip.id} style={styles.kanbanCard}>
                        <Text style={styles.kanbanCardTitle}>{trip.route?.name}</Text>
                        <Text style={styles.kanbanCardSub}>Salida: {trip.departure_time?.substring(0, 5)}</Text>
                        <Text style={styles.kanbanCardSub}>Vehículo: {trip.vehicle?.plate}</Text>
                        <Text style={styles.kanbanCardSub}>Chofer: {trip.driver?.full_name}</Text>
                        <View style={styles.kanbanBadgeEnRuta}>
                          <Text style={styles.kanbanBadgeTextEnRuta}>En viaje</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 3: CAJA Y GASTOS */}
          {/* ========================================================= */}
          {activeTab === 'caja' && (
            <View>
              {/* Resumen de Caja */}
              <Text style={styles.sectionTitle}>Balance Diario de Caja</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Ingresos Registrados</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>Bs. {officeIncomes.toFixed(2)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Egresos / Gastos</Text>
                  <Text style={[styles.statValue, { color: colors.danger }]}>- Bs. {officeExpenses.toFixed(2)}</Text>
                </View>
              </View>

              <View style={[styles.statBox, { alignItems: 'center', marginBottom: 24 }]}>
                <Text style={styles.statLabel}>Saldo Neto en Caja</Text>
                <Text style={[styles.statValue, { color: officeIncomes - officeExpenses >= 0 ? colors.primary : colors.danger, fontSize: 32 }]}>
                  Bs. {(officeIncomes - officeExpenses).toFixed(2)}
                </Text>
              </View>

              {cashRegister && (
                <TouchableOpacity 
                  style={[styles.buyButton, { backgroundColor: colors.danger, marginBottom: 24 }]}
                  onPress={() => {
                    const expected = parseFloat(cashRegister.initial_amount) + officeIncomes - officeExpenses;
                    setFinalCashInput(expected.toFixed(2));
                    setShowCashCloseModal(true);
                  }}
                >
                  <Ionicons name="key" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buyButtonText}>Cerrar Caja Diaria</Text>
                </TouchableOpacity>
              )}

              {/* Registro de Egresos */}
              <Text style={styles.sectionTitle}>Registrar Gasto de Oficina</Text>
              <View style={styles.card}>
                <TextInput
                  style={[styles.input, { marginBottom: 12 }]}
                  placeholder="Concepto del gasto (ej. Compra de hojas bond)"
                  placeholderTextColor={colors.textSecondary}
                  value={expenseConcept}
                  onChangeText={setExpenseConcept}
                />
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Monto del gasto (Bs.)"
                  placeholderTextColor={colors.textSecondary}
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={[styles.buyButton, { backgroundColor: colors.danger }]} onPress={handleRegisterExpense}>
                  <Ionicons name="remove-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buyButtonText}>Registrar Egreso</Text>
                </TouchableOpacity>
              </View>

              {/* Historial de ventas */}
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Mis Ventas de Hoy ({mySalesToday.length})</Text>
              {mySalesToday.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No has vendido boletos hoy</Text>
                </View>
              ) : (
                mySalesToday.map(sale => (
                  <View key={sale.id} style={styles.recordCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordTitle}>Pasajero: {sale.passenger_name}</Text>
                      <Text style={styles.recordSub}>Destino: {sale.destination || 'San Cristóbal'} | Asiento: #{sale.seat_number}</Text>
                      <Text style={styles.recordSub}>Monto: Bs. {parseFloat(sale.price_paid).toFixed(2)}</Text>
                      <Text style={styles.recordSub}>Estado: {sale.status === 'ACTIVE' ? '🟢 Activo' : '🔴 Anulado'}</Text>
                    </View>
                    {sale.status === 'ACTIVE' && (
                      <TouchableOpacity 
                        style={styles.cancelTicketBtn}
                        onPress={() => handleCancelTicket(sale.id, sale.price_paid)}
                      >
                        <Text style={styles.cancelTicketText}>Anular</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================= */}
      {/* MODAL DE BOLETO DIGITAL (SIMULACIÓN DE RECIBO DE IMPRESIÓN) */}
      {/* ========================================================= */}
      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptContainer}>
            <Text style={styles.receiptHeader}>SINDICATO DE TRANSPORTES TRANS</Text>
            <Text style={styles.receiptSubHeader}>Boleto Digital de Viaje</Text>
            <View style={styles.receiptDivider} />

            {lastSoldTicket && (
              <View style={styles.receiptContent}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Boleto ID:</Text>
                  <Text style={styles.receiptValue}>#{lastSoldTicket.id}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Fecha / Hora:</Text>
                  <Text style={styles.receiptValue}>{lastSoldTicket.trip_date} {lastSoldTicket.departure_time?.substring(0, 5)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Vehículo (Placa):</Text>
                  <Text style={styles.receiptValue}>{lastSoldTicket.plate}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Chofer:</Text>
                  <Text style={styles.receiptValue}>{lastSoldTicket.driver}</Text>
                </View>
                <View style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Pasajero:</Text>
                  <Text style={styles.receiptValueBold}>{lastSoldTicket.passenger_name}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>C.I.:</Text>
                  <Text style={styles.receiptValue}>{lastSoldTicket.passenger_ci}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Ruta / Tramo:</Text>
                  <Text style={styles.receiptValue}>{lastSoldTicket.origin} ➔ {lastSoldTicket.destination}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Número Asiento:</Text>
                  <Text style={[styles.receiptValueBold, { fontSize: 20, color: colors.primary }]}>
                    {lastSoldTicket.seat_number}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Costo Pagado:</Text>
                  <Text style={[styles.receiptValueBold, { fontSize: 20, color: colors.success }]}>
                    Bs. {parseFloat(lastSoldTicket.price_paid).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.receiptDivider} />

            {/* Simulación gráfica de códigos */}
            <View style={styles.barcodeContainer}>
              <View style={styles.fakeBarcode} />
              <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 4 }}>* BOLETO DIGITAL GENERADO *</Text>
            </View>

            {/* Botones de acción */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  alert('¡Imprimiendo recibo en tiquetera bluetooth!');
                  setShowReceiptModal(false);
                }}
              >
                <Ionicons name="print-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalActionText}>Imprimir</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: '#25D366' }]}
                onPress={handleShareWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalActionText}>Compartir</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalActionBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowReceiptModal(false)}
              >
                <Text style={[styles.modalActionText, { color: colors.text }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: APERTURA DE CAJA */}
      {/* ========================================================= */}
      <Modal
        visible={showCashOpenModal && !cashRegister}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptContainer, { padding: 24 }]}>
            <Ionicons name="lock-closed" size={48} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[styles.receiptHeader, { fontSize: 18 }]}>Apertura de Caja Diaria</Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
              Para iniciar operaciones de venta y encomiendas, registre el saldo inicial de caja de la oficina.
            </Text>

            <TextInput
              style={[styles.input, { width: '100%', marginBottom: 20, textAlign: 'center', fontSize: 18 }]}
              placeholder="Monto Inicial (Bs.)"
              value={initialCashInput}
              onChangeText={setInitialCashInput}
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={[styles.submitBtn, { width: '100%', backgroundColor: colors.primary }]}
              onPress={handleOpenCashRegister}
            >
              <Text style={styles.submitBtnText}>Abrir Caja Diaria</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: CIERRE DE CAJA */}
      {/* ========================================================= */}
      <Modal
        visible={showCashCloseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCashCloseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptContainer, { padding: 24 }]}>
            <Ionicons name="key" size={48} color={colors.danger} style={{ marginBottom: 12 }} />
            <Text style={[styles.receiptHeader, { fontSize: 18 }]}>Cerrar Caja Diaria</Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
              Arqueo de caja de la oficina. Ingrese el total de efectivo físico en caja.
            </Text>

            <View style={{ width: '100%', marginBottom: 16 }}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Saldo Inicial:</Text>
                <Text style={styles.receiptValue}>Bs. {parseFloat(cashRegister?.initial_amount || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Ingresos:</Text>
                <Text style={styles.receiptValue}>Bs. {officeIncomes.toFixed(2)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Gastos:</Text>
                <Text style={styles.receiptValue}>Bs. {officeExpenses.toFixed(2)}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Esperado en Caja:</Text>
                <Text style={styles.receiptValueBold}>
                  Bs. {(parseFloat(cashRegister?.initial_amount || 0) + officeIncomes - officeExpenses).toFixed(2)}
                </Text>
              </View>
            </View>

            <TextInput
              style={[styles.input, { width: '100%', marginBottom: 20, textAlign: 'center', fontSize: 18 }]}
              placeholder="Efectivo en mano (Bs.)"
              value={finalCashInput}
              onChangeText={setFinalCashInput}
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={[styles.submitBtn, { width: '100%', backgroundColor: colors.danger }]}
              onPress={handleCloseCashRegister}
            >
              <Text style={styles.submitBtnText}>Confirmar Cierre de Caja</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => setShowCashCloseModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  // Tab Bar
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  // Layout
  contentLayout: {
    flexDirection: Platform.OS === 'web' || Platform.isPad ? 'row' : 'column',
    gap: 16,
  },
  mapSection: {
    flex: 1.2,
    minWidth: 300,
  },
  formSection: {
    flex: 1,
    minWidth: 300,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
    fontFamily: typography.fontFamilyBold,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  seatBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  seatBadgeLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  seatBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  seatBadgeText: {
    ...typography.h3,
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.background,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: {
    ...typography.body,
    color: colors.text,
  },
  priceValue: {
    ...typography.h1,
    color: colors.success,
  },
  buyButton: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: colors.border,
  },
  buyButtonText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  selectionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  selectionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectionBtnText: {
    ...typography.caption,
    color: colors.text,
  },
  selectionBtnTextActive: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
  },
  // Form Row (Encomiendas)
  formSubtitleHeader: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
    marginBottom: 8,
    marginTop: 8,
  },
  formRow: {
    flexDirection: 'row',
  },
  // Records Lists
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  // Balance
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
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
  },
  cancelTicketBtn: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  cancelTicketText: {
    ...typography.caption,
    color: colors.danger,
    fontFamily: typography.fontFamilyBold,
  },
  // Modal Recibo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  receiptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  receiptHeader: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
    textAlign: 'center',
  },
  receiptSubHeader: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  receiptDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    width: '100%',
    marginVertical: 12,
  },
  receiptContent: {
    width: '100%',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  receiptValue: {
    ...typography.caption,
    color: colors.text,
  },
  receiptValueBold: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
  },
  barcodeContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  fakeBarcode: {
    width: 200,
    height: 45,
    backgroundColor: '#1C1C1E', // Falsa barra simulada de código de barras
  },
  modalActionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Kanban
  kanbanContainer: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 12,
  },
  kanbanColumn: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kanbanColumnTitle: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    fontSize: 15,
    borderBottomWidth: 3,
    paddingBottom: 8,
    marginBottom: 12,
    color: colors.text,
  },
  kanbanCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  kanbanCardTitle: {
    ...typography.body,
    fontFamily: typography.fontFamilyBold,
    color: colors.text,
  },
  kanbanCardSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kanbanActionBtn: {
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  kanbanActionBtnText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  kanbanBadgeEnRuta: {
    backgroundColor: colors.success,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  kanbanBadgeTextEnRuta: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  kanbanEmpty: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
  },
});

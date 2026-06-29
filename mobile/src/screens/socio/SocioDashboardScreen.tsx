import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import AnimatedPressable from '../../components/AnimatedPressable';
import { User, Vehicle } from '../../types';

export interface SocioDashboardScreenProps {
  navigation: any;
}

export default function SocioDashboardScreen({ navigation }: SocioDashboardScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        // Cargar vehículos del socio
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('*')
          .eq('owner_id', user.id);
        
        if (vehicleData) setVehicles(vehicleData as Vehicle[]);

        // Cargar finanzas de los vehículos del socio
        if (vehicleData && vehicleData.length > 0) {
          const vehicleIds = vehicleData.map(v => v.id);

          const { data: incomes } = await supabase
            .from('finances')
            .select('amount')
            .in('vehicle_id', vehicleIds)
            .eq('type', 'INCOME');
          
          if (incomes) {
            setTotalIncome(incomes.reduce((sum, f) => sum + parseFloat(f.amount), 0));
          }

          const { data: expenses } = await supabase
            .from('finances')
            .select('amount')
            .in('vehicle_id', vehicleIds)
            .eq('type', 'EXPENSE');
          
          if (expenses) {
            setTotalExpense(expenses.reduce((sum, f) => sum + parseFloat(f.amount), 0));
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos del socio:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    navigation.replace('Login');
  };

  const netProfit = totalIncome - totalExpense;
  const formatMoney = (amount: number) => `Bs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel de Socio</Text>
          <Text style={styles.headerSubtitle}>
            {currentUser ? currentUser.full_name : 'Propietario'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AnimatedPressable style={styles.iconButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </AnimatedPressable>
          <AnimatedPressable style={styles.iconButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Ingresos Brutos</Text>
            <Text style={styles.statValue}>{formatMoney(totalIncome)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Egresos</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>
              - {formatMoney(totalExpense)}
            </Text>
          </View>
        </View>

        <View style={[styles.statBox, styles.totalBox]}>
          <Text style={styles.statLabel}>Utilidad Neta</Text>
          <Text style={[styles.statValue, { color: netProfit >= 0 ? colors.success : colors.danger, fontSize: 32 }]}>
            {formatMoney(netProfit)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Mi Flota ({vehicles.length} vehículos)</Text>
        
        {vehicles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
          </View>
        ) : (
          vehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <Ionicons name="bus" size={24} color={colors.text} />
                <Text style={styles.plate}>Placa: {vehicle.plate}</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: vehicle.status === 'ACTIVE' ? colors.success : 
                    vehicle.status === 'MAINTENANCE' ? colors.warning : colors.danger 
                }]}>
                  <Text style={styles.statusText}>
                    {vehicle.status === 'ACTIVE' ? 'Activo' : 
                     vehicle.status === 'MAINTENANCE' ? 'Mantenimiento' : 'Inactivo'}
                  </Text>
                </View>
              </View>
              <Text style={styles.routeText}>
                {vehicle.model || 'Modelo N/A'} • {vehicle.year || 'Año N/A'} • {vehicle.capacity} asientos
              </Text>
            </View>
          ))
        )}
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: colors.card, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  totalBox: { marginBottom: 20, alignItems: 'center' },
  statLabel: { ...typography.footnote, color: colors.textSecondary, marginBottom: 6 },
  statValue: { ...typography.title2, color: colors.text },
  sectionTitle: { ...typography.title3, color: colors.text, marginBottom: 12 },
  emptyCard: { backgroundColor: colors.card, padding: 32, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  emptyText: { ...typography.subhead, color: colors.textSecondary, marginTop: 8 },
  vehicleCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  plate: { ...typography.headline, color: colors.text, marginLeft: 10, flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { ...typography.caption2, fontFamily: typography.fontFamilySemiBold, color: '#FFF' },
  routeText: { ...typography.caption1, color: colors.textSecondary },
});

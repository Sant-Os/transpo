import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { supabase } from '../../services/supabase';
import { AuthService } from '../../services/AuthService';
import { TouchableOpacity } from 'react-native';

export default function SocioDashboardScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

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
        
        if (vehicleData) setVehicles(vehicleData);

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
  const formatMoney = (amount) => `Bs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
  },
  vehicleCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  plate: {
    ...typography.mono,
    fontSize: 18,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
  },
  routeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.card,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

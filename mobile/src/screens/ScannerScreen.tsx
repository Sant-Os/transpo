import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../services/supabase';
import AnimatedPressable from '../components/AnimatedPressable';

export interface ScannerScreenProps {
  navigation: any;
}

export interface BarCodeScannedEvent {
  type: string;
  data: string;
}

export default function ScannerScreen({ navigation }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);

  const handleBarCodeScanned = async ({ type, data }: BarCodeScannedEvent) => {
    setScanned(true);
    try {
      // Buscar y actualizar encomienda por id o por código qr
      const isNumber = !isNaN(Number(data));
      let query = supabase.from('parcels').update({ status: 'IN_TRANSIT' });
      
      if (isNumber) {
        query = query.eq('id', parseInt(data));
      } else {
        query = query.eq('qr_code', data);
      }
      
      const { data: updatedData, error } = await query.select();
      
      if (error) throw error;
      
      if (updatedData && updatedData.length > 0) {
        alert(`¡Encomienda Escaneada!\nEstado: En Tránsito\nDetalle: ${updatedData[0].description}`);
      } else {
        alert(`Escaneado: "${data}"\n(No se encontró encomienda registrada en la base de datos)`);
      }
    } catch (e: any) {
      alert('Error procesando escaneo: ' + e.message);
    } finally {
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    }
  };

  if (!permission) {
    return <View style={styles.centerContainer}><Text>Cargando permisos...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ textAlign: 'center', marginBottom: 16 }}>No se tiene acceso a la cámara</Text>
        <Button title="Conceder Permiso" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
           <Ionicons name="close" size={28} color="#FFF" />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Escáner QR</Text>
        <View style={{ width: 44 }} />
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View style={styles.overlay}>
           <View style={styles.scanFrame} />
           <Text style={styles.overlayText}>
             Enfoque el código QR de la encomienda o pasaje
           </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.7)' },
  headerTitle: { ...typography.headline, color: '#FFF' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 260, height: 260, borderWidth: 3, borderColor: colors.primary, borderRadius: 20, backgroundColor: 'transparent' },
  overlayText: { ...typography.subhead, color: 'rgba(255,255,255,0.8)', marginTop: 24, textAlign: 'center', paddingHorizontal: 32 },
});

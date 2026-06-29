import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../services/supabase';

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await CameraView.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    try {
      // Buscar y actualizar encomienda por id o por código qr
      const isNumber = !isNaN(data);
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
    } catch (e) {
      alert('Error procesando escaneo: ' + e.message);
    } finally {
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Solicitando permiso de cámara...</Text></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginBottom: 16 }}>No se tiene acceso a la cámara</Text>
        <Button title="Intentar nuevamente" onPress={() => CameraView.requestCameraPermissionsAsync()} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
           <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
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
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  overlayText: {
    ...typography.body,
    color: '#FFF',
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  }
});

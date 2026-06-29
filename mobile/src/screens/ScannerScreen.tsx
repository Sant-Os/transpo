import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../services/supabase';
import AnimatedPressable from '../components/AnimatedPressable';

export interface PropiedadesPantallaEscaner {
  navigation: any;
}

export interface EventoCodigoEscaneado {
  type: string;
  data: string;
}

export default function ScannerScreen({ navigation }: PropiedadesPantallaEscaner) {
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState<boolean>(false);

  const manejarCodigoEscaneado = async ({ type, data }: EventoCodigoEscaneado) => {
    setEscaneado(true);
    try {
      // Buscar y actualizar encomienda por id o por código qr
      const esNumero = !isNaN(Number(data));
      let consulta = supabase.from('encomiendas').update({ estado: 'EN_RUTA' });
      
      if (esNumero) {
        consulta = consulta.eq('id', parseInt(data));
      } else {
        consulta = consulta.eq('codigo_qr', data);
      }
      
      const { data: datosActualizados, error } = await consulta.select();
      
      if (error) throw error;
      
      if (datosActualizados && datosActualizados.length > 0) {
        alert(`¡Encomienda Escaneada!\nEstado: En Ruta\nDetalle: ${datosActualizados[0].descripcion}`);
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

  if (!permiso) {
    return <View style={estilos.contenedorCentro}><Text>Cargando permisos...</Text></View>;
  }
  if (!permiso.granted) {
    return (
      <View style={estilos.contenedorCentro}>
        <Text style={{ textAlign: 'center', marginBottom: 16 }}>No se tiene acceso a la cámara</Text>
        <AnimatedPressable style={estilos.botonPermiso} onPress={solicitarPermiso}>
          <Text style={estilos.textoBotonPermiso}>Conceder Permiso</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
           <Ionicons name="close" size={28} color="#FFF" />
        </AnimatedPressable>
        <Text style={estilos.headerTitle}>Escáner QR</Text>
        <View style={{ width: 44 }} />
      </View>

      <CameraView
        style={estilos.camara}
        facing="back"
        onBarcodeScanned={escaneado ? undefined : manejarCodigoEscaneado}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View style={estilos.superposicion}>
           <View style={estilos.marcoEscaneo} />
           <Text style={estilos.textoSuperposicion}>
             Enfoque el código QR de la encomienda o pasaje
           </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#000' },
  contenedorCentro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.7)' },
  headerTitle: { ...typography.headline, color: '#FFF' },
  camara: { flex: 1 },
  superposicion: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  marcoEscaneo: { width: 260, height: 260, borderWidth: 3, borderColor: colors.primary, borderRadius: 20, backgroundColor: 'transparent' },
  textoSuperposicion: { ...typography.subhead, color: 'rgba(255,255,255,0.8)', marginTop: 24, textAlign: 'center', paddingHorizontal: 32 },
  botonPermiso: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 12 },
  textoBotonPermiso: { ...typography.body, color: '#FFF', fontFamily: typography.fontFamilySemiBold }
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/AuthService';
import AnimatedPressable from '../components/AnimatedPressable';
import { Usuario } from '../types';

export interface PropiedadesPantallaChat {
  navigation: any;
}

export interface RemitenteMensaje {
  nombre_completo: string;
  rol: string;
}

export interface MensajeChat {
  id: number;
  canal: 'GENERAL' | 'OPERACIONES' | string;
  remitente_id: number;
  contenido: string;
  creado_en: string;
  remitente?: RemitenteMensaje;
}

export default function ChatScreen({ navigation }: PropiedadesPantallaChat) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [canalActivo, setCanalActivo] = useState<'GENERAL' | 'OPERACIONES'>('GENERAL');
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  const vistaScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    cargarUsuarioYMensajes();
    
    // Suscripción en Tiempo Real usando WebSockets de Supabase
    const nombreCanal = `realtime_chat_${canalActivo.toLowerCase()}`;
    const suscripcion = supabase
      .channel(nombreCanal)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'mensajes', 
          filter: `canal=eq.${canalActivo}` 
        },
        async () => {
          // Recargar mensajes al recibir uno nuevo instantáneamente
          obtenerMensajes(canalActivo, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(suscripcion);
    };
  }, [canalActivo]);

  const cargarUsuarioYMensajes = async () => {
    setCargando(true);
    const usuario = await AuthService.getCurrentUser();
    setUsuarioActual(usuario);
    // Si es chofer, abrir por defecto operaciones
    if (usuario && usuario.rol === 'CHOFER') {
      setCanalActivo('OPERACIONES');
    }
    await obtenerMensajes(canalActivo === 'GENERAL' ? 'GENERAL' : 'OPERACIONES', true);
    setCargando(false);
  };

  const obtenerMensajes = async (canal: 'GENERAL' | 'OPERACIONES', mostrarCargando = false) => {
    if (mostrarCargando) setCargando(true);
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select(`
          *,
          remitente:usuarios(nombre_completo, rol)
        `)
        .eq('canal', canal)
        .order('creado_en', { ascending: true });

      if (error) throw error;
      if (data) setMensajes(data as MensajeChat[]);
      
      // Desplazarse al final
      setTimeout(() => {
        vistaScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      if (mostrarCargando) setCargando(false);
    }
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !usuarioActual) return;

    const contenidoMensaje = nuevoMensaje.trim();
    setNuevoMensaje('');

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert({
          canal: canalActivo,
          remitente_id: usuarioActual.id,
          contenido: contenidoMensaje
        });

      if (error) throw error;

      // Recargar mensajes inmediatamente
      await obtenerMensajes(canalActivo, false);
      
      // Desplazarse al final
      setTimeout(() => {
        vistaScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: any) {
      alert('Error enviando mensaje: ' + e.message);
    }
  };

  const alRefrescar = async () => {
    setRefrescando(true);
    await obtenerMensajes(canalActivo, false);
    setRefrescando(false);
  };

  return (
    <SafeAreaView style={estilos.contenedor}>
      {/* Header */}
      <View style={estilos.header}>
        <AnimatedPressable style={estilos.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={estilos.backBtnText}>Volver</Text>
        </AnimatedPressable>
        <Text style={estilos.headerTitle}>Chat Sindical</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Channel Toggles */}
      <View style={estilos.channelBar}>
        <AnimatedPressable 
          style={[estilos.channelTab, canalActivo === 'GENERAL' && estilos.channelTabActive]}
          onPress={() => setCanalActivo('GENERAL')}
        >
          <Ionicons name="people-outline" size={18} color={canalActivo === 'GENERAL' ? colors.primary : colors.textSecondary} />
          <Text style={[estilos.channelTabText, canalActivo === 'GENERAL' && estilos.channelTabTextActive]}>General</Text>
        </AnimatedPressable>

        <AnimatedPressable 
          style={[estilos.channelTab, canalActivo === 'OPERACIONES' && estilos.channelTabActive]}
          onPress={() => setCanalActivo('OPERACIONES')}
        >
          <Ionicons name="construct-outline" size={18} color={canalActivo === 'OPERACIONES' ? colors.primary : colors.textSecondary} />
          <Text style={[estilos.channelTabText, canalActivo === 'OPERACIONES' && estilos.channelTabTextActive]}>Operaciones</Text>
        </AnimatedPressable>
      </View>

      {/* Message List */}
      {cargando ? (
        <View style={estilos.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={vistaScrollRef}
          style={estilos.messageScroll}
          contentContainerStyle={estilos.messageContent}
          onContentSizeChange={() => vistaScrollRef.current?.scrollToEnd({ animated: true })}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} colors={[colors.primary]} />
          }
        >
          {mensajes.length === 0 ? (
            <View style={estilos.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={estilos.emptyText}>Sin mensajes en este canal. ¡Envía el primero!</Text>
            </View>
          ) : (
            mensajes.map((msg) => {
              const esMensajePropio = usuarioActual && msg.remitente_id === usuarioActual.id;
              return (
                <View 
                  key={msg.id} 
                  style={[
                    estilos.messageBubbleContainer,
                    esMensajePropio ? estilos.ownMessageContainer : estilos.otherMessageContainer
                  ]}
                >
                  {!esMensajePropio && (
                    <Text style={estilos.senderLabel}>
                      {msg.remitente?.nombre_completo} • ({msg.remitente?.rol})
                    </Text>
                  )}
                  <View 
                    style={[
                      estilos.messageBubble,
                      esMensajePropio ? estilos.ownMessageBubble : estilos.otherMessageBubble
                    ]}
                  >
                    <Text style={[estilos.messageText, esMensajePropio && estilos.ownMessageText]}>
                      {msg.contenido}
                    </Text>
                  </View>
                  <Text style={estilos.timestamp}>
                    {new Date(msg.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Message input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={estilos.inputContainer}>
          <TextInput
            style={estilos.input}
            placeholder={`Escribir en #${canalActivo.toLowerCase()}...`}
            placeholderTextColor={colors.textSecondary}
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            multiline
          />
          <AnimatedPressable 
            style={[estilos.sendBtn, !nuevoMensaje.trim() && estilos.sendBtnDisabled]}
            disabled={!nuevoMensaje.trim()}
            onPress={enviarMensaje}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { ...typography.body, color: colors.primary },
  headerTitle: { ...typography.headline, color: colors.text, marginLeft: 12 },
  channelBar: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 0.5, borderBottomColor: colors.separator },
  channelTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 6 },
  channelTabActive: { borderBottomColor: colors.primary },
  channelTabText: { ...typography.subhead, fontFamily: typography.fontFamilyMedium, color: colors.textSecondary },
  channelTabTextActive: { color: colors.primary, fontFamily: typography.fontFamilySemiBold },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageScroll: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 24 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 16 },
  emptyText: { ...typography.subhead, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  messageBubbleContainer: { marginBottom: 12, maxWidth: '80%' },
  ownMessageContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  otherMessageContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderLabel: { ...typography.caption1, color: colors.textSecondary, marginBottom: 3, marginLeft: 6 },
  messageBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  ownMessageBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  otherMessageBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  messageText: { ...typography.body, color: colors.text },
  ownMessageText: { color: '#FFF' },
  timestamp: { ...typography.caption2, color: colors.textSecondary, marginTop: 4, marginHorizontal: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card, borderTopWidth: 0.5, borderTopColor: colors.separator, gap: 10 },
  input: { flex: 1, ...typography.body, backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, maxHeight: 100 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface },
});

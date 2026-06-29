import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/AuthService';
import AnimatedPressable from '../components/AnimatedPressable';
import { User } from '../types';

export interface ChatScreenProps {
  navigation: any;
}

export interface MessageSender {
  full_name: string;
  role: string;
}

export interface ChatMessage {
  id: number;
  channel: 'GENERAL' | 'OPERATIONS' | string;
  sender_id: number;
  content: string;
  created_at: string;
  sender?: MessageSender;
}

export default function ChatScreen({ navigation }: ChatScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChannel, setActiveChannel] = useState<'GENERAL' | 'OPERATIONS'>('GENERAL'); // 'GENERAL' | 'OPERATIONS'
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserAndMessages();
    
    // Suscripción en Tiempo Real usando WebSockets de Supabase
    const channelName = `realtime_chat_${activeChannel.toLowerCase()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `channel=eq.${activeChannel}` 
        },
        async () => {
          // Recargar mensajes al recibir uno nuevo instantáneamente
          fetchMessages(activeChannel, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChannel]);

  const loadUserAndMessages = async () => {
    setLoading(true);
    const user = await AuthService.getCurrentUser();
    setCurrentUser(user);
    // If user is DRIVER, default to OPERATIONS channel
    if (user && user.role === 'DRIVER') {
      setActiveChannel('OPERATIONS');
    }
    await fetchMessages(activeChannel === 'GENERAL' ? 'GENERAL' : 'OPERATIONS', true);
    setLoading(false);
  };

  const fetchMessages = async (channel: 'GENERAL' | 'OPERATIONS', showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users(full_name, role)')
        .eq('channel', channel)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) setMessages(data as ChatMessage[]);
    } catch (e: any) {
      console.error('Error cargando chat:', e.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMessages(activeChannel, false);
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const messageText = newMessage;
    setNewMessage(''); // clear input instantly

    try {
      const { error } = await supabase.from('messages').insert({
        channel: activeChannel,
        sender_id: currentUser.id,
        content: messageText
      });

      if (error) throw error;
      
      // Reload messages list
      await fetchMessages(activeChannel, false);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: any) {
      alert('Error enviando mensaje: ' + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={styles.backBtnText}>Volver</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Chat Sindical</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Channel Toggles */}
      <View style={styles.channelBar}>
        <AnimatedPressable 
          style={[styles.channelTab, activeChannel === 'GENERAL' && styles.channelTabActive]}
          onPress={() => setActiveChannel('GENERAL')}
        >
          <Ionicons name="people-outline" size={18} color={activeChannel === 'GENERAL' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.channelTabText, activeChannel === 'GENERAL' && styles.channelTabTextActive]}>General</Text>
        </AnimatedPressable>

        <AnimatedPressable 
          style={[styles.channelTab, activeChannel === 'OPERATIONS' && styles.channelTabActive]}
          onPress={() => setActiveChannel('OPERATIONS')}
        >
          <Ionicons name="construct-outline" size={18} color={activeChannel === 'OPERATIONS' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.channelTabText, activeChannel === 'OPERATIONS' && styles.channelTabTextActive]}>Operaciones</Text>
        </AnimatedPressable>
      </View>

      {/* Message List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Sin mensajes en este canal. ¡Envía el primero!</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = currentUser && msg.sender_id === currentUser.id;
              return (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageBubbleContainer,
                    isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
                  ]}
                >
                  {!isOwnMessage && (
                    <Text style={styles.senderLabel}>
                      {msg.sender?.full_name} • ({msg.sender?.role})
                    </Text>
                  )}
                  <View 
                    style={[
                      styles.messageBubble,
                      isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
                    ]}
                  >
                    <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                      {msg.content}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={`Escribir en #${activeChannel.toLowerCase()}...`}
            placeholderTextColor={colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <AnimatedPressable 
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
            disabled={!newMessage.trim()}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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

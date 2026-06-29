import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/AuthService';

export default function ChatScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChannel, setActiveChannel] = useState('GENERAL'); // 'GENERAL' | 'OPERATIONS'
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollViewRef = useRef();

  useEffect(() => {
    loadUserAndMessages();
    
    // Auto-poll messages every 6 seconds to simulate real-time
    const interval = setInterval(() => {
      fetchMessages(activeChannel, false);
    }, 6000);

    return () => clearInterval(interval);
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

  const fetchMessages = async (channel, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users(full_name, role)')
        .eq('channel', channel)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) setMessages(data);
    } catch (e) {
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
    } catch (e) {
      alert('Error enviando mensaje: ' + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Sindical</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Channel Toggles */}
      <View style={styles.channelBar}>
        <TouchableOpacity 
          style={[styles.channelTab, activeChannel === 'GENERAL' && styles.channelTabActive]}
          onPress={() => setActiveChannel('GENERAL')}
        >
          <Ionicons name="people-outline" size={18} color={activeChannel === 'GENERAL' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.channelTabText, activeChannel === 'GENERAL' && styles.channelTabTextActive]}>General</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.channelTab, activeChannel === 'OPERATIONS' && styles.channelTabActive]}
          onPress={() => setActiveChannel('OPERATIONS')}
        >
          <Ionicons name="construct-outline" size={18} color={activeChannel === 'OPERATIONS' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.channelTabText, activeChannel === 'OPERATIONS' && styles.channelTabTextActive]}>Operaciones</Text>
        </TouchableOpacity>
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
          <TouchableOpacity 
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
            disabled={!newMessage.trim()}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    ...typography.body,
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontFamily: typography.fontFamilyBold,
  },
  channelBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  channelTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  channelTabActive: {
    borderBottomColor: colors.primary,
  },
  channelTabText: {
    ...typography.caption,
    fontFamily: typography.fontFamilyBold,
    color: colors.textSecondary,
  },
  channelTabTextActive: {
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageScroll: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 16,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Messages bubbles
  messageBubbleContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  ownMessageText: {
    color: '#FFF',
  },
  timestamp: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    marginHorizontal: 6,
  },
  // Input area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
});

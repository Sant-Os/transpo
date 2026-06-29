// OfflineQueue.js
// Maneja el Event Sourcing local para acciones del chofer
// Almacena eventos offline y los sincroniza cuando hay conexión

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { AuthService } from './AuthService';

let isOnline = true;

const QUEUE_KEY = '@offline_queue';

export const OfflineQueue = {
  setOnlineStatus: async (status) => {
    isOnline = status;
    if (isOnline) {
      await OfflineQueue.sync();
    }
  },

  getOnlineStatus: () => isOnline,

  getQueue: async () => {
    try {
      const q = await AsyncStorage.getItem(QUEUE_KEY);
      return q ? JSON.parse(q) : [];
    } catch (e) {
      return [];
    }
  },

  addEvent: async (eventType, payload) => {
    // Obtener el usuario actual desde la sesión local (no de Supabase Auth)
    const currentUser = await AuthService.getCurrentUser();
    
    const event = {
      event_type: eventType,
      payload: payload,
      driver_id: currentUser ? currentUser.id : null,
      created_at: new Date().toISOString()
    };
    
    if (isOnline) {
      console.log(`[Online] Evento ${eventType} enviado directamente a Supabase.`);
      const { error } = await supabase.from('events').insert(event);
      if (error) {
        console.error('[Online] Error enviando evento, guardando offline:', error);
        // Si falla el envío online, guardar offline
        const q = await OfflineQueue.getQueue();
        q.push(event);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
      }
    } else {
      console.log(`[Offline] Evento ${eventType} encolado localmente.`);
      const q = await OfflineQueue.getQueue();
      q.push(event);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    }
  },

  getQueueSize: async () => {
    const q = await OfflineQueue.getQueue();
    return q.length;
  },

  sync: async () => {
    const queue = await OfflineQueue.getQueue();
    if (queue.length === 0) return;
    
    console.log(`[Sync] Sincronizando ${queue.length} eventos a Supabase...`);
    try {
      const { error } = await supabase.from('events').insert(queue);
      if (error) throw error;
      
      await AsyncStorage.removeItem(QUEUE_KEY);
      console.log(`[Sync] Sincronización completada exitosamente.`);
    } catch (e) {
      console.error('[Sync] Error sincronizando eventos', e);
    }
  }
};

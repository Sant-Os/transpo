// ColaOffline.ts
// Maneja el Event Sourcing local para acciones del chofer
// Almacena eventos offline y los sincroniza cuando hay conexión
// IDIOMA: 100% ESPAÑOL

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { AuthService } from './AuthService';

let estaEnLinea: boolean = true;

const CLAVE_COLA = '@cola_offline';

export interface EventoOffline {
  tipo_evento: string;
  datos: any;
  chofer_id: number | null;
  creado_en: string;
}

export const ColaOffline = {
  establecerEstadoEnLinea: async (estado: boolean): Promise<void> => {
    estaEnLinea = estado;
    if (estaEnLinea) {
      await ColaOffline.sincronizar();
    }
  },

  obtenerEstadoEnLinea: (): boolean => estaEnLinea,

  obtenerCola: async (): Promise<EventoOffline[]> => {
    try {
      const colaJson = await AsyncStorage.getItem(CLAVE_COLA);
      return colaJson ? (JSON.parse(colaJson) as EventoOffline[]) : [];
    } catch (e) {
      return [];
    }
  },

  agregarEvento: async (tipoEvento: string, datos: any): Promise<void> => {
    // Obtener el usuario actual desde la sesión local
    const usuarioActual = await AuthService.getCurrentUser();
    
    const evento: EventoOffline = {
      tipo_evento: tipoEvento,
      datos: datos,
      chofer_id: usuarioActual ? usuarioActual.id : null,
      creado_en: new Date().toISOString()
    };
    
    if (estaEnLinea) {
      console.log(`[En Línea] Evento ${tipoEvento} enviado directamente a Supabase.`);
      const { error } = await supabase.from('eventos').insert(evento);
      if (error) {
        console.error('[En Línea] Error enviando evento, guardando offline:', error);
        // Si falla el envío, guardar en la cola local
        const cola = await ColaOffline.obtenerCola();
        cola.push(evento);
        await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
      }
    } else {
      console.log(`[Offline] Evento ${tipoEvento} encolado localmente.`);
      const cola = await ColaOffline.obtenerCola();
      cola.push(evento);
      await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
    }
  },

  obtenerTamanoCola: async (): Promise<number> => {
    const cola = await ColaOffline.obtenerCola();
    return cola.length;
  },

  sincronizar: async (): Promise<void> => {
    const cola = await ColaOffline.obtenerCola();
    if (cola.length === 0) return;
    
    console.log(`[Sincronizar] Sincronizando ${cola.length} eventos a Supabase...`);
    try {
      const { error } = await supabase.from('eventos').insert(cola);
      if (error) throw error;
      
      await AsyncStorage.removeItem(CLAVE_COLA);
      console.log(`[Sincronizar] Sincronización completada exitosamente.`);
    } catch (e) {
      console.error('[Sincronizar] Error sincronizando eventos', e);
    }
  }
};

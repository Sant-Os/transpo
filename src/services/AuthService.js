import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const USER_STORAGE_KEY = '@user_session';

export const AuthService = {
  /**
   * Login mediante tabla propia "users" (sin Supabase Auth)
   * Busca el usuario por username y password en la tabla directamente.
   */
  login: async (username, password) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Guardar sesión en almacenamiento local
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));

      return {
        user: data,
        roles: [data.role]
      };
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  },

  /**
   * Cerrar sesión — limpia el almacenamiento local
   */
  logout: async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Obtener el usuario actual desde la sesión guardada
   */
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Obtener el ID del usuario actual
   */
  getCurrentUserId: async () => {
    const user = await AuthService.getCurrentUser();
    return user ? user.id : null;
  },

  /**
   * Verificar si hay una sesión activa
   */
  isLoggedIn: async () => {
    const user = await AuthService.getCurrentUser();
    return user !== null;
  }
};

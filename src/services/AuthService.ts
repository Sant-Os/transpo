import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { User } from '../types';

const USER_STORAGE_KEY = '@user_session';

export interface LoginResult {
  user: User;
  roles: string[];
}

export const AuthService = {
  /**
   * Login mediante tabla propia "users" (sin Supabase Auth)
   * Busca el usuario por username y password en la tabla directamente.
   */
  login: async (username: string, password: string): Promise<LoginResult> => {
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
        user: data as User,
        roles: [(data as User).role]
      };
    } catch (error: any) {
      console.error('Login error:', error.message);
      throw error;
    }
  },

  /**
   * Cerrar sesión — limpia el almacenamiento local
   */
  logout: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Obtener el usuario actual desde la sesión guardada
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return userData ? JSON.parse(userData) as User : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Obtener el ID del usuario actual
   */
  getCurrentUserId: async (): Promise<number | null> => {
    const user = await AuthService.getCurrentUser();
    return user ? user.id : null;
  },

  /**
   * Verificar si hay una sesión activa
   */
  isLoggedIn: async (): Promise<boolean> => {
    const user = await AuthService.getCurrentUser();
    return user !== null;
  }
};

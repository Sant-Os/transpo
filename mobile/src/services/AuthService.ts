import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Usuario } from '../types';

const CLAVE_ALMACENAMIENTO_USUARIO = '@sesion_usuario';

export interface ResultadoInicioSesion {
  usuario: Usuario;
  roles: string[];
}

export const AuthService = {
  /**
   * Inicio de sesión utilizando la tabla "usuarios" propia (sin Supabase Auth)
   * Llama a la función del servidor "verificar_usuario" pasándole los parámetros correspondientes.
   */
  login: async (nombre_usuario: string, contrasena: string): Promise<ResultadoInicioSesion> => {
    try {
      const { data, error } = await supabase
        .rpc('verificar_usuario', {
          p_nombre_usuario: nombre_usuario,
          p_contrasena: contrasena
        })
        .maybeSingle();

      if (error || !data) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      // Guardar sesión en el almacenamiento local del dispositivo
      await AsyncStorage.setItem(CLAVE_ALMACENAMIENTO_USUARIO, JSON.stringify(data));

      return {
        usuario: data as Usuario,
        roles: [(data as Usuario).rol]
      };
    } catch (error: any) {
      console.error('Error de inicio de sesión:', error.message);
      throw error;
    }
  },

  /**
   * Cerrar sesión — limpia el almacenamiento local del dispositivo
   */
  logout: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CLAVE_ALMACENAMIENTO_USUARIO);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  },

  /**
   * Obtener el usuario de la sesión actual
   */
  getCurrentUser: async (): Promise<Usuario | null> => {
    try {
      const datosUsuario = await AsyncStorage.getItem(CLAVE_ALMACENAMIENTO_USUARIO);
      return datosUsuario ? (JSON.parse(datosUsuario) as Usuario) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Obtener el ID del usuario de la sesión actual
   */
  getCurrentUserId: async (): Promise<number | null> => {
    const usuario = await AuthService.getCurrentUser();
    return usuario ? usuario.id : null;
  },

  /**
   * Comprobar si hay una sesión activa
   */
  isLoggedIn: async (): Promise<boolean> => {
    const usuario = await AuthService.getCurrentUser();
    return usuario !== null;
  }
};

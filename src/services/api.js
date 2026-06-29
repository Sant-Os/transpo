import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the Spring Boot backend
// Ensure this points to the correct local IP if testing on a real device
// Usa tu IP de red local para que funcione en dispositivos físicos con Expo Go
// Si usas emulador Android Studio, cambia a 'http://10.0.2.2:8080/api'
const API_URL = 'http://192.168.100.5:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

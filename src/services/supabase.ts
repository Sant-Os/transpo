import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente básico de Supabase — solo para consultas a tablas
// La autenticación se maneja con nuestra propia tabla "users"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

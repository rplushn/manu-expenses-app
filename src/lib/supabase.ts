import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Validate that env vars are set
if (!supabaseUrl) {
  console.error('ERROR: EXPO_PUBLIC_SUPABASE_URL is missing!');
  throw new Error('EXPO_PUBLIC_SUPABASE_URL is not defined in environment variables');
}

if (!supabaseAnonKey) {
  console.error('ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY is missing!');
  throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY is not defined in environment variables');
}

console.log('[Supabase Client Init]', {
  url: supabaseUrl.substring(0, 50) + '...', // Log partial URL for safety
  keyLength: supabaseAnonKey.length,
  timestamp: new Date().toISOString(),
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// Database types
export interface DbExpense {
  id: string;
  usuario_id: string;
  monto: number;
  moneda: string;
  categoria: string;
  proveedor: string;
  fecha: string;
  foto_url: string | null;
  notas: string | null;
  created_at: string;
}

export interface DbUser {
  id: string;
  email: string;
  nombre_negocio: string;
  plan: string;
  created_at: string;
}

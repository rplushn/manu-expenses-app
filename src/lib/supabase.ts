import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ExpenseCategory } from './types';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database expense type (matches Supabase schema)
export interface DbExpense {
  id: string;
  usuario_id: string;
  monto: number;
  categoria: ExpenseCategory;
  proveedor: string;
  fecha: string; // YYYY-MM-DD (local date)
  foto_url: string | null;
  notas: string | null;
  created_at: string; // ISO timestamp (UTC)
}
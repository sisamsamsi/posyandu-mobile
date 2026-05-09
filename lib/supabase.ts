// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase URL or Anon Key is missing! App will likely crash.');
}

console.log('Supabase Init:', { 
  url: supabaseUrl, 
  hasAnonKey: !!supabaseAnonKey,
  hasServiceKey: !!supabaseServiceKey 
});

// Klien utama — menggunakan anon key, tunduk pada RLS
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Klien admin — menggunakan service role key, bypass RLS.
// HANYA untuk digunakan di server-side atau operasi internal seperti generate laporan.
const adminClient = supabaseServiceKey 
  ? createClient(supabaseUrl || '', supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Fallback ke client biasa jika admin key tidak ada untuk mencegah crash (TypeError)
export const supabaseAdmin = adminClient || supabase;



// stores/auth-store.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useServiceStore } from './service-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,
  setSession: (session) => {
    set({ session, user: session?.user ?? null, loading: false });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    useServiceStore.getState().setActivePosyandu(null);
    useServiceStore.getState().setActiveWorkspace(null);
    set({ session: null, user: null, loading: false });
  },
  initialize: async () => {
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      });
    } catch (gErr) {
      console.warn('Failed to configure Google Sign-In SDK:', gErr);
    }

    try {
      // Add a simple timeout to prevent getting stuck if Supabase is unreachable
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth Timeout')), 5000)
      );

      const res = await Promise.race([sessionPromise, timeoutPromise]) as any;
      const session = res?.data?.session || null;
      const error = res?.error || null;
      
      if (session) {
        set({ session, user: session.user, loading: false, initialized: true });
      } else {
        if (error) {
          console.warn('Session refresh error, clearing stale tokens:', error);
        }
        // Force clear AsyncStorage to remove invalid/expired refresh token
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        
        set({ 
          session: null, 
          user: null, 
          loading: false, 
          initialized: true 
        });
      }
    } catch (err) {
      console.warn('Auth check failed or timed out:', err);
      try {
        await supabase.auth.signOut();
      } catch (_) {}
      set({ session: null, user: null, loading: false, initialized: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (!session) {
        useServiceStore.getState().setActivePosyandu(null);
        useServiceStore.getState().setActiveWorkspace(null);
      }
    });
  },
}));

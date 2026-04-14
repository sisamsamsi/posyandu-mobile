// stores/auth-store.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

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
    set({ session: null, user: null, loading: false });
  },
  initialize: async () => {
    try {
      // Add a simple timeout to prevent getting stuck if Supabase is unreachable
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth Timeout')), 5000)
      );

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
      
      if (session) {
        set({ session, user: session.user, loading: false, initialized: true });
      } else {
        // Mock a user for Guest Mode
        const mockUser = { id: 'guest-user', email: 'guest@posyandu.info' };
        set({ 
          session: { user: mockUser } as any, 
          user: mockUser as any, 
          loading: false, 
          initialized: true 
        });
      }
    } catch (err) {
      console.warn('Auth check failed or timed out:', err);
      set({ loading: false, initialized: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });
  },
}));

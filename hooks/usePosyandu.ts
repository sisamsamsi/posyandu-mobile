import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Posyandu } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export type KaderPosyanduRel = {
  id: string;
  role: string;
  fokus_layanan: 'balita' | 'lansia' | 'semua';
  posyandus: Posyandu;
};

export const usePosyandu = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const getLinkedPosyandus = useCallback(async (): Promise<KaderPosyanduRel[]> => {
    if (!user) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('kader_posyandu')
        .select(`
          id,
          role,
          fokus_layanan,
          posyandus (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Clean up the return to match type
      return (data as any) as KaderPosyanduRel[];
    } catch (err: any) {
      console.error('Error fetching linked posyandus:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Expose this for backwards compatibility if needed elsewhere, 
  // though we mostly want linked posyandus now.
  const getAllPosyandus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posyandus')
        .select('*')
        .order('nama_posyandu', { ascending: true });

      if (error) throw error;
      return data as Posyandu[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, getLinkedPosyandus, getAllPosyandus };
};

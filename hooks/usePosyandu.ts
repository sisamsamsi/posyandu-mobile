import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Posyandu } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export const usePosyandu = () => {
  const [loading, setLoading] = useState(false);
  const [posyandu, setPosyandu] = useState<Posyandu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchPosyandu = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, we fetch the first posyandu or filter by some logic
      // In a real app, we might associate Kader with a specific Posyandu ID
      const { data, error } = await supabase
        .from('posyandus')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setPosyandu(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (user) {
      fetchPosyandu();
    }
  }, [user]);

  return { posyandu, loading, error, refresh: fetchPosyandu, getAllPosyandus };
};

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Balita } from '../lib/types';
import { useAuthStore } from '../stores/auth-store';

export const useBalita = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const getBalitas = async (searchQuery?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('balitas')
        .select(`
          *,
          posyandu:posyandus(*)
        `)
        .order('nama', { ascending: true });

      if (searchQuery) {
        query = query.or(`nama.ilike.%${searchQuery}%,nik.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Balita[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getBalitaById = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('balitas')
        .select(`
          *,
          posyandu:posyandus(*),
          penimbangans(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Balita;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const upsertBalita = async (balita: Partial<Balita>) => {
    try {
      setLoading(true);
      // Strip related objects that aren't columns
      const { posyandu, penimbangans, ...cleanData } = balita as any;
      
      const { data, error } = await supabase
        .from('balitas')
        .upsert(cleanData)
        .select()
        .single();
 
      if (error) throw error;
      return data as Balita;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBalita = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('balitas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { getBalitas, getBalitaById, upsertBalita, deleteBalita, loading, error };
};

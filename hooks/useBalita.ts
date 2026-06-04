import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Balita } from '../lib/types';
import { useServiceStore } from '../stores/service-store';

export const useBalita = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activePosyanduId } = useServiceStore();

  const getBalitas = async (searchQuery?: string) => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('balitas')
        .select(`
          *,
          posyandu:posyandus(*)
        `)
        .eq('posyandu_id', activePosyanduId || '')
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
      setError(null);
      const { data, error } = await supabase
        .from('balitas')
        .select(`
          *,
          posyandu:posyandus(*),
          penimbangans(*),
          imunisasi(*)
        `)
        .eq('id', id)
        .eq('posyandu_id', activePosyanduId || '')
        .single();

      if (error) throw error;
      
      const balita = data as any;
      if (balita && Array.isArray(balita.imunisasi)) {
        balita.imunisasi = balita.imunisasi.length > 0 ? balita.imunisasi[0] : null;
      }
      return balita as Balita;
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
      setError(null);
      // Strip related objects that aren't columns
      const { posyandu, penimbangans, ...cleanData } = balita as any;
      
      // Inject activePosyanduId if not present
      if (!cleanData.posyandu_id && activePosyanduId) {
        cleanData.posyandu_id = activePosyanduId;
      }
      
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
      setError(null);
      const { error } = await supabase
        .from('balitas')
        .delete()
        .eq('id', id)
        .eq('posyandu_id', activePosyanduId || '');

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

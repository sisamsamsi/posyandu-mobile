import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lansia } from '../lib/types';
import { useServiceStore } from '../stores/service-store';

export const useLansia = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activePosyanduId } = useServiceStore();

  const getLansias = async (searchQuery?: string) => {
    try {
      setLoading(true);
      
      if (!activePosyanduId) {
        console.warn('[useLansia] activePosyanduId is null/empty, skipping query');
        return [];
      }

      console.log('[useLansia] Fetching lansias for posyandu:', activePosyanduId, 'search:', searchQuery);



      let query = supabase
        .from('lansias')
        .select(`
          *,
          posyandu:posyandus(*)
        `)
        .eq('posyandu_id', activePosyanduId)
        .order('nama', { ascending: true });

      if (searchQuery) {
        query = query.or(`nama.ilike.%${searchQuery}%,nik.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      console.log('[useLansia] Result:', data?.length, 'records, error:', error?.message);
      
      if (error) throw error;
      return data as Lansia[];
    } catch (err: any) {
      console.error('[useLansia] Error:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getLansiaById = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lansias')
        .select(`
          *,
          posyandu:posyandus(*),
          pemeriksaan_lansias(*)
        `)
        .eq('id', id)
        .eq('posyandu_id', activePosyanduId || '')
        .single();

      if (error) throw error;
      return data as Lansia;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const upsertLansia = async (lansia: Partial<Lansia>) => {
    try {
      setLoading(true);
      // Strip related objects that aren't columns
      const { posyandu, pemeriksaan_lansias, ...cleanData } = lansia as any;

      // Inject activePosyanduId if not present
      if (!cleanData.posyandu_id && activePosyanduId) {
        cleanData.posyandu_id = activePosyanduId;
      }

      const { data, error } = await supabase
        .from('lansias')
        .upsert(cleanData)
        .select()
        .single();

      if (error) throw error;
      return data as Lansia;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteLansia = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('lansias')
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

  return { getLansias, getLansiaById, upsertLansia, deleteLansia, loading, error };
};

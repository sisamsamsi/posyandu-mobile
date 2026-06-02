import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Penimbangan } from '../lib/types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useServiceStore } from '../stores/service-store';

export const usePenimbangan = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activePosyanduId } = useServiceStore();

  /**
   * Get all penimbangans with optional month/year filter
   */
  const getPenimbangans = async (month?: number, year?: number) => {
    try {
      setLoading(true);
      let query = supabase
        .from('penimbangans')
        .select(`
          *,
          balita:balitas!inner(*)
        `)
        .eq('balita.posyandu_id', activePosyanduId || '')
        .order('tanggal', { ascending: false });

      if (month !== undefined && year !== undefined) {
        const date = new Date(year, month, 1);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();
        query = query.gte('tanggal', start).lte('tanggal', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Penimbangan[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a penimbangan record
   */
  const deletePenimbangan = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('penimbangans')
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

  /**
   * Update an existing penimbangan record
   */
  const updatePenimbangan = async (id: string, data: Partial<Penimbangan>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('penimbangans')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
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

  /**
   * Get penimbangans for a specific month to check attendance
   */
  const getMonthlyAttendance = async (month: number, year: number) => {
    try {
      setLoading(true);
      const date = new Date(year, month, 1);
      const start = startOfMonth(date).toISOString();
      const end = endOfMonth(date).toISOString();

      const { data, error } = await supabase
        .from('penimbangans')
        .select(`
          balita_id,
          tanggal,
          balita:balitas!inner(posyandu_id)
        `)
        .eq('balita.posyandu_id', activePosyanduId || '')
        .gte('tanggal', start)
        .lte('tanggal', end);

      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { getPenimbangans, getMonthlyAttendance, deletePenimbangan, updatePenimbangan, loading, error };
};

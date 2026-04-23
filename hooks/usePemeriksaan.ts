import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PemeriksaanLansia } from '../lib/types';
import { startOfMonth, endOfMonth } from 'date-fns';

import { useServiceStore } from '../stores/service-store';

export const usePemeriksaan = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activePosyanduId } = useServiceStore();

  /**
   * Get all pemeriksaan lansia with optional month/year filter
   * Isolated by activePosyanduId
   */
  const getPemeriksaans = async (month?: number, year?: number) => {
    try {
      setLoading(true);
      
      if (!activePosyanduId) {
        console.warn('[usePemeriksaan] No activePosyanduId, skipping fetch');
        return [];
      }

      console.log('[usePemeriksaan] Fetching for posyandu:', activePosyanduId);

      // We filter by lansia.posyandu_id to ensure data isolation
      let query = supabase
        .from('pemeriksaan_lansias')
        .select(`
          *,
          lansia:lansias!inner(*)
        `)
        .eq('lansia.posyandu_id', activePosyanduId)
        .order('tanggal_periksa', { ascending: false });

      if (month !== undefined && year !== undefined) {
        const date = new Date(year, month, 1);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();
        query = query.gte('tanggal_periksa', start).lte('tanggal_periksa', end);
      }

      const { data, error } = await query;
      
      if (data && data.length > 0) {
        console.log('[usePemeriksaan] Found', data.length, 'records. First record posyandu_id:', data[0].lansia?.posyandu_id);
      } else {
        console.log('[usePemeriksaan] No records found for this posyandu');
      }

      if (error) throw error;
      return data as PemeriksaanLansia[];
    } catch (err: any) {
      console.error('[usePemeriksaan] Error:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get pemeriksaan for a specific month to check attendance
   */
  const getMonthlyAttendance = async (month: number, year: number) => {
    try {
      setLoading(true);
      const date = new Date(year, month, 1);
      const start = startOfMonth(date).toISOString();
      const end = endOfMonth(date).toISOString();

      const { data, error } = await supabase
        .from('pemeriksaan_lansias')
        .select('lansia_id, tanggal_periksa')
        .gte('tanggal_periksa', start)
        .lte('tanggal_periksa', end);

      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { getPemeriksaans, getMonthlyAttendance, loading, error };
};

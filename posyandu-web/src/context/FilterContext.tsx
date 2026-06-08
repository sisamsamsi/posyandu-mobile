'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FilterContextType {
  selectedDesa: string;
  setSelectedDesa: (desa: string) => void;
  selectedPosyanduId: string;
  setSelectedPosyanduId: (id: string) => void;
  desaList: string[];
  posyanduList: Array<{
    id: string;
    nama_posyandu: string;
    nama_posyandu_balita: string | null;
    nama_posyandu_lansia: string | null;
    jadwal_balita_tanggal: number | null;
    jadwal_lansia_tanggal: number | null;
    tipe_posyandu: string;
    kelurahan: string;
    invite_code: string | null;
  }>;
  loading: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedDesa, setSelectedDesa] = useState<string>('all');
  const [selectedPosyanduId, setSelectedPosyanduId] = useState<string>('all');
  const [desaList, setDesaList] = useState<string[]>([]);
  const [posyanduList, setPosyanduList] = useState<Array<{
    id: string;
    nama_posyandu: string;
    nama_posyandu_balita: string | null;
    nama_posyandu_lansia: string | null;
    jadwal_balita_tanggal: number | null;
    jadwal_lansia_tanggal: number | null;
    tipe_posyandu: string;
    kelurahan: string;
    invite_code: string | null;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch unique Desa/Kalurahan and Posyandus on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Get all Posyandu units
        const { data: posyandus, error } = await supabase
          .from('posyandus')
          .select('id, nama_posyandu, nama_posyandu_balita, nama_posyandu_lansia, jadwal_balita_tanggal, jadwal_lansia_tanggal, tipe_posyandu, kelurahan, invite_code')
          .order('nama_posyandu', { ascending: true });

        if (error) throw error;

        if (posyandus) {
          setPosyanduList(posyandus);
          
          // Extract unique kelurahan list
          const uniqueDesas = Array.from(
            new Set(posyandus.map((p) => p.kelurahan).filter(Boolean) as string[])
          ).sort();
          
          setDesaList(uniqueDesas);
        }
      } catch (err) {
        console.error('Error loading filter metadata:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter posyandu list based on selected desa
  const filteredPosyandus = posyanduList.filter(
    (p) => selectedDesa === 'all' || p.kelurahan === selectedDesa
  );

  return (
    <FilterContext.Provider
      value={{
        selectedDesa,
        setSelectedDesa,
        selectedPosyanduId,
        setSelectedPosyanduId,
        desaList,
        posyanduList: filteredPosyandus,
        loading,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}

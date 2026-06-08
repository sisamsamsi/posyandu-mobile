'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Activity, Calendar } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface PenimbanganRecord {
  id: string;
  balita_nama: string;
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  cara_ukur: string | null;
  status_bb_u: string | null;
  status_tb_u: string | null;
}

export default function PenimbanganPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<PenimbanganRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const calculateAgeMonths = (dobStr: string) => {
    const dob = new Date(dobStr);
    const today = new Date();
    let months = (today.getFullYear() - dob.getFullYear()) * 12;
    months -= dob.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Query penimbangans and join with balitas
        const { data: records, error } = await supabase
          .from('penimbangans')
          .select(`
            id, tanggal, berat_badan, tinggi_badan, cara_ukur, status_bb_u, status_tb_u,
            balita:balitas(nama, tanggal_lahir, posyandu_id, posyandu:posyandus(kelurahan))
          `)
          .order('tanggal', { ascending: false });

        if (error) throw error;

        // Filter out penimbangans belonging to balitas aged >= 60 months
        const activeRecords = (records || []).filter(r => {
          const dob = (r.balita as any)?.tanggal_lahir;
          if (!dob) return false;
          return calculateAgeMonths(dob) < 60;
        });

        let formatted: PenimbanganRecord[] = activeRecords.map(r => ({
          id: r.id,
          balita_nama: (r.balita as any)?.nama || 'Anak',
          tanggal: r.tanggal,
          berat_badan: r.berat_badan,
          tinggi_badan: r.tinggi_badan,
          cara_ukur: r.cara_ukur || 'Berdiri',
          status_bb_u: r.status_bb_u,
          status_tb_u: r.status_tb_u
        }));

        // Apply global filters
        if (selectedDesa !== 'all') {
          formatted = formatted.filter((_, idx) => {
            const bal = activeRecords[idx]?.balita;
            return (bal as any)?.posyandu?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          formatted = formatted.filter((_, idx) => {
            const bal = activeRecords[idx]?.balita;
            return (bal as any)?.posyandu_id === selectedPosyanduId;
          });
        }

        setData(formatted);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching penimbangans:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Integrasi dengan alat ukur timbangan digital pintar (Bluetooth Weight Scale) untuk pengisian otomatis tanpa input manual.',
    'Validasi logis rentang berat/tinggi badan saat entri data (pencegahan salah ketik: misal berat 100kg pada bayi).',
    'Fitur ekspor data timbang bulanan berformat Excel standard SIGIZI TERPADU untuk pelaporan nasional.'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Riwayat Penimbangan & Pengukuran"
      parentTitle="Balita"
      description="Catatan riwayat berat badan, tinggi/panjang badan, lingkar kepala, dan cara pengukuran balita pada setiap kunjungan bulanan posyandu."
      icon={Activity}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat riwayat penimbangan...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data penimbangan ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Balita</th>
                  <th>Tanggal Timbang</th>
                  <th>Berat Badan</th>
                  <th>Tinggi/Panjang</th>
                  <th>Cara Ukur</th>
                  <th>Status BB/U</th>
                  <th>Status TB/U</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.balita_nama}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                        {new Date(item.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </td>
                    <td>{item.berat_badan} kg</td>
                    <td>{item.tinggi_badan} cm</td>
                    <td>{item.cara_ukur}</td>
                    <td>
                      <span 
                        className={`badge ${
                          item.status_bb_u?.toLowerCase().includes('kurang') || item.status_bb_u?.toLowerCase().includes('buruk')
                            ? 'badge-danger' 
                            : 'badge-success'
                        }`}
                      >
                        {item.status_bb_u || 'Normal'}
                      </span>
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          item.status_tb_u?.toLowerCase().includes('pendek') 
                            ? 'badge-warning' 
                            : 'badge-success'
                        }`}
                      >
                        {item.status_tb_u || 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination-container">
              <span>Menampilkan {startIndex + 1}-{endIndex} dari {data.length} data</span>
              <div className="pagination-pages">
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page} 
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SubmenuPlaceholder>
  );
}

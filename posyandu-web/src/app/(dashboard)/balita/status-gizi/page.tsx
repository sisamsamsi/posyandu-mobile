'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Baby } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface StatusGiziData {
  id: string;
  nama: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  berat: number | null;
  tinggi: number | null;
  status_bb_u: string | null;
  status_tb_u: string | null;
  status_bb_tb: string | null;
}

export default function StatusGiziPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<StatusGiziData[]>([]);
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
        const { data: balitas, error } = await supabase
          .from('balitas')
          .select(`
            id, nama, jenis_kelamin, tanggal_lahir, posyandu_id,
            posyandu:posyandus(nama_posyandu, kelurahan),
            penimbangans(berat_badan, tinggi_badan, status_bb_u, status_tb_u, status_bb_tb, tanggal)
          `);

        if (error) throw error;

        // Filter out balitas aged >= 60 months
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        let formatted: StatusGiziData[] = activeBalitas.map(b => {
          // Get the latest penimbangan
          const sorted = (b.penimbangans || []).sort(
            (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
          );
          const latest = sorted[0] || null;

          return {
            id: b.id,
            nama: b.nama,
            jenis_kelamin: b.jenis_kelamin,
            tanggal_lahir: b.tanggal_lahir,
            berat: latest ? latest.berat_badan : null,
            tinggi: latest ? latest.tinggi_badan : null,
            status_bb_u: latest ? latest.status_bb_u : 'Belum Ditimbang',
            status_tb_u: latest ? latest.status_tb_u : 'Belum Ditimbang',
            status_bb_tb: latest ? latest.status_bb_tb : 'Belum Ditimbang'
          };
        });

        // Filter data
        if (selectedDesa !== 'all') {
          formatted = formatted.filter(b => {
            const posy = (balitas || []).find(item => item.id === b.id)?.posyandu;
            return (posy as any)?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          formatted = formatted.filter(b => {
            const pId = (balitas || []).find(item => item.id === b.id)?.posyandu_id;
            return pId === selectedPosyanduId;
          });
        }

        setData(formatted);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching status gizi:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Integrasi grafik pertumbuhan WHO Z-Score interaktif (TB/U, BB/U, BB/TB) pada profil anak untuk pemantauan tren gizi secara realtime.',
    'Deteksi dini malnutrisi (wasting/stunting) menggunakan algoritma klasifikasi WHO terotomatisasi saat bidan menginput hasil timbang.',
    'Pemberian rekomendasi menu PMT (Pemberian Makanan Tambahan) lokal berbasis kecerdasan buatan disesuaikan dengan jenis defisiensi gizi anak.'
  ];

  const getBadgeClass = (status: string | null) => {
    if (!status) return 'badge-info';
    const s = status.toLowerCase();
    if (s.includes('sangat pendek') || s.includes('gizi buruk') || s.includes('sangat kurang') || s.includes('stunting') || s.includes('wasting')) {
      return 'badge-danger';
    }
    if (s.includes('pendek') || s.includes('gizi kurang') || s.includes('kurang')) {
      return 'badge-warning';
    }
    if (s.includes('normal') || s.includes('baik') || s.includes('cukup')) {
      return 'badge-success';
    }
    return 'badge-info';
  };

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Status Gizi Balita"
      parentTitle="Balita"
      description="Analisis status pertumbuhan gizi balita berdasarkan parameter berat badan menurut umur (BB/U), tinggi badan menurut umur (TB/U), dan berat badan menurut tinggi badan (BB/TB) berdasar standar WHO."
      icon={Baby}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat klasifikasi status gizi...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data balita ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Balita</th>
                  <th>Jenis Kelamin</th>
                  <th>BB Terbaru</th>
                  <th>TB Terbaru</th>
                  <th>Status BB/U</th>
                  <th>Status TB/U (Stunting)</th>
                  <th>Status BB/TB (Wasting)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.nama}</td>
                    <td>{item.jenis_kelamin}</td>
                    <td>{item.berat ? `${item.berat} kg` : '-'}</td>
                    <td>{item.tinggi ? `${item.tinggi} cm` : '-'}</td>
                    <td>
                      <span className={`badge ${getBadgeClass(item.status_bb_u)}`}>
                        {item.status_bb_u || 'Belum diukur'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(item.status_tb_u)}`}>
                        {item.status_tb_u || 'Belum diukur'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(item.status_bb_tb)}`}>
                        {item.status_bb_tb || 'Belum diukur'}
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

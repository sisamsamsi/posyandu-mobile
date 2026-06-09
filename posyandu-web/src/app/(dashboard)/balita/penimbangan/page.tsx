'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Activity, Calendar } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

interface PenimbanganRecord {
  id: string;
  balita_nama: string;
  posyandu_nama: string;
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  cara_ukur: string;
  status_bb_u: string | null;
  status_tb_u: string | null;
}

function deriveCaraUkur(tanggalLahir: string, tanggalUkur: string): string {
  const dob = new Date(tanggalLahir);
  const ukur = new Date(tanggalUkur);
  let months = (ukur.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += ukur.getMonth();
  return months < 24 ? 'Terlentang (PB)' : 'Berdiri (TB)';
}

export default function PenimbanganPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<PenimbanganRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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
            id, tanggal, berat_badan, tinggi_badan, status_bb_u, status_tb_u,
            balita:balitas(nama, tanggal_lahir, posyandu_id, posyandu:posyandus(nama_posyandu, kelurahan))
          `)
          .order('tanggal', { ascending: false });

        if (error) {
          throw new Error(error.message || error.code || 'Gagal memuat penimbangans');
        }

        // Filter out penimbangans belonging to balitas aged >= 60 months
        const activeRecords = (records || []).filter(r => {
          const dob = (r.balita as any)?.tanggal_lahir;
          if (!dob) return false;
          return calculateAgeMonths(dob) < 60;
        });

        let filteredRecords = activeRecords;
        if (selectedDesa !== 'all') {
          filteredRecords = filteredRecords.filter(r => (r.balita as any)?.posyandu?.kelurahan === selectedDesa);
        }
        if (selectedPosyanduId !== 'all') {
          filteredRecords = filteredRecords.filter(r => (r.balita as any)?.posyandu_id === selectedPosyanduId);
        }

        const formatted: PenimbanganRecord[] = filteredRecords.map(r => {
          const bal = r.balita as any;
          const tanggalLahir = bal?.tanggal_lahir || '';
          return {
            id: r.id,
            balita_nama: bal?.nama || 'Anak',
            posyandu_nama: bal?.posyandu?.nama_posyandu || 'Posyandu',
            tanggal: r.tanggal,
            berat_badan: r.berat_badan,
            tinggi_badan: r.tinggi_badan,
            cara_ukur: tanggalLahir ? deriveCaraUkur(tanggalLahir, r.tanggal) : '—',
            status_bb_u: r.status_bb_u,
            status_tb_u: r.status_tb_u,
          };
        });

        setData(formatted);
        setCurrentPage(1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        console.error('Error fetching penimbangans:', msg);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const now = new Date();
  const bulanIni = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const stats = useMemo((): StatItem[] => {
    const bulanIniCount = data.filter(r => {
      const d = new Date(r.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const kurangBuruk = data.filter(r => {
      const s = r.status_bb_u?.toLowerCase() || '';
      return s.includes('kurang') || s.includes('buruk');
    }).length;
    const normal = data.filter(r => r.status_bb_u?.toLowerCase().includes('normal')).length;
    return [
      { label: 'Total Record', value: data.length, color: 'neutral' },
      { label: 'Bulan Ini', value: bulanIniCount, color: 'primary' },
      { label: 'Status Kurang/Buruk', value: kurangBuruk, color: 'warning' },
      { label: 'Status Normal', value: normal, color: 'success' },
    ];
  }, [data]);

  const insightText = useMemo(() => {
    if (data.length === 0) return undefined;
    const bulanIniRecords = data.filter(r => {
      const d = new Date(r.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const kurangCount = bulanIniRecords.filter(r => {
      const s = r.status_bb_u?.toLowerCase() || '';
      return s.includes('kurang') || s.includes('buruk');
    }).length;
    const posyCounts: Record<string, number> = {};
    bulanIniRecords.forEach(r => {
      posyCounts[r.posyandu_nama] = (posyCounts[r.posyandu_nama] || 0) + 1;
    });
    const topPosy = Object.entries(posyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    return `Tercatat **${bulanIniRecords.length} penimbangan** pada bulan ${bulanIni}. **${kurangCount} anak** menunjukkan status BB/U di bawah normal. Penimbangan terbanyak dilakukan di **${topPosy}**.`;
  }, [data]);

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Riwayat Penimbangan & Pengukuran"
      parentTitle="Balita"
      icon={Activity}
      loading={loading}
      stats={stats}
      sectionTitle="Riwayat Penimbangan Terbaru"
      insightText={insightText}
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

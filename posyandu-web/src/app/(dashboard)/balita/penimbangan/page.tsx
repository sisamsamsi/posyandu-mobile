'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Activity, Calendar, Search } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';
import AIInsightBox from '@/components/ui/AIInsightBox';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [bbuFilter, setBbuFilter] = useState<string>('all');
  const [tbuFilter, setTbuFilter] = useState<string>('all');

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

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.balita_nama.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (bbuFilter !== 'all') {
        const status = item.status_bb_u || '';
        if (bbuFilter === 'Normal') {
          if (!status.toLowerCase().includes('normal') && status !== '') return false;
        } else if (bbuFilter === 'Kurang/Buruk') {
          if (!status.toLowerCase().includes('kurang') && !status.toLowerCase().includes('buruk')) return false;
        }
      }

      if (tbuFilter !== 'all') {
        const status = item.status_tb_u || '';
        if (tbuFilter === 'Normal') {
          if (!status.toLowerCase().includes('normal') && status !== '') return false;
        } else if (tbuFilter === 'Pendek') {
          if (!status.toLowerCase().includes('pendek')) return false;
        }
      }

      return true;
    });
  }, [data, searchQuery, bbuFilter, tbuFilter]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, bbuFilter, tbuFilter]);

  const stats = useMemo((): StatItem[] => {
    const bulanIniCount = filteredData.filter(r => {
      const d = new Date(r.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const kurangBuruk = filteredData.filter(r => {
      const s = r.status_bb_u?.toLowerCase() || '';
      return s.includes('kurang') || s.includes('buruk');
    }).length;
    const normal = filteredData.filter(r => r.status_bb_u?.toLowerCase().includes('normal')).length;
    return [
      { label: 'Total Record', value: filteredData.length, color: 'neutral' },
      { label: 'Bulan Ini', value: bulanIniCount, color: 'primary' },
      { label: 'Status Kurang/Buruk', value: kurangBuruk, color: 'warning' },
      { label: 'Status Normal', value: normal, color: 'success' },
    ];
  }, [filteredData]);

  const insightData = useMemo(() => {
    if (filteredData.length === 0) return {};
    const bulanIniCount = filteredData.filter(r => {
      const d = new Date(r.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const kurangBuruk = filteredData.filter(r => {
      const s = r.status_bb_u?.toLowerCase() || '';
      return s.includes('kurang') || s.includes('buruk');
    }).length;
    const normal = filteredData.filter(r => r.status_bb_u?.toLowerCase().includes('normal')).length;

    return {
      total_record_tercatat: filteredData.length,
      penimbangan_bulan_ini: bulanIniCount,
      status_bb_kurang_atau_buruk: kurangBuruk,
      status_bb_normal: normal
    };
  }, [filteredData]);

  const insightText = useMemo(() => {
    if (filteredData.length === 0) return undefined;
    const bulanIniRecords = filteredData.filter(r => {
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
  }, [filteredData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Riwayat Penimbangan & Pengukuran"
      parentTitle="Balita"
      icon={Activity}
      loading={loading}
      stats={stats}
      sectionTitle="Riwayat Penimbangan Terbaru"
      insightText={undefined}
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
          {/* AI INSIGHT BOX */}
          <AIInsightBox
            konteks="Riwayat Penimbangan & Pengukuran Balita"
            bulan="Bulan Berjalan"
            filter={selectedPosyanduId === 'all' ? (selectedDesa === 'all' ? 'Semua Kalurahan' : `Kalurahan ${selectedDesa}`) : `Posyandu Terpilih`}
            data={insightData}
          />

          {/* SEARCH & FILTERS BAR */}
          <div className="filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama Balita..." 
              />
            </div>

            <select 
              className="header-select"
              value={bbuFilter}
              onChange={(e) => setBbuFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="all">Semua Status BB/U</option>
              <option value="Normal">Status Normal</option>
              <option value="Kurang/Buruk">Status Kurang/Buruk</option>
            </select>

            <select 
              className="header-select"
              value={tbuFilter}
              onChange={(e) => setTbuFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="all">Semua Status TB/U</option>
              <option value="Normal">Status Normal</option>
              <option value="Pendek">Status Pendek/Sangat Pendek</option>
            </select>
          </div>

          {filteredData.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              Tidak ditemukan data penimbangan yang cocok dengan filter.
            </div>
          ) : (
            <>
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
                  <span>Menampilkan {startIndex + 1}-{endIndex} dari {filteredData.length} data</span>
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
            </>
          )}
        </div>
      )}
    </SubmenuPlaceholder>
  );
}

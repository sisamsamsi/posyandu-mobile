'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Baby, Search } from 'lucide-react';
import SubmenuPlaceholder, { ActionItem, StatItem } from '@/components/layout/SubmenuPlaceholder';
import AIInsightBox from '@/components/ui/AIInsightBox';

interface StatusGiziData {
  id: string;
  nama: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  posyandu_nama: string;
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
  const itemsPerPage = 15;

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Laki-laki' | 'Perempuan'>('all');
  const [bbuFilter, setBbuFilter] = useState<string>('all');
  const [tbuFilter, setTbuFilter] = useState<string>('all');
  const [bbtbFilter, setBbtbFilter] = useState<string>('all');

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

          const posy = (b as any).posyandu;
          return {
            id: b.id,
            nama: b.nama,
            jenis_kelamin: b.jenis_kelamin,
            tanggal_lahir: b.tanggal_lahir,
            posyandu_nama: posy?.nama_posyandu || 'Posyandu',
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

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.nama.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (genderFilter !== 'all' && item.jenis_kelamin !== genderFilter) return false;

      if (bbuFilter !== 'all') {
        const status = item.status_bb_u || '';
        if (bbuFilter === 'Belum Ditimbang') {
          if (item.berat) return false;
        } else {
          if (!status.toLowerCase().includes(bbuFilter.toLowerCase())) return false;
        }
      }

      if (tbuFilter !== 'all') {
        const status = item.status_tb_u || '';
        if (tbuFilter === 'Belum Ditimbang') {
          if (item.tinggi) return false;
        } else {
          if (!status.toLowerCase().includes(tbuFilter.toLowerCase())) return false;
        }
      }

      if (bbtbFilter !== 'all') {
        const status = item.status_bb_tb || '';
        if (bbtbFilter === 'Belum Ditimbang') {
          if (item.berat || item.tinggi) return false;
        } else {
          if (!status.toLowerCase().includes(bbtbFilter.toLowerCase())) return false;
        }
      }

      return true;
    });
  }, [data, searchQuery, genderFilter, bbuFilter, tbuFilter, bbtbFilter]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, genderFilter, bbuFilter, tbuFilter, bbtbFilter]);

  const stats = useMemo((): StatItem[] => [
    { label: 'Total Tanggungan', value: filteredData.length, color: 'neutral' },
    { label: 'Sudah Ditimbang', value: filteredData.filter(d => d.status_tb_u !== 'Belum Ditimbang').length, color: 'primary' },
    { label: 'Stunting (TB/U↓)', value: filteredData.filter(d => d.status_tb_u?.toLowerCase().includes('pendek')).length, color: 'danger' },
    { label: 'Wasting (BB/TB↓)', value: filteredData.filter(d => {
      const s = d.status_bb_tb?.toLowerCase() || '';
      return s.includes('wasting') || s.includes('kurus') || s.includes('buruk');
    }).length, color: 'warning' },
  ], [filteredData]);

  const insightData = useMemo(() => {
    if (filteredData.length === 0) return {};
    return {
      total_aktif: filteredData.length,
      sudah_ditimbang: filteredData.filter(d => d.status_tb_u !== 'Belum Ditimbang').length,
      stunting: filteredData.filter(d => d.status_tb_u?.toLowerCase().includes('pendek')).length,
      wasting: filteredData.filter(d => {
        const s = d.status_bb_tb?.toLowerCase() || '';
        return s.includes('wasting') || s.includes('kurus') || s.includes('buruk');
      }).length
    };
  }, [filteredData]);

  const actionItems = useMemo((): ActionItem[] | undefined => {
    if (filteredData.length === 0) return undefined;
    const scored = filteredData.map(d => {
      const factors: string[] = [];
      if (d.status_tb_u?.toLowerCase().includes('pendek')) factors.push('Stunting');
      const bb = d.status_bb_tb?.toLowerCase() || '';
      if (bb.includes('wasting') || bb.includes('kurus') || bb.includes('buruk')) factors.push('Wasting');
      if (d.status_tb_u === 'Belum Ditimbang') factors.push('Belum ditimbang');
      return { ...d, factors };
    }).filter(d => d.factors.length > 0)
      .sort((a, b) => b.factors.length - a.factors.length)
      .slice(0, 3);

    if (scored.length === 0) return undefined;
    return scored.map(d => ({
      nama: `${d.nama} — ${d.posyandu_nama}`,
      keterangan: d.factors.join(' + '),
      urgensi: d.factors.length >= 2 ? 'tinggi' as const : 'sedang' as const,
    }));
  }, [filteredData]);

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
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Status Gizi Balita"
      parentTitle="Balita"
      icon={Baby}
      loading={loading}
      stats={stats}
      sectionTitle="Daftar Status Gizi Balita"
      actionItems={actionItems}
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
          {/* AI INSIGHT BOX */}
          <AIInsightBox
            konteks="Status Gizi Balita"
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
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              style={{ minWidth: '120px' }}
            >
              <option value="all">Semua Jenis Kelamin</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>

            <select 
              className="header-select"
              value={bbuFilter}
              onChange={(e) => setBbuFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="all">Semua Status BB/U</option>
              <option value="Normal">BB Normal</option>
              <option value="Sangat Kurang">BB Sangat Kurang</option>
              <option value="Kurang">BB Kurang</option>
              <option value="Risiko Lebih">Risiko BB Lebih</option>
              <option value="Belum Ditimbang">Belum Ditimbang</option>
            </select>

            <select 
              className="header-select"
              value={tbuFilter}
              onChange={(e) => setTbuFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="all">Semua Status TB/U</option>
              <option value="Normal">Tinggi Normal</option>
              <option value="Sangat Pendek">Sangat Pendek (Severely Stunted)</option>
              <option value="Pendek">Pendek (Stunted)</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Belum Ditimbang">Belum Ditimbang</option>
            </select>

            <select 
              className="header-select"
              value={bbtbFilter}
              onChange={(e) => setBbtbFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="all">Semua Status BB/TB</option>
              <option value="Gizi Baik">Gizi Baik (Normal)</option>
              <option value="Gizi Buruk">Gizi Buruk</option>
              <option value="Gizi Kurang">Gizi Kurang</option>
              <option value="Risiko Gizi Lebih">Risiko Gizi Lebih</option>
              <option value="Gizi Lebih">Gizi Lebih</option>
              <option value="Obesitas">Obesitas</option>
              <option value="Belum Ditimbang">Belum Ditimbang</option>
            </select>
          </div>

          {filteredData.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              Tidak ditemukan data balita yang cocok dengan filter.
            </div>
          ) : (
            <>
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

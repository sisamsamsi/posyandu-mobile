'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Baby, Search, Eye, ShieldCheck, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import SubmenuPlaceholder, { StatItem, ActionItem } from '@/components/layout/SubmenuPlaceholder';
import AIInsightBox from '@/components/ui/AIInsightBox';
import Link from 'next/link';

interface ImunisasiData {
  hb0_date: string | null;
  bcg_date: string | null;
  penta_1_date: string | null;
  penta_2_date: string | null;
  penta_3_date: string | null;
  ipv_1_date: string | null;
  ipv_2_date: string | null;
  ipv_3_date: string | null;
  pcv_1_date: string | null;
  pcv_2_date: string | null;
  pcv_3_date: string | null;
  rv_1_date: string | null;
  rv_2_date: string | null;
  rv_3_date: string | null;
  mr_date: string | null;
  je_date: string | null;
  booster_penta_date: string | null;
  booster_mr_date: string | null;
}

interface BalitaImunisasiRecord {
  id: string;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  nama_ortu: string;
  posyandu_id: string | null;
  nama_posyandu: string;
  kelurahan: string;
  imunisasi: ImunisasiData | null;
  completedCount: number;
  totalVaksin: number;
  progressPercent: number;
  status: 'Lengkap' | 'Belum Lengkap';
}

const vaccineFields: { key: keyof ImunisasiData; label: string }[] = [
  { key: 'hb0_date', label: 'HB0' },
  { key: 'bcg_date', label: 'BCG' },
  { key: 'penta_1_date', label: 'Penta 1' },
  { key: 'penta_2_date', label: 'Penta 2' },
  { key: 'penta_3_date', label: 'Penta 3' },
  { key: 'ipv_1_date', label: 'IPV 1' },
  { key: 'ipv_2_date', label: 'IPV 2' },
  { key: 'ipv_3_date', label: 'IPV 3' },
  { key: 'pcv_1_date', label: 'PCV 1' },
  { key: 'pcv_2_date', label: 'PCV 2' },
  { key: 'pcv_3_date', label: 'PCV 3' },
  { key: 'rv_1_date', label: 'RV 1' },
  { key: 'rv_2_date', label: 'RV 2' },
  { key: 'rv_3_date', label: 'RV 3' },
  { key: 'mr_date', label: 'MR' },
  { key: 'je_date', label: 'JE' },
  { key: 'booster_penta_date', label: 'B. Penta' },
  { key: 'booster_mr_date', label: 'B. MR' }
];

export default function ImunisasiBalitaPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();

  const [balitas, setBalitas] = useState<BalitaImunisasiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState<'all' | 'lengkap' | 'belum'>('all');
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

        const { data: posyandus, error: pErr } = await supabase
          .from('posyandus')
          .select('id, nama_posyandu, kelurahan');
        if (pErr) throw pErr;

        const { data: balitasRaw, error: bErr } = await supabase
          .from('balitas')
          .select(`
            id, nik, nama, tanggal_lahir, jenis_kelamin, nama_ortu, posyandu_id,
            imunisasi(hb0_date, bcg_date, penta_1_date, penta_2_date, penta_3_date, ipv_1_date, ipv_2_date, ipv_3_date, pcv_1_date, pcv_2_date, pcv_3_date, rv_1_date, rv_2_date, rv_3_date, mr_date, je_date, booster_penta_date, booster_mr_date)
          `);
        if (bErr) throw bErr;

        const posyanduMap = new Map<string, typeof posyandus[0]>();
        (posyandus || []).forEach(p => posyanduMap.set(p.id, p));

        // Filter out balitas born before 2023 (only track 2023 to 2026+)
        const activeBalitas = (balitasRaw || []).filter(b => {
          const birthYear = new Date(b.tanggal_lahir).getFullYear();
          return birthYear >= 2023;
        });

        const list: BalitaImunisasiRecord[] = activeBalitas.map(b => {
          const posy = b.posyandu_id ? posyanduMap.get(b.posyandu_id) : null;
          const imuRecord = Array.isArray(b.imunisasi) 
            ? (b.imunisasi[0] as ImunisasiData || null) 
            : (b.imunisasi as ImunisasiData || null);

          // Calculate completed vaccines count
          let completedCount = 0;
          if (imuRecord) {
            vaccineFields.forEach(vf => {
              if (imuRecord[vf.key]) completedCount++;
            });
          }

          const totalVaksin = vaccineFields.length;
          const progressPercent = Math.round((completedCount / totalVaksin) * 100);
          const status = completedCount === totalVaksin ? 'Lengkap' : 'Belum Lengkap';

          return {
            id: b.id,
            nik: b.nik || '-',
            nama: b.nama,
            tanggal_lahir: b.tanggal_lahir,
            jenis_kelamin: b.jenis_kelamin || '-',
            nama_ortu: b.nama_ortu || '-',
            posyandu_id: b.posyandu_id,
            nama_posyandu: posy?.nama_posyandu || 'Tidak Terikat',
            kelurahan: posy?.kelurahan || 'Tidak Terikat',
            imunisasi: imuRecord,
            completedCount,
            totalVaksin,
            progressPercent,
            status
          };
        });

        setBalitas(list);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching immunization data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [filtersLoading]);

  // Apply filters
  const filteredData = useMemo(() => {
    return balitas.filter(b => {
      // 1. Global Village/Kelurahan filter
      if (selectedDesa !== 'all' && b.kelurahan !== selectedDesa) return false;

      // 2. Global Posyandu filter
      if (selectedPosyanduId !== 'all' && b.posyandu_id !== selectedPosyanduId) return false;

      // 3. UI Completeness filter
      if (completenessFilter === 'lengkap' && b.status !== 'Lengkap') return false;
      if (completenessFilter === 'belum' && b.status !== 'Belum Lengkap') return false;

      // 4. UI Search query
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        b.nama.toLowerCase().includes(q) || 
        b.nik.includes(q) || 
        b.nama_ortu.toLowerCase().includes(q);
      
      return matchesSearch;
    });
  }, [balitas, selectedDesa, selectedPosyanduId, completenessFilter, searchQuery]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, completenessFilter, selectedDesa, selectedPosyanduId]);

  // Stats for the header cards
  const stats = useMemo((): StatItem[] => {
    const total = filteredData.length;
    const lengkap = filteredData.filter(b => b.status === 'Lengkap').length;
    const belum = filteredData.filter(b => b.status === 'Belum Lengkap').length;
    const avgPercent = total > 0 
      ? Math.round(filteredData.reduce((acc, curr) => acc + curr.progressPercent, 0) / total)
      : 0;

    return [
      { label: 'Total Balita Aktif', value: total, color: 'neutral' },
      { label: 'Imunisasi Lengkap', value: lengkap, color: 'success' },
      { label: 'Belum Lengkap', value: belum, color: 'warning' },
      { label: 'Rerata Progres Imunisasi', value: `${avgPercent}%`, color: 'primary' }
    ];
  }, [filteredData]);

  // Action items (most lagged/behind immunization)
  const actionItems = useMemo((): ActionItem[] | undefined => {
    if (filteredData.length === 0) return undefined;
    return [...filteredData]
      .filter(b => b.status === 'Belum Lengkap')
      .sort((a, b) => a.completedCount - b.completedCount)
      .slice(0, 3)
      .map(b => ({
        nama: `${b.nama} (${calculateAgeMonths(b.tanggal_lahir)} bln)`,
        keterangan: `${b.completedCount} dari 18 imunisasi (${b.progressPercent}%)`,
        urgensi: b.completedCount < 5 ? 'tinggi' as const : 'sedang' as const
      }));
  }, [filteredData]);

  // AI Insight summary payload
  const insightData = useMemo(() => {
    if (filteredData.length === 0) return {};
    const total = filteredData.length;
    const lengkap = filteredData.filter(b => b.status === 'Lengkap').length;
    const belum = filteredData.filter(b => b.status === 'Belum Lengkap').length;
    const percentLengkap = total > 0 ? Math.round((lengkap / total) * 100) : 0;

    return {
      total_balita_aktif: total,
      imunisasi_lengkap: lengkap,
      belum_lengkap: belum,
      persentase_kelengkapan_imunisasi: `${percentLengkap}%`,
      rekomendasi_utama: belum > 0 
        ? 'Jadwalkan kunjungan rumah atau kirim pengingat WhatsApp ke orang tua balita dengan imunisasi tertinggal' 
        : 'Pertahankan cakupan imunisasi 100% yang sudah tercapai'
    };
  }, [filteredData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Monitoring Imunisasi Balita"
      parentTitle="Balita"
      icon={Baby}
      loading={loading}
      stats={stats}
      sectionTitle="Progres Imunisasi Balita"
      actionItems={actionItems}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat data imunisasi balita...
        </div>
      ) : balitas.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data balita aktif ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* AI INSIGHT SUMMARY */}
          <AIInsightBox
            konteks="Monitoring Imunisasi Balita"
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
                placeholder="Cari Nama Balita, NIK, atau Orang Tua..." 
              />
            </div>

            <select 
              className="header-select"
              value={completenessFilter}
              onChange={(e) => setCompletenessFilter(e.target.value as any)}
              style={{ minWidth: '180px' }}
            >
              <option value="all">Semua Status Imunisasi</option>
              <option value="lengkap">Imunisasi Lengkap</option>
              <option value="belum">Belum Lengkap</option>
            </select>
          </div>

          {filteredData.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              Tidak ditemukan data balita yang cocok dengan kriteria pencarian/filter.
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '150px' }}>Nama Balita</th>
                      <th>Usia (Bulan)</th>
                      <th>Orang Tua</th>
                      <th>Nama Posyandu</th>
                      <th style={{ minWidth: '120px' }}>Progres Imunisasi</th>
                      <th>Status</th>
                      <th style={{ minWidth: '140px' }}>Preview Vaksinasi</th>
                      <th style={{ textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.nama}</span>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>NIK: {item.nik}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 500 }}>
                          {calculateAgeMonths(item.tanggal_lahir)} bln
                        </td>
                        <td>{item.nama_ortu}</td>
                        <td>{item.nama_posyandu}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                flex: 1,
                                backgroundColor: '#e2e8f0',
                                height: '6px',
                                borderRadius: '3px',
                                width: '60px',
                                overflow: 'hidden',
                              }}>
                                <div style={{
                                  width: `${item.progressPercent}%`,
                                  backgroundColor: item.status === 'Lengkap' ? 'var(--color-success)' : 'var(--color-primary)',
                                  height: '100%',
                                  borderRadius: '3px',
                                  transition: 'width 0.4s ease',
                                }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '32px' }}>
                                {item.progressPercent}%
                              </span>
                            </div>
                            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                              {item.completedCount} dari {item.totalVaksin} Vaksin
                            </span>
                          </div>
                        </td>
                        <td>
                          <span 
                            className={`badge ${
                              item.status === 'Lengkap' 
                                ? 'badge-success' 
                                : 'badge-warning'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '250px' }}>
                            {[
                              { key: 'hb0_date', label: 'HB0' },
                              { key: 'bcg_date', label: 'BCG' },
                              { key: 'penta_1_date', label: 'Penta 1' },
                              { key: 'penta_2_date', label: 'Penta 2' },
                              { key: 'penta_3_date', label: 'Penta 3' },
                              { key: 'mr_date', label: 'MR' }
                            ].map(v => {
                              const done = item.imunisasi ? !!item.imunisasi[v.key as keyof ImunisasiData] : false;
                              return (
                                <span 
                                  key={v.key}
                                  title={`${v.label}: ${done ? 'Sudah diberikan' : 'Belum diberikan'}`}
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    backgroundColor: done ? '#f0fdf4' : '#f8fafc',
                                    border: done ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                    color: done ? '#15803d' : '#94a3b8'
                                  }}
                                >
                                  {done ? <CheckCircle size={9} style={{ color: '#22c55e' }} /> : <XCircle size={9} style={{ color: '#94a3b8' }} />}
                                  {v.label}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link 
                            href={`/balita/${item.id}`}
                            className="btn btn-outline btn-icon" 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              gap: '4px',
                              backgroundColor: 'white',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              color: '#1e293b',
                              cursor: 'pointer',
                              textDecoration: 'none'
                            }}
                          >
                            <Eye size={12} />
                            <span>Detail</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination-container">
                  <span>Menampilkan {startIndex + 1}–{endIndex} dari {filteredData.length} balita</span>
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

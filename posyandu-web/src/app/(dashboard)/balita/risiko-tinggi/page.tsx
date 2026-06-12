'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import SubmenuPlaceholder, { ActionItem, StatItem } from '@/components/layout/SubmenuPlaceholder';
import AIInsightBox from '@/components/ui/AIInsightBox';

interface RisikoBalitaRecord {
  id: string;
  nama: string;
  tanggal_lahir: string;
  ortu: string;
  posyandu_nama: string;
  faktor_risiko: string[];
  status_gizi: string;
}

const getBadgeStyles = (factor: string) => {
  const f = factor.toLowerCase();
  if (f.includes('stunting') || f.includes('pendek')) {
    return {
      backgroundColor: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fee2e2'
    };
  }
  if (f.includes('wasting') || f.includes('kurus')) {
    return {
      backgroundColor: '#fff7ed',
      color: '#c2410c',
      border: '1px solid #ffedd5'
    };
  }
  if (f.includes('underweight') || f.includes('kurang')) {
    return {
      backgroundColor: '#f5f3ff',
      color: '#5b21b6',
      border: '1px solid #ddd6fe'
    };
  }
  if (f.includes('imunisasi')) {
    return {
      backgroundColor: '#fffbeb',
      color: '#b45309',
      border: '1px solid #fde68a'
    };
  }
  return {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1'
  };
};

export default function RisikoTinggiPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<RisikoBalitaRecord[]>([]);
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
        const { data: balitas, error } = await supabase
          .from('balitas')
          .select(`
            id, nama, tanggal_lahir, nama_ortu, posyandu_id,
            posyandu:posyandus(nama_posyandu, kelurahan),
            penimbangans(status_bb_u, status_tb_u, status_bb_tb, tanggal),
            imunisasi(hb0_date, bcg_date, penta_1_date, penta_2_date, penta_3_date, ipv_1_date, ipv_2_date, ipv_3_date, pcv_1_date, pcv_2_date, pcv_3_date, rv_1_date, rv_2_date, rv_3_date, mr_date, je_date, booster_penta_date, booster_mr_date)
          `);

        if (error) {
          console.error('Error fetching high-risk balitas', error);
          throw new Error(error.message || JSON.stringify(error));
        }

        // Filter out balitas aged >= 60 months
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        const riskList: RisikoBalitaRecord[] = [];

        activeBalitas.forEach(b => {
          const sorted = (b.penimbangans || []).sort(
            (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
          );
          const latest = sorted[0];
          const factors: string[] = [];

          // Stunting Check
          if (latest?.status_tb_u && (
            latest.status_tb_u.toLowerCase().includes('sangat pendek') || 
            latest.status_tb_u.toLowerCase().includes('pendek') || 
            latest.status_tb_u.toLowerCase().includes('stunting')
          )) {
            factors.push(`Stunting (${latest.status_tb_u})`);
          }

          // Wasting Check
          if (latest?.status_bb_tb && (
            latest.status_bb_tb.toLowerCase().includes('sangat kurus') || 
            latest.status_bb_tb.toLowerCase().includes('kurus') || 
            latest.status_bb_tb.toLowerCase().includes('wasting')
          )) {
            factors.push(`Wasting (${latest.status_bb_tb})`);
          }

          // Underweight Check
          if (latest?.status_bb_u && (
            latest.status_bb_u.toLowerCase().includes('sangat kurang') || 
            latest.status_bb_u.toLowerCase().includes('kurang') ||
            latest.status_bb_u.toLowerCase().includes('underweight')
          )) {
            factors.push(`Underweight (${latest.status_bb_u})`);
          }

          // Check immunization completeness for toddlers born in 2023 or later
          const birthYear = new Date(b.tanggal_lahir).getFullYear();
          if (birthYear >= 2023) {
            const imuRecord = Array.isArray(b.imunisasi) ? b.imunisasi[0] : b.imunisasi;
            const imuFields = [
              'hb0_date', 'bcg_date', 'penta_1_date', 'penta_2_date', 'penta_3_date',
              'ipv_1_date', 'ipv_2_date', 'ipv_3_date', 'pcv_1_date', 'pcv_2_date',
              'pcv_3_date', 'rv_1_date', 'rv_2_date', 'rv_3_date', 'mr_date', 'je_date',
              'booster_penta_date', 'booster_mr_date'
            ];
            const imuCount = imuRecord
              ? imuFields.filter(f => !!(imuRecord as any)[f]).length
              : 0;
            if (imuCount < 2) {
              factors.push('Imunisasi Dasar Belum Lengkap');
            }
          }

          // If there are risk factors, add to list
          if (factors.length > 0) {
            riskList.push({
              id: b.id,
              nama: b.nama,
              tanggal_lahir: b.tanggal_lahir,
              ortu: b.nama_ortu || 'Tidak Ada Data',
              posyandu_nama: (b.posyandu as any)?.nama_posyandu || 'Posyandu',
              faktor_risiko: factors,
              status_gizi: latest ? `TB/U: ${latest.status_tb_u || '-'}, BB/TB: ${latest.status_bb_tb || '-'}` : 'Belum Ditimbang'
            });
          }
        });

        // Apply filters
        let filtered = riskList;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(b => {
            const posy = (balitas || []).find(item => item.id === b.id)?.posyandu;
            return (posy as any)?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(b => {
            const pId = (balitas || []).find(item => item.id === b.id)?.posyandu_id;
            return pId === selectedPosyanduId;
          });
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching high-risk balitas:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const stats = useMemo((): StatItem[] => [
    { label: 'Total Berisiko', value: data.length, color: 'danger' },
    { label: 'Stunting', value: data.filter(d => d.faktor_risiko.some(f => f.includes('Stunting'))).length, color: 'danger' },
    { label: 'Wasting', value: data.filter(d => d.faktor_risiko.some(f => f.includes('Wasting'))).length, color: 'warning' },
    { label: 'Imunisasi Tidak Lengkap', value: data.filter(d => d.faktor_risiko.some(f => f.includes('Imunisasi'))).length, color: 'warning' },
  ], [data]);

  const insightData = useMemo(() => {
    if (data.length === 0) return {};
    return {
      total_berisiko: data.length,
      stunting: data.filter(d => d.faktor_risiko.some(f => f.includes('Stunting'))).length,
      wasting: data.filter(d => d.faktor_risiko.some(f => f.includes('Wasting'))).length,
      imunisasi_tidak_lengkap: data.filter(d => d.faktor_risiko.some(f => f.includes('Imunisasi'))).length
    };
  }, [data]);

  const actionItems = useMemo((): ActionItem[] | undefined => {
    if (data.length === 0) return undefined;
    return [...data]
      .sort((a, b) => b.faktor_risiko.length - a.faktor_risiko.length)
      .slice(0, 3)
      .map(d => ({
        nama: `${d.nama} — ${d.posyandu_nama}`,
        keterangan: d.faktor_risiko.join(' + '),
        urgensi: d.faktor_risiko.length >= 2 ? 'tinggi' as const : 'sedang' as const,
      }));
  }, [data]);

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Balita Risiko Tinggi"
      parentTitle="Balita"
      icon={AlertTriangle}
      loading={loading}
      stats={stats}
      sectionTitle="Daftar Balita Berisiko"
      actionItems={actionItems}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menganalisis faktor risiko balita...
        </div>
      ) : data.length === 0 ? (
        <div 
          className="card" 
          style={{ 
            padding: '24px', 
            textAlign: 'center', 
            backgroundColor: '#f0fdf4', 
            borderColor: '#bbf7d0',
            color: '#15803d',
            borderRadius: '16px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={32} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Luar Biasa!</h3>
            <p style={{ fontSize: '12px', margin: 0 }}>Tidak ada balita teridentifikasi risiko tinggi pada wilayah posyandu terpilih saat ini.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* AI INSIGHT BOX */}
          <AIInsightBox
            konteks="Risiko Tinggi Balita"
            bulan="Bulan Berjalan"
            filter={selectedPosyanduId === 'all' ? (selectedDesa === 'all' ? 'Semua Kalurahan' : `Kalurahan ${selectedDesa}`) : `Posyandu Terpilih`}
            data={insightData}
          />

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Balita</th>
                  <th>Orang Tua</th>
                  <th>Faktor Risiko Terdeteksi</th>
                  <th>Tindakan Medis</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{item.nama}</td>
                    <td>{item.ortu}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {item.faktor_risiko.map((factor, i) => (
                          <span 
                            key={i} 
                            style={{ 
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              lineHeight: '1.2',
                              whiteSpace: 'nowrap',
                              ...getBadgeStyles(factor)
                            }}
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ cursor: 'pointer' }}>
                        Rujuk Puskesmas / Intervensi PMT
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

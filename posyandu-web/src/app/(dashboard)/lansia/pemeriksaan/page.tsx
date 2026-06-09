'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Heart, Calendar } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

interface PemeriksaanLansiaRecord {
  id: string;
  lansia_nama: string;
  tanggal_periksa: string;
  tekanan_darah: string | null;
  gula_darah: number | null;
  kolesterol: number | null;
  asam_urat: number | null;
}

export default function PemeriksaanLansiaPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<PemeriksaanLansiaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Query pemeriksaan_lansias joined with lansias
        const { data: records, error } = await supabase
          .from('pemeriksaan_lansias')
          .select(`
            id, tanggal_periksa, tekanan_darah, gula_darah, kolesterol, asam_urat,
            lansia:lansias(nama, posyandu_id, posyandu:posyandus(nama_posyandu, kelurahan))
          `)
          .order('tanggal_periksa', { ascending: false });

        if (error) throw error;

        let formatted: PemeriksaanLansiaRecord[] = (records || []).map(r => ({
          id: r.id,
          lansia_nama: (r.lansia as any)?.nama || 'Lansia',
          tanggal_periksa: r.tanggal_periksa,
          tekanan_darah: r.tekanan_darah,
          gula_darah: r.gula_darah,
          kolesterol: r.kolesterol,
          asam_urat: r.asam_urat
        }));

        // Apply filters
        if (selectedDesa !== 'all') {
          formatted = formatted.filter((_, idx) => {
            const lan = (records || [])[idx]?.lansia;
            return (lan as any)?.posyandu?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          formatted = formatted.filter((_, idx) => {
            const lan = (records || [])[idx]?.lansia;
            return (lan as any)?.posyandu_id === selectedPosyanduId;
          });
        }

        setData(formatted);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching pemeriksaan lansia:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const stats = useMemo((): StatItem[] => {
    const hipertensi = data.filter(d => {
      if (!d.tekanan_darah) return false;
      const sis = parseInt(d.tekanan_darah.split('/')[0]);
      return sis >= 140;
    }).length;
    const gulaTinggi = data.filter(d => d.gula_darah && d.gula_darah >= 200).length;
    const kolesterolTinggi = data.filter(d => d.kolesterol && d.kolesterol >= 200).length;
    return [
      { label: 'Total Pemeriksaan', value: data.length, color: 'neutral' },
      { label: 'Hipertensi (TD≥140)', value: hipertensi, color: 'danger' },
      { label: 'Gula Tinggi (≥200)', value: gulaTinggi, color: 'warning' },
      { label: 'Kolesterol Tinggi (≥200)', value: kolesterolTinggi, color: 'warning' },
    ];
  }, [data]);

  const insightText = useMemo(() => {
    if (data.length === 0) return undefined;
    const hipertensi = data.filter(d => {
      if (!d.tekanan_darah) return false;
      const sis = parseInt(d.tekanan_darah.split('/')[0]);
      return sis >= 140;
    }).length;
    const gulaTinggi = data.filter(d => d.gula_darah && d.gula_darah >= 200).length;
    const multiRisiko = data.filter(d => {
      let count = 0;
      if (d.tekanan_darah && parseInt(d.tekanan_darah.split('/')[0]) >= 140) count++;
      if (d.gula_darah && d.gula_darah >= 200) count++;
      if (d.kolesterol && d.kolesterol >= 200) count++;
      return count >= 2;
    }).length;
    return `Dari **${data.length} pemeriksaan** tercatat, **${hipertensi} lansia** terdeteksi hipertensi (sistolik ≥140 mmHg). **${gulaTinggi} lansia** memiliki kadar gula darah di atas normal. Pemantauan rutin direkomendasikan untuk **${multiRisiko} lansia** dengan multi-risiko.`;
  }, [data]);

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Pemeriksaan Kesehatan Lansia"
      parentTitle="Lansia"
      icon={Heart}
      loading={loading}
      stats={stats}
      sectionTitle="Riwayat Pemeriksaan Kesehatan"
      insightText={insightText}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat riwayat pemeriksaan kesehatan lansia...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data pemeriksaan lansia ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Lansia</th>
                  <th>Tanggal Periksa</th>
                  <th>Tekanan Darah</th>
                  <th>Gula Darah (mg/dL)</th>
                  <th>Kolesterol (mg/dL)</th>
                  <th>Asam Urat (mg/dL)</th>
                  <th>Status Indikasi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => {
                  // Determine high indicators
                  let isHighBP = false;
                  if (item.tekanan_darah) {
                    const parts = item.tekanan_darah.split('/');
                    const systolic = parseInt(parts[0]);
                    const diastolic = parseInt(parts[1]);
                    if (systolic >= 140 || diastolic >= 90) isHighBP = true;
                  }
                  const isHighSugar = item.gula_darah ? item.gula_darah >= 200 : false;
                  const isHighChol = item.kolesterol ? item.kolesterol >= 200 : false;

                  const isWarning = isHighBP || isHighSugar || isHighChol;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.lansia_nama}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                          {new Date(item.tanggal_periksa).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td style={{ color: isHighBP ? 'var(--color-danger)' : 'inherit', fontWeight: isHighBP ? 600 : 'normal' }}>
                        {item.tekanan_darah || '-'} mmHg
                      </td>
                      <td style={{ color: isHighSugar ? 'var(--color-danger)' : 'inherit', fontWeight: isHighSugar ? 600 : 'normal' }}>
                        {item.gula_darah || '-'}
                      </td>
                      <td style={{ color: isHighChol ? 'var(--color-danger)' : 'inherit', fontWeight: isHighChol ? 600 : 'normal' }}>
                        {item.kolesterol || '-'}
                      </td>
                      <td>{item.asam_urat || '-'}</td>
                      <td>
                        <span className={`badge ${isWarning ? 'badge-danger' : 'badge-success'}`}>
                          {isWarning ? 'Faktor Risiko PTM' : 'Normal / Stabil'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { BrainCircuit, Search } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

interface RiskLansiaPredictRecord {
  id: string;
  nama: string;
  tensi: string;
  gds: number | null;
  prediksi_komplikasi: string;
  skor_risiko: number;
}

export default function AnalisisRisikoLansiaPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<RiskLansiaPredictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'Tinggi' | 'Sedang' | 'Rendah'>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Query lansia and checkups
        const { data: lansias, error } = await supabase
          .from('lansias')
          .select(`
            id, nama, posyandu_id,
            posyandu:posyandus(nama_posyandu, kelurahan),
            pemeriksaan_lansias(tekanan_darah, gula_darah, kolesterol, tanggal_periksa)
          `);

        if (error) throw error;

        const list: RiskLansiaPredictRecord[] = [];

        (lansias || []).forEach(l => {
          const sorted = (l.pemeriksaan_lansias || []).sort(
            (a: any, b: any) => new Date(b.tanggal_periksa).getTime() - new Date(a.tanggal_periksa).getTime()
          );
          const latest = sorted[0];

          if (latest) {
            let score = 10;
            let status = 'Rendah (Komplikasi Kardiovaskular Rendah)';
            
            // BP Risk
            if (latest.tekanan_darah) {
              const systolic = parseInt(latest.tekanan_darah.split('/')[0]);
              if (systolic >= 160) {
                score += 40;
              } else if (systolic >= 140) {
                score += 20;
              }
            }

            // Glucose Risk
            if (latest.gula_darah) {
              if (latest.gula_darah >= 250) {
                score += 30;
              } else if (latest.gula_darah >= 180) {
                score += 15;
              }
            }

            // Cholesterol Risk
            if (latest.kolesterol) {
              if (latest.kolesterol >= 240) {
                score += 20;
              } else if (latest.kolesterol >= 200) {
                score += 10;
              }
            }

            if (score >= 60) {
              status = 'Tinggi (Risiko Stroke & Serangan Jantung)';
            } else if (score >= 30) {
              status = 'Sedang (Risiko Hipertensi/Diabetes Melitus)';
            }

            list.push({
              id: l.id,
              nama: l.nama,
              tensi: latest.tekanan_darah || '-',
              gds: latest.gula_darah,
              prediksi_komplikasi: status,
              skor_risiko: Math.min(score, 100)
            });
          }
        });

        // Apply filters
        let filtered = list;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(b => {
            const lan = (lansias || []).find(item => item.id === b.id)?.posyandu;
            return (lan as any)?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(b => {
            const pId = (lansias || []).find(item => item.id === b.id)?.posyandu_id;
            return pId === selectedPosyanduId;
          });
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching lansia risk prediction:', err);
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

      // Risk level filter
      if (riskFilter !== 'all') {
        const itemRisk = item.prediksi_komplikasi.toLowerCase();
        if (riskFilter === 'Tinggi' && !itemRisk.includes('tinggi')) return false;
        if (riskFilter === 'Sedang' && !itemRisk.includes('sedang')) return false;
        if (riskFilter === 'Rendah' && !itemRisk.includes('rendah')) return false;
      }

      return true;
    });
  }, [data, searchQuery, riskFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, riskFilter]);

  const stats = useMemo((): StatItem[] => [
    { label: 'Total Berisiko', value: filteredData.length, color: 'neutral' },
    { label: 'Risiko Tinggi', value: filteredData.filter(d => d.prediksi_komplikasi.toLowerCase().includes('tinggi')).length, color: 'danger' },
    { label: 'Risiko Sedang', value: filteredData.filter(d => d.prediksi_komplikasi.toLowerCase().includes('sedang')).length, color: 'warning' },
    { label: 'Multi-Risiko', value: filteredData.filter(d => d.skor_risiko >= 50).length, color: 'danger' },
  ], [filteredData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Risiko Lansia"
      parentTitle="Analitik Wilayah"
      icon={BrainCircuit}
      loading={loading}
      stats={stats}
      sectionTitle="Hasil Analisis"
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menganalisis probabilitas risiko lansia...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data lansia untuk dievaluasi oleh model AI.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* SEARCH & FILTERS BAR */}
          <div className="filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama Lansia..." 
              />
            </div>

            <select 
              className="header-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              style={{ minWidth: '160px' }}
            >
              <option value="all">Semua Kategori Risiko</option>
              <option value="Tinggi">Risiko Tinggi</option>
              <option value="Sedang">Risiko Sedang</option>
              <option value="Rendah">Risiko Rendah</option>
            </select>
          </div>

          {filteredData.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              Tidak ditemukan hasil analisis risiko lansia yang cocok dengan filter.
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Nama Lansia</th>
                      <th>Tekanan Darah</th>
                      <th>Gula Darah (mg/dL)</th>
                      <th>Prediksi Risiko Komplikasi (AI)</th>
                      <th>Skor Probabilitas Risiko</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.nama}</td>
                        <td>{item.tensi} mmHg</td>
                        <td>{item.gds || '-'}</td>
                        <td>
                          <span 
                            className={`badge ${
                              item.prediksi_komplikasi.includes('Tinggi') 
                                ? 'badge-danger' 
                                : item.prediksi_komplikasi.includes('Sedang') 
                                ? 'badge-warning' 
                                : 'badge-success'
                            }`}
                          >
                            {item.prediksi_komplikasi}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', width: '60px' }}>
                              <div 
                                style={{ 
                                  width: `${item.skor_risiko}%`, 
                                  backgroundColor: item.skor_risiko >= 60 ? 'var(--color-danger)' : item.skor_risiko >= 30 ? 'var(--color-warning)' : 'var(--color-success)', 
                                  height: '60%', 
                                  borderRadius: '3px' 
                                }} 
                              />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.skor_risiko}%</span>
                          </div>
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

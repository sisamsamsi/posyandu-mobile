'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { BrainCircuit, TrendingDown } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

interface RiskBalitaPredictRecord {
  id: string;
  nama: string;
  status_gizi: string;
  tren_berat: string;
  risiko_stunting: string;
  skor_risiko: number;
}

export default function AnalisisRisikoBalitaPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<RiskBalitaPredictRecord[]>([]);
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
        // Query balitas and their weighings
        const { data: balitas, error } = await supabase
          .from('balitas')
          .select(`
            id, nama, tanggal_lahir, posyandu_id,
            posyandu:posyandus(nama_posyandu, kelurahan),
            penimbangans(berat_badan, tinggi_badan, status_tb_u, tanggal)
          `);

        if (error) throw error;

        // Filter out balitas aged >= 60 months
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        const list: RiskBalitaPredictRecord[] = [];

        activeBalitas.forEach(b => {
          const sorted = (b.penimbangans || []).sort(
            (a: any, b: any) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime() // Oldest first
          );

          if (sorted.length >= 1) {
            const latest = sorted[sorted.length - 1];
            const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

            let weightTrend = 'Stabil';
            let risky = 'Rendah';
            let score = 20;

            if (prev) {
              const diff = latest.berat_badan - prev.berat_badan;
              if (diff < 0) {
                weightTrend = `Turun (${diff.toFixed(1)} kg)`;
                score += 35;
              } else if (diff === 0) {
                weightTrend = 'Tetap (Faltering)';
                score += 20;
              } else {
                weightTrend = `Naik (+${diff.toFixed(1)} kg)`;
              }
            } else {
              weightTrend = 'Data tunggal';
            }

            // Check if stunting or borderline stunting
            const statusTb = latest.status_tb_u || 'Normal';
            if (statusTb.toLowerCase().includes('pendek') || statusTb.toLowerCase().includes('stunting')) {
              risky = 'Tinggi (Terdeteksi Stunting)';
              score += 40;
            } else if (statusTb.toLowerCase().includes('normal') && score > 40) {
              risky = 'Sedang (Risiko Faltering)';
            } else if (score > 30) {
              risky = 'Sedang';
            }

            list.push({
              id: b.id,
              nama: b.nama,
              status_gizi: statusTb,
              tren_berat: weightTrend,
              risiko_stunting: risky,
              skor_risiko: Math.min(score, 100)
            });
          }
        });

        // Apply filters
        let filtered = list;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(b => {
            const bal = (balitas || []).find(item => item.id === b.id)?.posyandu;
            return (bal as any)?.kelurahan === selectedDesa;
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
        console.error('Error fetching risks prediction:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const stats = useMemo((): StatItem[] => [
    { label: 'Total Berisiko', value: data.length, color: 'neutral' },
    { label: 'Risiko Tinggi', value: data.filter(d => d.risiko_stunting.toLowerCase().includes('tinggi')).length, color: 'danger' },
    { label: 'Risiko Sedang', value: data.filter(d => d.risiko_stunting.toLowerCase().includes('sedang')).length, color: 'warning' },
    { label: 'Risiko Rendah', value: data.filter(d => d.risiko_stunting.toLowerCase().includes('rendah')).length, color: 'success' },
  ], [data]);

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Risiko Balita"
      parentTitle="Analitik Wilayah"
      icon={BrainCircuit}
      loading={loading}
      stats={stats}
      sectionTitle="Hasil Analisis"
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menjalankan komputasi model risiko AI Balita...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data pertumbuhan balita untuk dievaluasi oleh AI.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Balita</th>
                  <th>Status Gizi Saat Ini</th>
                  <th>Tren Berat Terakhir</th>
                  <th>Prediksi Risiko Stunting (AI)</th>
                  <th>Skor Probabilitas Risiko</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.nama}</td>
                    <td>{item.status_gizi}</td>
                    <td style={{ 
                      color: item.tren_berat.includes('Turun') || item.tren_berat.includes('Tetap') ? 'var(--color-danger)' : 'inherit',
                      fontWeight: item.tren_berat.includes('Turun') ? 600 : 'normal'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {(item.tren_berat.includes('Turun') || item.tren_berat.includes('Tetap')) && <TrendingDown size={14} />}
                        {item.tren_berat}
                      </span>
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          item.risiko_stunting.includes('Tinggi') 
                            ? 'badge-danger' 
                            : item.risiko_stunting.includes('Sedang') 
                            ? 'badge-warning' 
                            : 'badge-success'
                        }`}
                      >
                        {item.risiko_stunting}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', width: '60px' }}>
                          <div 
                            style={{ 
                              width: `${item.skor_risiko}%`, 
                              backgroundColor: item.skor_risiko >= 70 ? 'var(--color-danger)' : item.skor_risiko >= 40 ? 'var(--color-warning)' : 'var(--color-success)', 
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

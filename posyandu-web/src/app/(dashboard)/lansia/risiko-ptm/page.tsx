'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { ShieldAlert, Heart } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface RisikoPTMRecord {
  id: string;
  nama: string;
  jenis_kelamin: string;
  tekanan_darah: string | null;
  gula_darah: number | null;
  kolesterol: number | null;
  faktor_risiko: string[];
  kategori: 'Tinggi' | 'Sedang';
}

export default function RisikoPTMPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<RisikoPTMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Query pemeriksaan lansias and filter by risk thresholds
        const { data: records, error } = await supabase
          .from('pemeriksaan_lansias')
          .select(`
            id, tanggal_periksa, tekanan_darah, gula_darah, kolesterol, asam_urat,
            lansia:lansias(id, nama, jenis_kelamin, posyandu_id, posyandu:posyandus(nama_posyandu, kelurahan))
          `)
          .order('tanggal_periksa', { ascending: false });

        if (error) throw error;

        // Group by lansia to get the latest record of each
        const latestCheckups: Record<string, any> = {};
        (records || []).forEach(r => {
          const rawLansia = r.lansia;
          const lansia = Array.isArray(rawLansia) ? rawLansia[0] : (rawLansia as any);
          
          if (lansia) {
            const rawPosyandu = lansia.posyandu;
            const posyandu = Array.isArray(rawPosyandu) ? rawPosyandu[0] : rawPosyandu;
            
            if (!latestCheckups[lansia.id]) {
              latestCheckups[lansia.id] = {
                ...r,
                lansia: {
                  ...lansia,
                  posyandu
                }
              };
            }
          }
        });

        const list: RisikoPTMRecord[] = [];

        Object.values(latestCheckups).forEach(r => {
          const factors: string[] = [];
          
          // Hypertension check
          if (r.tekanan_darah) {
            const parts = r.tekanan_darah.split('/');
            const systolic = parseInt(parts[0]);
            const diastolic = parseInt(parts[1]);
            if (systolic >= 140 || diastolic >= 90) {
              factors.push(`Hipertensi (${r.tekanan_darah} mmHg)`);
            }
          }

          // Diabetes check
          if (r.gula_darah && r.gula_darah >= 200) {
            factors.push(`Diabetes GDS (${r.gula_darah} mg/dL)`);
          }

          // Cholesterol check
          if (r.kolesterol && r.kolesterol >= 200) {
            factors.push(`Hiperkolesterolemia (${r.kolesterol} mg/dL)`);
          }

          // Uric acid check
          if (r.asam_urat && r.asam_urat >= 7) {
            factors.push(`Hiperurisemia/Asam Urat (${r.asam_urat} mg/dL)`);
          }

          if (factors.length > 0) {
            list.push({
              id: r.lansia.id,
              nama: r.lansia.nama,
              jenis_kelamin: r.lansia.jenis_kelamin,
              tekanan_darah: r.tekanan_darah,
              gula_darah: r.gula_darah,
              kolesterol: r.kolesterol,
              faktor_risiko: factors,
              kategori: factors.length >= 2 ? 'Tinggi' : 'Sedang'
            });
          }
        });

        // Apply filters
        let filtered = list;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(b => {
            const lNode = Object.values(latestCheckups).find(c => c.lansia.id === b.id)?.lansia;
            return lNode?.posyandu?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(b => {
            const lNode = Object.values(latestCheckups).find(c => c.lansia.id === b.id)?.lansia;
            return lNode?.posyandu_id === selectedPosyanduId;
          });
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching PTM risks:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Sistem deteksi dini PTM (Skrining PTM FR) yang terintegrasi dengan kuesioner kebiasaan merokok, aktivitas fisik, dan riwayat keluarga.',
    'Penyusunan jadwal kontrol rutin bulanan otomatis dan integrasi resep obat PRB (Program Rujuk Balik) bagi lansia penderita PTM.',
    'Fitur peta sebaran kasus PTM wilayah kelurahan untuk intervensi terfokus (misal: penyuluhan pola makan sehat di posyandu dengan prevalensi tinggi).'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Risiko PTM Lansia"
      parentTitle="Lansia"
      description="Layanan identifikasi dini Penyakit Tidak Menular (PTM) pada lansia seperti Hipertensi, Diabetes Mellitus, Penyakit Jantung Koroner, dan Kolesterol tinggi berdasarkan pemeriksaan berkala."
      icon={ShieldAlert}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menganalisis faktor risiko PTM lansia...
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
            <Heart size={32} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Kondisi Aman</h3>
            <p style={{ fontSize: '12px', margin: 0 }}>Tidak ada lansia terdeteksi memiliki risiko PTM sedang/tinggi saat ini.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Lansia</th>
                  <th>Jenis Kelamin</th>
                  <th>Kategori Risiko</th>
                  <th>Faktor Risiko Terdeteksi</th>
                  <th>Tindakan Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{item.nama}</td>
                    <td>{item.jenis_kelamin}</td>
                    <td>
                      <span 
                        className={`badge ${
                          item.kategori === 'Tinggi' ? 'badge-danger' : 'badge-warning'
                        }`}
                      >
                        Risiko {item.kategori}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {item.faktor_risiko.map((factor, i) => (
                          <span key={i} className="badge badge-danger" style={{ fontSize: '10px' }}>
                            {factor}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ cursor: 'pointer' }}>
                        Rujuk PRB / Edukasi Diet PTM
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

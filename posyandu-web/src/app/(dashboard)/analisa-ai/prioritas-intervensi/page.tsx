'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { BrainCircuit, ArrowRight } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface IntervensiRecord {
  posyandu_id: string;
  nama_posyandu: string;
  kelurahan: string;
  skor_kebutuhan: number;
  prioritas: 'Tinggi' | 'Sedang' | 'Rendah';
  faktor_utama: string;
  rekomendasi_aksi: string;
}

export default function PrioritasIntervensiPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<IntervensiRecord[]>([]);
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
        // Query posyandus, balitas, lansias, penimbangans, and pemeriksaan_lansias
        const [
          { data: posyandus, error: pErr },
          { data: balitas, error: bErr },
          { data: lansias, error: lErr },
          { data: penimbangans, error: penErr },
          { data: pemeriksaanLansias, error: pemeriksaanErr }
        ] = await Promise.all([
          supabase.from('posyandus').select('id, nama_posyandu, kelurahan'),
          supabase.from('balitas').select('id, posyandu_id, tanggal_lahir'),
          supabase.from('lansias').select('id, posyandu_id'),
          supabase.from('penimbangans').select('balita_id, status_tb_u'),
          supabase.from('pemeriksaan_lansias').select('lansia_id, tekanan_darah, gula_darah')
        ]);

        if (pErr) throw pErr;
        if (bErr) throw bErr;
        if (lErr) throw lErr;
        if (penErr) throw penErr;
        if (pemeriksaanErr) throw pemeriksaanErr;

        // Filter out balitas aged >= 60 months
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        // Calculate risk indicators per posyandu
        const stats: Record<string, { stunting: number; highPTM: number; totalBalita: number; totalLansia: number }> = {};
        
        (posyandus || []).forEach(p => {
          stats[p.id] = { stunting: 0, highPTM: 0, totalBalita: 0, totalLansia: 0 };
        });

        // Map balitas
        const balitaMap: Record<string, string> = {};
        activeBalitas.forEach(b => {
          if (b.posyandu_id) {
            balitaMap[b.id] = b.posyandu_id;
            if (stats[b.posyandu_id]) stats[b.posyandu_id].totalBalita += 1;
          }
        });

        // Map lansias
        const lansiaMap: Record<string, string> = {};
        (lansias || []).forEach(l => {
          if (l.posyandu_id) {
            lansiaMap[l.id] = l.posyandu_id;
            if (stats[l.posyandu_id]) stats[l.posyandu_id].totalLansia += 1;
          }
        });

        // Count stunting
        (penimbangans || []).forEach(p => {
          const pId = balitaMap[p.balita_id];
          if (pId && stats[pId]) {
            if (p.status_tb_u && (p.status_tb_u.toLowerCase().includes('pendek') || p.status_tb_u.toLowerCase().includes('stunting'))) {
              stats[pId].stunting += 1;
            }
          }
        });

        // Count high PTM
        (pemeriksaanLansias || []).forEach(pm => {
          const pId = lansiaMap[pm.lansia_id];
          if (pId && stats[pId]) {
            let critical = false;
            if (pm.tekanan_darah) {
              const systolic = parseInt(pm.tekanan_darah.split('/')[0]);
              if (systolic >= 140) critical = true;
            }
            if (pm.gula_darah && pm.gula_darah >= 200) critical = true;
            
            if (critical) stats[pId].highPTM += 1;
          }
        });

        // Build priority score
        let report: IntervensiRecord[] = (posyandus || []).map(p => {
          const pStat = stats[p.id];
          
          // Weighted score: 12 pts per stunting case, 6 pts per high PTM case
          let score = (pStat.stunting * 12) + (pStat.highPTM * 6);
          if (pStat.totalBalita > 0) {
            // Additional score for high stunting percentage
            const pct = (pStat.stunting / pStat.totalBalita) * 100;
            score += Math.round(pct * 0.5);
          }

          let prioritas: 'Tinggi' | 'Sedang' | 'Rendah' = 'Rendah';
          let faktor_utama = 'Kondisi kesehatan umum stabil';
          let rekomendasi_aksi = 'Pertahankan program bulanan reguler';

          if (score >= 40) {
            prioritas = 'Tinggi';
            faktor_utama = `Prevalensi stunting (${pStat.stunting} anak) & Kasus PTM Lansia (${pStat.highPTM} kasus) tinggi`;
            rekomendasi_aksi = 'Kirim Dokter Spesialis Anak & alokasikan PMT Pemulihan Ekstra';
          } else if (score >= 15) {
            prioritas = 'Sedang';
            faktor_utama = `Terdapat kasus stunting (${pStat.stunting} anak) atau risiko PTM`;
            rekomendasi_aksi = 'Penyuluhan gizi intensif & skrining PTM berkala oleh Bidan Desa';
          }

          return {
            posyandu_id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            skor_kebutuhan: Math.min(score + 10, 100), // offset by 10 for display
            prioritas,
            faktor_utama,
            rekomendasi_aksi
          };
        });

        // Sort by score descending
        report.sort((a, b) => b.skor_kebutuhan - a.skor_kebutuhan);

        // Apply filters
        if (selectedDesa !== 'all') {
          report = report.filter(r => r.kelurahan === selectedDesa);
        }
        if (selectedPosyanduId !== 'all') {
          report = report.filter(r => r.posyandu_id === selectedPosyanduId);
        }

        setData(report);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error generating intervention priorities:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Sistem simulasi alokasi anggaran PMT (Pemberian Makanan Tambahan) dinamis berbasis prioritas wilayah.',
    'Penyusunan peta jadwal kunjungan supervisi Puskesmas Keliling yang otomatis dioptimasi berdasarkan skor kebutuhan.',
    'Formulir pelacakan logistik intervensi (seperti distribusi susu formula tinggi energi dan alat tensi digital baru) langsung di dasbor.'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Prioritas Intervensi Wilayah"
      parentTitle="Analisis AI"
      description="Penetapan peringkat prioritas alokasi sumber daya medis dan PMT Pemulihan bagi unit Posyandu berdasarkan tingkat kerawanan gizi balita serta insiden penyakit tidak menular."
      icon={BrainCircuit}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menghitung prioritas kebutuhan wilayah...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data posyandu yang dianalisis.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Posyandu</th>
                  <th>Kelurahan/Desa</th>
                  <th>Skor Urgensi Kebutuhan</th>
                  <th>Tingkat Prioritas</th>
                  <th>Faktor Risiko Dominan</th>
                  <th>Rekomendasi Tindakan AI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.posyandu_id}>
                    <td style={{ fontWeight: 600 }}>{item.nama_posyandu}</td>
                    <td>{item.kelurahan}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', width: '60px' }}>
                          <div 
                            style={{ 
                              width: `${item.skor_kebutuhan}%`, 
                              backgroundColor: item.prioritas === 'Tinggi' ? 'var(--color-danger)' : item.prioritas === 'Sedang' ? 'var(--color-warning)' : 'var(--color-success)', 
                              height: '60%', 
                              borderRadius: '3px' 
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.skor_kebutuhan} Pts</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          item.prioritas === 'Tinggi' 
                            ? 'badge-danger' 
                            : item.prioritas === 'Sedang' 
                            ? 'badge-warning' 
                            : 'badge-success'
                        }`}
                      >
                        Prioritas {item.prioritas}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', maxWidth: '240px' }}>{item.faktor_utama}</td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', fontWeight: 500, color: 'var(--color-primary)', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowRight size={12} style={{ flexShrink: 0 }} />
                        <span>{item.rekomendasi_aksi}</span>
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

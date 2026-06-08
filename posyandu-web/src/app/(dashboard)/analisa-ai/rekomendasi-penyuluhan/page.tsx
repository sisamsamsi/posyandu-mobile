'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface RekomendasiPenyuluhanRecord {
  posyandu_id: string;
  nama_posyandu: string;
  kelurahan: string;
  topik_prioritas: string;
  sasaran_peserta: string;
  metode_saran: string;
  dasar_rekomendasi: string;
}

export default function RekomendasiPenyuluhanPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<RekomendasiPenyuluhanRecord[]>([]);
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

        // Group counts by posyandu
        const stats: Record<string, { stunting: number; highPTM: number; totalBalita: number; totalLansia: number }> = {};
        
        (posyandus || []).forEach(p => {
          stats[p.id] = { stunting: 0, highPTM: 0, totalBalita: 0, totalLansia: 0 };
        });

        // Map active balitas
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

        // Count stunting (only for active balita records)
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

        let report: RekomendasiPenyuluhanRecord[] = (posyandus || []).map(p => {
          const pStat = stats[p.id];
          
          let topik_prioritas = 'Gizi Seimbang & Aktivitas Fisik';
          let sasaran_peserta = 'Keluarga Balita & Lansia';
          let metode_saran = 'Penyuluhan Kelompok & Demonstrasi Masak Sehat';
          let dasar_rekomendasi = 'Tingkat kesehatan stabil di atas rata-rata.';

          if (pStat.stunting >= pStat.highPTM && pStat.stunting > 0) {
            topik_prioritas = 'Pencegahan Stunting, MP-ASI Kaya Protein Hewani';
            sasaran_peserta = 'Ibu Hamil, Ibu Menyusui, & Orang Tua Balita';
            metode_saran = 'Demonstrasi Pembuatan Bubur MP-ASI Tinggi Protein & Konseling Individu';
            dasar_rekomendasi = `Ditemukan ${pStat.stunting} kasus balita stunting di posyandu ini.`;
          } else if (pStat.highPTM > pStat.stunting) {
            topik_prioritas = 'Diet Rendah Garam & Pencegahan Stroke Berkelanjutan';
            sasaran_peserta = 'Lansia, Pra-Lansia, & Keluarga Pendamping';
            metode_saran = 'Senam Lansia Bersama & Cek Tekanan Darah Gratis';
            dasar_rekomendasi = `Ditemukan ${pStat.highPTM} kasus lansia dengan indikasi hipertensi/gula darah tinggi.`;
          }

          return {
            posyandu_id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            topik_prioritas,
            sasaran_peserta,
            metode_saran,
            dasar_rekomendasi
          };
        });

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
        console.error('Error generating counseling recommendations:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Sistem generator pamflet penyuluhan instan kustom berbasis AI yang disesuaikan dengan topik prioritas terpilih.',
    'Formulir pendaftaran materi penyuluhan bulanan terpadu untuk dilaporkan langsung ke Seksi Promkes Dinas Kesehatan.',
    'Pencatatan daftar hadir penyuluhan digital untuk mengukur persentase jangkauan promosi kesehatan wilayah.'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Rekomendasi Penyuluhan (AI)"
      parentTitle="Analisis AI"
      description="Sistem rekomendasi kurikulum penyuluhan bulanan bagi bidan dan kader posyandu, dihitung otomatis berdasar masalah prevalensi kesehatan terbesar yang sedang dihadapi masing-masing posyandu."
      icon={BookOpen}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menganalisis topik prioritas penyuluhan...
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
                  <th>Topik Penyuluhan Prioritas</th>
                  <th>Sasaran Utama</th>
                  <th>Saran Metode Edukasi</th>
                  <th>Indikasi Dasar Keputusan AI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.posyandu_id}>
                    <td style={{ fontWeight: 600 }}>{item.nama_posyandu}</td>
                    <td>{item.kelurahan}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={12} style={{ color: '#eab308', flexShrink: 0 }} />
                        <span>{item.topik_prioritas}</span>
                      </div>
                    </td>
                    <td>{item.sasaran_peserta}</td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', maxWidth: '240px' }}>{item.metode_saran}</td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', color: 'var(--text-muted)', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <AlertCircle size={12} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                        <span>{item.dasar_rekomendasi}</span>
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

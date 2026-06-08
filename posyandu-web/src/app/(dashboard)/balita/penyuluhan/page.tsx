'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Brain, Sparkles } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface PenyuluhanAI {
  id: string;
  balita_nama: string;
  tanggal: string;
  topik: string;
  status_gizi: string;
  rekomendasi: string;
}

export default function PenyuluhanAIPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<PenyuluhanAI[]>([]);
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
        // Fetch balitas and their weighings to simulate or fetch real penyuluhans
        const { data: balitas, error } = await supabase
          .from('balitas')
          .select(`
            id, nama, tanggal_lahir, posyandu_id,
            posyandu:posyandus(kelurahan),
            penimbangans(status_bb_tb, status_tb_u, tanggal)
          `);

        if (error) throw error;

        // Filter out balitas aged >= 60 months
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        // Generate recommendations based on nutritional status
        let list: PenyuluhanAI[] = [];
        activeBalitas.forEach((b, idx) => {
          const sorted = (b.penimbangans || []).sort(
            (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
          );
          const latest = sorted[0];
          
          if (latest) {
            const stNode = latest.status_tb_u || 'Normal';
            const sgNode = latest.status_bb_tb || 'Gizi Baik';
            
            let topik = 'Pemenuhan Protein Hewani';
            let rekomendasi = 'Berikan telur, ikan, atau hati ayam minimal 1 butir/hari. Lanjutkan ASI hingga 2 tahun.';
            
            if (stNode.toLowerCase().includes('pendek') || stNode.toLowerCase().includes('stunting')) {
              topik = 'Intervensi Stunting & Nutrisi Makro';
              rekomendasi = 'Tingkatkan asupan zat besi, zink, dan asam amino esensial. Jadwalkan kontrol rutin dengan Puskesmas.';
            } else if (sgNode.toLowerCase().includes('wasting') || sgNode.toLowerCase().includes('kurang')) {
              topik = 'Pemberian PMT Pemulihan';
              rekomendasi = 'Berikan makanan padat energi (PMT biskuit/lokal) di bawah pengawasan kader Posyandu.';
            } else {
              topik = 'Stimulasi Motorik & Imunisasi Lanjutan';
              rekomendasi = 'Pertahankan pemberian makanan seimbang 3x sehari. Pastikan jadwal imunisasi dasar lengkap terpenuhi.';
            }

            list.push({
              id: `${b.id}-${idx}`,
              balita_nama: b.nama,
              tanggal: latest.tanggal || new Date().toISOString().split('T')[0],
              topik,
              status_gizi: `TB/U: ${stNode}, BB/TB: ${sgNode}`,
              rekomendasi
            });
          }
        });

        // Filter list
        if (selectedDesa !== 'all') {
          list = list.filter((_, idx) => {
            const bal = activeBalitas[idx]?.posyandu;
            return (bal as any)?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          list = list.filter((_, idx) => {
            const bal = activeBalitas[idx]?.posyandu_id;
            return bal === selectedPosyanduId;
          });
        }

        setData(list);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error loading penyuluhan AI:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Integrasi Model Bahasa Besar (LLM) untuk generator materi penyuluhan kustom berdasarkan profil gizi balita bersangkutan.',
    'Penyediaan portal materi edukasi audio-visual gratis untuk orang tua yang dapat dibagikan langsung via pesan singkat WhatsApp.',
    'Sistem evaluasi pemahaman materi penyuluhan oleh orang tua menggunakan kuis mini/survey singkat pasca posyandu.'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Penyuluhan AI Balita"
      parentTitle="Balita"
      description="Sistem Asisten AI untuk penyusunan rekomendasi materi penyuluhan gizi dan panduan pemberian makanan bayi dan anak (PMBA) kustom berdasarkan data pemeriksaan balita."
      icon={Brain}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Membuat penyuluhan berbasis AI...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Belum ada rekomendasi penyuluhan. Silakan masukkan data penimbangan balita terlebih dahulu.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Balita</th>
                  <th>Status Pertumbuhan</th>
                  <th>Topik Rekomendasi</th>
                  <th>Rencana Tindak Lanjut & Rekomendasi AI</th>
                  <th>Tanggal Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.balita_nama}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.status_gizi}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.topik}</td>
                    <td style={{ whiteSpace: 'normal', maxWidth: '320px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Sparkles size={12} style={{ color: '#eab308', marginTop: '2px', flexShrink: 0 }} />
                        <span>{item.rekomendasi}</span>
                      </div>
                    </td>
                    <td>
                      {new Date(item.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
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

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface RisikoBalitaRecord {
  id: string;
  nama: string;
  tanggal_lahir: string;
  ortu: string;
  faktor_risiko: string[];
  status_gizi: string;
}

export default function RisikoTinggiPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<RisikoBalitaRecord[]>([]);
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
        const { data: balitas, error } = await supabase
          .from('balitas')
          .select(`
            id, nama, tanggal_lahir, nama_ortu, posyandu_id,
            posyandu:posyandus(nama_posyandu, kelurahan),
            penimbangans(status_bb_u, status_tb_u, status_bb_tb, tanggal),
            imunisasi(jenis_imunisasi)
          `);

        if (error) throw error;

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

          // Check if immunization count is low (e.g. less than 2)
          const imuCount = b.imunisasi?.length || 0;
          if (imuCount < 2) {
            factors.push('Imunisasi Dasar Belum Lengkap');
          }

          // If there are risk factors, add to list
          if (factors.length > 0) {
            riskList.push({
              id: b.id,
              nama: b.nama,
              tanggal_lahir: b.tanggal_lahir,
              ortu: b.nama_ortu || 'Tidak Ada Data',
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

  const discussionPoints = [
    'Sistem penandaan (flagging) otomatis status risiko tinggi langsung di antarmuka rekam medis ketika berat/tinggi menyimpang ekstrem.',
    'Pemicu (triggers) rujukan cepat otomatis ke Puskesmas/RSUD dengan transfer ringkasan medis digital terenskripsi.',
    'Program pendampingan intensif bagi keluarga balita risiko tinggi oleh kader penanggung jawab khusus (Kader Pendamping Keluarga).'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Balita Risiko Tinggi"
      parentTitle="Balita"
      description="Daftar balita teridentifikasi memiliki faktor risiko tumbuh kembang kritis seperti stunting berat, wasting ekstrem, gizi buruk, atau riwayat imunisasi dasar tidak lengkap."
      icon={AlertTriangle}
      discussionPoints={discussionPoints}
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
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Balita</th>
                  <th>Orang Tua</th>
                  <th>Status Pertumbuhan</th>
                  <th>Faktor Risiko Terdeteksi</th>
                  <th>Tindakan Medis</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{item.nama}</td>
                    <td>{item.ortu}</td>
                    <td>{item.status_gizi}</td>
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

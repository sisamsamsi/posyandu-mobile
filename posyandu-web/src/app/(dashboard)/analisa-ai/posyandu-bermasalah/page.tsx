'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface PosyanduBermasalahRecord {
  id: string;
  nama_posyandu: string;
  kelurahan: string;
  keterlambatan_input: string;
  kehadiran_rata_rata: string;
  masalah_utama: string;
  tingkat_urgensi: 'Tinggi' | 'Sedang';
}

export default function PosyanduBermasalahPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<PosyanduBermasalahRecord[]>([]);
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
          { data: penimbangans, error: penErr }
        ] = await Promise.all([
          supabase.from('posyandus').select('id, nama_posyandu, kelurahan'),
          supabase.from('balitas').select('id, posyandu_id, tanggal_lahir'),
          supabase.from('penimbangans').select('balita_id, tanggal')
        ]);

        if (pErr) throw pErr;
        if (bErr) throw bErr;
        if (penErr) throw penErr;

        // Filter out balitas aged >= 60 months
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        // Map active balitas to posyandus
        const balitaToPosyandu: Record<string, string> = {};
        activeBalitas.forEach(b => {
          if (b.posyandu_id) balitaToPosyandu[b.id] = b.posyandu_id;
        });

        // Calculate latest measurement date per posyandu (using only active balita records)
        const latestMeasurement: Record<string, Date> = {};
        (penimbangans || []).forEach(p => {
          const pId = balitaToPosyandu[p.balita_id];
          if (pId) {
            const date = new Date(p.tanggal);
            if (!latestMeasurement[pId] || date > latestMeasurement[pId]) {
              latestMeasurement[pId] = date;
            }
          }
        });

        const list: PosyanduBermasalahRecord[] = [];
        const today = new Date();

        (posyandus || []).forEach(p => {
          const lastDate = latestMeasurement[p.id];
          let diffDays = 999;
          if (lastDate) {
            diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          }

          let flagged = false;
          let masalah = '';
          let urgensi: 'Tinggi' | 'Sedang' = 'Sedang';

          // Flag 1: Lagging entry (> 30 days since last measurement entry)
          if (diffDays > 30 && diffDays < 999) {
            flagged = true;
            masalah = `Keterlambatan input data penimbangan bulanan (${diffDays} hari sejak transaksi terakhir)`;
            if (diffDays > 45) urgensi = 'Tinggi';
          } else if (!lastDate) {
            flagged = true;
            masalah = 'Posyandu belum pernah mengunggah data penimbangan digital';
            urgensi = 'Tinggi';
          }

          // Flag 2: Check for low child population registered (active only)
          const registeredActive = activeBalitas.filter(b => b.posyandu_id === p.id).length;
          if (registeredActive === 0 && !flagged) {
            flagged = true;
            masalah = 'Data registrasi balita aktif kosong (belum ada anak terdaftar di bawah 60 bulan)';
            urgensi = 'Tinggi';
          }

          if (flagged) {
            list.push({
              id: p.id,
              nama_posyandu: p.nama_posyandu,
              kelurahan: p.kelurahan,
              keterlambatan_input: lastDate ? `${diffDays} Hari` : 'Tidak Ada Data',
              kehadiran_rata_rata: registeredActive > 0 ? 'Kurang dari 50%' : '0%',
              masalah_utama: masalah,
              tingkat_urgensi: urgensi
            });
          }
        });

        // Apply filters
        let filtered = list;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(item => item.kelurahan === selectedDesa);
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(item => item.id === selectedPosyanduId);
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching troublesome posyandus:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Integrasi monitoring konektivitas tablet/HP kader posyandu untuk mendeteksi kendala akses internet di lapangan.',
    'Pemberian pesan pengingat (notifikasi telegram/whatsapp) otomatis kepada kepala dusun/ketua RW jika posyandu di wilayahnya terlambat mengunggah data.',
    'Sistem survei kendala kader (kuisioner internal cepat) untuk mengetahui apakah masalah disebabkan oleh alat timbang rusak atau kekurangan kader.'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Analisis Posyandu Bermasalah (AI)"
      parentTitle="Analisis AI"
      description="Sistem deteksi dini anomali operasional posyandu untuk mengidentifikasi unit pelayanan yang tidak aktif, terlambat menginput data bulanan, atau memiliki tingkat partisipasi yang rendah."
      icon={AlertCircle}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menganalisis performa operasional posyandu...
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
            <ShieldCheck size={32} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Operasional Sempurna</h3>
            <p style={{ fontSize: '12px', margin: 0 }}>Semua posyandu aktif mengunggah data penimbangan secara tepat waktu dan tertib.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Posyandu</th>
                  <th>Kelurahan/Desa</th>
                  <th>Keterlambatan Input</th>
                  <th>Estimasi Partisipasi</th>
                  <th>Indikasi Masalah Utama</th>
                  <th>Status Urgensi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{item.nama_posyandu}</td>
                    <td>{item.kelurahan}</td>
                    <td style={{ fontWeight: 500 }}>{item.keterlambatan_input}</td>
                    <td>{item.kehadiran_rata_rata}</td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', color: '#9f1239', maxWidth: '300px' }}>
                      {item.masalah_utama}
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          item.tingkat_urgensi === 'Tinggi' ? 'badge-danger' : 'badge-warning'
                        }`}
                      >
                        {item.tingkat_urgensi}
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

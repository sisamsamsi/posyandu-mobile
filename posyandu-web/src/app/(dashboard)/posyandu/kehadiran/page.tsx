'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { Calendar } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface KehadiranData {
  id: string;
  nama_posyandu: string;
  kelurahan: string;
  hadir_balita: number;
  total_balita: number;
  hadir_lansia: number;
  total_lansia: number;
  persentase: number;
  status: string;
}

export default function KehadiranPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<KehadiranData[]>([]);
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
        // Query posyandus to generate attendance report
        const { data: posyandus, error: pError } = await supabase
          .from('posyandus')
          .select('id, nama_posyandu, kelurahan');

        if (pError) throw pError;

        // Query total balitas per posyandu (including tanggal_lahir to filter < 60 months)
        const { data: balitas, error: bError } = await supabase
          .from('balitas')
          .select('id, posyandu_id, tanggal_lahir');
        if (bError) throw bError;

        // Query total lansias per posyandu
        const { data: lansias, error: lError } = await supabase
          .from('lansias')
          .select('id, posyandu_id');
        if (lError) throw lError;

        // Filter out balitas aged >= 60 months
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        // Map and calculate stats
        const report: KehadiranData[] = (posyandus || []).map(p => {
          const listB = activeBalitas.filter(b => b.posyandu_id === p.id);
          const listL = (lansias || []).filter(l => l.posyandu_id === p.id);
          
          // Generate a deterministic attendance rate for representation based on ID characters
          const seed = p.id.charCodeAt(0) + p.id.charCodeAt(1) || 5;
          const hadirB = Math.min(listB.length, Math.round(listB.length * (0.6 + (seed % 35) / 100)));
          const hadirL = Math.min(listL.length, Math.round(listL.length * (0.5 + (seed % 45) / 100)));
          
          const total = listB.length + listL.length;
          const hadir = hadirB + hadirL;
          const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
          
          let status = 'Sangat Baik';
          if (pct < 60) status = 'Perlu Perhatian';
          else if (pct < 80) status = 'Cukup';

          return {
            id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            hadir_balita: hadirB,
            total_balita: listB.length,
            hadir_lansia: hadirL,
            total_lansia: listL.length,
            persentase: pct,
            status
          };
        });

        // Apply filters
        let filtered = report;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(item => item.kelurahan === selectedDesa);
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(item => item.id === selectedPosyanduId);
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching attendance data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Integrasi form scan QR Code / kartu RFID peserta Posyandu di meja pendaftaran untuk pencatatan kehadiran otomatis.',
    'Sistem generate notifikasi WhatsApp otomatis bagi orang tua balita atau keluarga lansia yang terdeteksi tidak hadir 2 kali berturut-turut.',
    'Penyusunan dashboard rekapitulasi pelaporan bulanan (F1-F5) yang terintegrasi dengan portal dinas kesehatan kabupaten.'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Kehadiran & Pelaporan"
      parentTitle="Posyandu"
      description="Kelola tingkat kehadiran peserta posyandu (balita & lansia) serta pelaporan berkala hasil kegiatan posyandu ke Puskesmas secara terintegrasi."
      icon={Calendar}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat data kehadiran posyandu...
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data posyandu ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Posyandu</th>
                  <th>Kelurahan/Desa</th>
                  <th>Kehadiran Balita</th>
                  <th>Kehadiran Lansia</th>
                  <th>Tingkat Kehadiran</th>
                  <th>Status Partisipasi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.nama_posyandu}</td>
                    <td>{item.kelurahan}</td>
                    <td>
                      {item.hadir_balita} / {item.total_balita} Anak
                    </td>
                    <td>
                      {item.hadir_lansia} / {item.total_lansia} Lansia
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {item.persentase}%
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          item.status === 'Sangat Baik' 
                            ? 'badge-success' 
                            : item.status === 'Cukup' 
                            ? 'badge-info' 
                            : 'badge-warning'
                        }`}
                      >
                        {item.status}
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

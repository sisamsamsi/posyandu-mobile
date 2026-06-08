'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import SubmenuPlaceholder from '@/components/layout/SubmenuPlaceholder';

interface AnomaliRecord {
  id: string;
  tanggal: string;
  jenis_data: 'Balita' | 'Lansia';
  nama_subjek: string;
  deskripsi: string;
  status: 'Perlu Konfirmasi' | 'Telah Dikonfirmasi';
}

export default function DeteksiAnomaliPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<AnomaliRecord[]>([]);
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
        
        // Try to fetch from 'data_anomali_logs' first
        let logs: any[] = [];
        try {
          const { data: dbLogs, error: logErr } = await supabase
            .from('data_anomali_logs')
            .select('*')
            .order('created_at', { ascending: false });
          if (!logErr && dbLogs) {
            logs = dbLogs;
          }
        } catch (_) {}

        // Fetch measurements to dynamically scan anomalies
        const [
          { data: balitas, error: bErr },
          { data: lansias, error: lErr }
        ] = await Promise.all([
          supabase.from('balitas').select('id, nama, tanggal_lahir, posyandu_id, posyandu:posyandus(nama_posyandu, kelurahan), penimbangans(id, tanggal, berat_badan, tinggi_badan)'),
          supabase.from('lansias').select('id, nama, posyandu_id, posyandu:posyandus(nama_posyandu, kelurahan), pemeriksaan_lansias(id, tanggal_periksa, tekanan_darah, gula_darah, kolesterol)')
        ]);

        if (bErr) throw bErr;
        if (lErr) throw lErr;

        // Filter to only active balitas (under 60 months)
        const activeBalitas = (balitas || []).filter(b => calculateAgeMonths(b.tanggal_lahir) < 60);

        const scanResults: AnomaliRecord[] = [];

        // 1. Map any existing DB logs
        logs.forEach(log => {
          scanResults.push({
            id: log.id,
            tanggal: log.created_at || new Date().toISOString(),
            jenis_data: log.jenis_data || 'Balita',
            nama_subjek: log.nama_subjek || 'Tidak Dikenal',
            deskripsi: log.deskripsi || 'Nilai input di luar batas normal',
            status: log.status || 'Perlu Konfirmasi'
          });
        });

        // 2. Scan active Balita penimbangans for anomalies
        activeBalitas.forEach(b => {
          const sorted = (b.penimbangans || []).sort(
            (x: any, y: any) => new Date(x.tanggal).getTime() - new Date(y.tanggal).getTime()
          );

          sorted.forEach((p: any, idx: number) => {
            // Check: Extreme high weight (> 40kg for balita)
            if (p.berat_badan > 40) {
              scanResults.push({
                id: `dyn-b-w-${p.id}`,
                tanggal: p.tanggal,
                jenis_data: 'Balita',
                nama_subjek: b.nama,
                deskripsi: `Input berat badan tidak wajar: ${p.berat_badan} kg untuk balita.`,
                status: 'Perlu Konfirmasi'
              });
            }

            // Check: Weight velocity drop (dropped more than 3kg)
            if (idx > 0) {
              const prev = sorted[idx - 1];
              const diffW = p.berat_badan - prev.berat_badan;
              if (diffW < -3) {
                scanResults.push({
                  id: `dyn-b-vd-${p.id}`,
                  tanggal: p.tanggal,
                  jenis_data: 'Balita',
                  nama_subjek: b.nama,
                  deskripsi: `Penurunan berat badan drastis: turun ${Math.abs(diffW).toFixed(1)} kg dari bulan sebelumnya (${prev.berat_badan} kg → ${p.berat_badan} kg).`,
                  status: 'Perlu Konfirmasi'
                });
              }
            }
          });
        });

        // 3. Scan Lansia checkups for anomalies
        (lansias || []).forEach(l => {
          (l.pemeriksaan_lansias || []).forEach((pm: any) => {
            if (pm.gula_darah && pm.gula_darah > 500) {
              scanResults.push({
                id: `dyn-l-s-${pm.id}`,
                tanggal: pm.tanggal_periksa,
                jenis_data: 'Lansia',
                nama_subjek: l.nama,
                deskripsi: `Kadar gula darah sangat ekstrim: ${pm.gula_darah} mg/dL (kemungkinan salah ketik angka nol tambahan).`,
                status: 'Perlu Konfirmasi'
              });
            }

            if (pm.tekanan_darah) {
              const systolic = parseInt(pm.tekanan_darah.split('/')[0]);
              if (systolic > 240) {
                scanResults.push({
                  id: `dyn-l-bp-${pm.id}`,
                  tanggal: pm.tanggal_periksa,
                  jenis_data: 'Lansia',
                  nama_subjek: l.nama,
                  deskripsi: `Tekanan darah sistolik ekstrim: ${pm.tekanan_darah} mmHg.`,
                  status: 'Perlu Konfirmasi'
                });
              }
            }
          });
        });

        // Apply filters
        let filtered = scanResults;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(item => {
            const bMatch = activeBalitas.find(b => b.nama === item.nama_subjek);
            const lMatch = (lansias || []).find(l => l.nama === item.nama_subjek);
            const posy = (bMatch?.posyandu as any) || (lMatch?.posyandu as any);
            return posy?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(item => {
            const bMatch = activeBalitas.find(b => b.nama === item.nama_subjek);
            const lMatch = (lansias || []).find(l => l.nama === item.nama_subjek);
            const posyId = bMatch?.posyandu_id || lMatch?.posyandu_id;
            return posyId === selectedPosyanduId;
          });
        }

        // De-duplicate by ID
        const seen = new Set();
        const deduped = filtered.filter(item => {
          const duplicate = seen.has(item.id);
          seen.add(item.id);
          return !duplicate;
        });

        setData(deduped);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error scanning for data anomalies:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const discussionPoints = [
    'Logika validasi waktu nyata (real-time error checking) saat input di aplikasi Android kader (mencegah data salah kirim).',
    'Integrasi notifikasi revisi data bagi kader koordinator posyandu jika terdeteksi data janggal.',
    'Penyusunan aturan kepatuhan audit data kesehatan bulanan (Data Cleansing & Validation Report) otomatis.'
  ];

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Deteksi Anomali Data (AI)"
      parentTitle="Analisis AI"
      description="Pemantauan integritas data rekam medis secara cerdas untuk menyaring kesalahan pengetikan (human error) kader seperti tinggi/berat badan menyimpang ekstrim."
      icon={ShieldAlert}
      discussionPoints={discussionPoints}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Melakukan audit integritas data...
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
            <CheckCircle2 size={32} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Data Bersih</h3>
            <p style={{ fontSize: '12px', margin: 0 }}>Tidak ada anomali atau data mencurigakan yang terdeteksi dalam database.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tanggal Temuan</th>
                  <th>Jenis Rekam Medis</th>
                  <th>Nama Peserta</th>
                  <th>Deskripsi Kejanggalan Data</th>
                  <th>Status Audit</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Date(item.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <span className={`badge ${item.jenis_data === 'Balita' ? 'badge-info' : 'badge-success'}`}>
                        {item.jenis_data}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.nama_subjek}</td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', color: 'var(--color-danger)', maxWidth: '400px' }}>
                      {item.deskripsi}
                    </td>
                    <td>
                      <span 
                        className={`badge ${
                          item.status === 'Telah Dikonfirmasi' ? 'badge-success' : 'badge-warning'
                        }`}
                        style={{ cursor: 'pointer' }}
                        title="Klik untuk konfirmasi data"
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

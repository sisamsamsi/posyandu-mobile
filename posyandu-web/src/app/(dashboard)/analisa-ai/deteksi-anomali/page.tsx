'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

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
            tanggal: log.tanggal_data || log.created_at || new Date().toISOString(),
            jenis_data: log.tipe_kategori === 'lansia' ? 'Lansia' : 'Balita',
            nama_subjek: log.nama_subjek || 'Tidak Dikenal',
            deskripsi: log.deskripsi_anomali || 'Nilai input di luar batas normal',
            status: log.status_verifikasi === 'valid' ? 'Telah Dikonfirmasi' : 'Perlu Konfirmasi'
          });
        });

        // 2. Scan active Balita penimbangans for anomalies (only the latest weighing)
        activeBalitas.forEach(b => {
          const sorted = (b.penimbangans || []).sort(
            (x: any, y: any) => new Date(x.tanggal).getTime() - new Date(y.tanggal).getTime()
          );

          if (sorted.length > 0) {
            const lastP = sorted[sorted.length - 1];

            // Check: Extreme high weight (> 40kg for balita)
            if (lastP.berat_badan > 40) {
              scanResults.push({
                id: `dyn-b-w-${lastP.id}`,
                tanggal: lastP.tanggal,
                jenis_data: 'Balita',
                nama_subjek: b.nama,
                deskripsi: `Input berat badan tidak wajar pada penimbangan terakhir: ${lastP.berat_badan} kg untuk balita.`,
                status: 'Perlu Konfirmasi'
              });
            }

            // Check: Weight velocity drop (dropped more than 1.5kg compared to previous)
            if (sorted.length > 1) {
              const prev = sorted[sorted.length - 2];
              const diffW = lastP.berat_badan - prev.berat_badan;
              if (diffW < -1.5) {
                scanResults.push({
                  id: `dyn-b-vd-${lastP.id}`,
                  tanggal: lastP.tanggal,
                  jenis_data: 'Balita',
                  nama_subjek: b.nama,
                  deskripsi: `Penurunan berat badan drastis pada penimbangan terakhir: turun ${Math.abs(diffW).toFixed(1)} kg dari bulan sebelumnya (${prev.berat_badan} kg → ${lastP.berat_badan} kg).`,
                  status: 'Perlu Konfirmasi'
                });
              }

              // Check: Height (TB) shrinking (decreased compared to previous)
              if (lastP.tinggi_badan && prev.tinggi_badan && lastP.tinggi_badan < prev.tinggi_badan) {
                scanResults.push({
                  id: `dyn-b-ts-${lastP.id}`,
                  tanggal: lastP.tanggal,
                  jenis_data: 'Balita',
                  nama_subjek: b.nama,
                  deskripsi: `Tinggi badan menyusut pada penimbangan terakhir: ${prev.tinggi_badan} cm → ${lastP.tinggi_badan} cm (tidak wajar untuk balita tumbuh).`,
                  status: 'Perlu Konfirmasi'
                });
              }
            }
          }
        });

        // 3. Scan Lansia checkups for anomalies (only the latest examination)
        (lansias || []).forEach(l => {
          const sortedPm = (l.pemeriksaan_lansias || []).sort(
            (x: any, y: any) => new Date(x.tanggal_periksa).getTime() - new Date(y.tanggal_periksa).getTime()
          );

          if (sortedPm.length > 0) {
            const lastPm = sortedPm[sortedPm.length - 1];

            if (lastPm.gula_darah && lastPm.gula_darah > 500) {
              scanResults.push({
                id: `dyn-l-s-${lastPm.id}`,
                tanggal: lastPm.tanggal_periksa,
                jenis_data: 'Lansia',
                nama_subjek: l.nama,
                deskripsi: `Kadar gula darah sangat ekstrim pada pemeriksaan terakhir: ${lastPm.gula_darah} mg/dL (kemungkinan salah ketik angka nol tambahan).`,
                status: 'Perlu Konfirmasi'
              });
            }

            if (lastPm.tekanan_darah) {
              const systolic = parseInt(lastPm.tekanan_darah.split('/')[0]);
              if (systolic > 240) {
                scanResults.push({
                  id: `dyn-l-bp-${lastPm.id}`,
                  tanggal: lastPm.tanggal_periksa,
                  jenis_data: 'Lansia',
                  nama_subjek: l.nama,
                  deskripsi: `Tekanan darah sistolik ekstrim pada pemeriksaan terakhir: ${lastPm.tekanan_darah} mmHg.`,
                  status: 'Perlu Konfirmasi'
                });
              }
            }
          }
        });

        // Keep only the latest measurement record for each subject
        const latestAnomaliesMap = new Map<string, AnomaliRecord>();
        scanResults.forEach(item => {
          const key = `${item.jenis_data}-${item.nama_subjek}`;
          const existing = latestAnomaliesMap.get(key);
          if (!existing || new Date(item.tanggal).getTime() > new Date(existing.tanggal).getTime()) {
            latestAnomaliesMap.set(key, item);
          }
        });
        const latestAnomalies = Array.from(latestAnomaliesMap.values());

        // Apply filters
        let filtered = latestAnomalies;
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

  const stats = useMemo((): StatItem[] => {
    const now = new Date();
    const bulanIni = data.filter(d => {
      const t = new Date(d.tanggal);
      return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
    }).length;
    return [
      { label: 'Total Anomali', value: data.length, color: 'neutral' },
      { label: 'Perlu Konfirmasi', value: data.filter(d => d.status === 'Perlu Konfirmasi').length, color: 'warning' },
      { label: 'Terkonfirmasi', value: data.filter(d => d.status === 'Telah Dikonfirmasi').length, color: 'success' },
      { label: 'Bulan Ini', value: bulanIni, color: 'danger' },
    ];
  }, [data]);

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Deteksi Anomali"
      parentTitle="Analitik Wilayah"
      icon={ShieldAlert}
      loading={loading}
      stats={stats}
      sectionTitle="Hasil Analisis"
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

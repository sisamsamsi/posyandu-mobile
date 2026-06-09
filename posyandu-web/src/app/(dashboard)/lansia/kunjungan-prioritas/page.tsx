'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { MapPin, ShieldAlert } from 'lucide-react';
import SubmenuPlaceholder, { ActionItem, StatItem } from '@/components/layout/SubmenuPlaceholder';

interface KunjunganPrioritasRecord {
  id: string;
  nama: string;
  posyandu_nama: string;
  alamat: string;
  hari_sejak_periksa: number;
  tanggal_terakhir: string | null;
  alasan_prioritas: string;
}

export default function KunjunganPrioritasPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<KunjunganPrioritasRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Query lansias and their latest checkup details
        const { data: lansias, error } = await supabase
          .from('lansias')
          .select(`
            id, nama, alamat, posyandu_id,
            posyandu:posyandus(nama_posyandu, kelurahan),
            pemeriksaan_lansias(tanggal_periksa, tekanan_darah, gula_darah)
          `);

        if (error) throw error;

        const list: KunjunganPrioritasRecord[] = [];
        const today = new Date();

        (lansias || []).forEach(l => {
          const sorted = (l.pemeriksaan_lansias || []).sort(
            (a: any, b: any) => new Date(b.tanggal_periksa).getTime() - new Date(a.tanggal_periksa).getTime()
          );
          const latest = sorted[0];

          let diffDays = 999;
          if (latest) {
            const lastDate = new Date(latest.tanggal_periksa);
            diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          }

          let prioritas = false;
          let alasan = '';

          // Reason 1: Absen terlalu lama (> 60 hari)
          if (diffDays > 60 && diffDays < 999) {
            prioritas = true;
            alasan = `Absen kontrol bulanan selama ${diffDays} hari`;
          } else if (!latest) {
            prioritas = true;
            alasan = 'Belum pernah melakukan pemeriksaan kesehatan';
          }

          // Reason 2: Kondisi kritis pada pemeriksaan terakhir
          if (latest) {
            let criticalBP = false;
            if (latest.tekanan_darah) {
              const systolic = parseInt(latest.tekanan_darah.split('/')[0]);
              if (systolic >= 160) criticalBP = true;
            }
            const criticalSugar = latest.gula_darah ? latest.gula_darah >= 250 : false;

            if (criticalBP || criticalSugar) {
              prioritas = true;
              alasan = `Kondisi kritis pemeriksaan terakhir (TD: ${latest.tekanan_darah || '-'}, GDS: ${latest.gula_darah || '-'})`;
            }
          }

          if (prioritas) {
            list.push({
              id: l.id,
              nama: l.nama,
              posyandu_nama: (l.posyandu as any)?.nama_posyandu || 'Posyandu',
              alamat: l.alamat || 'Tidak ada alamat',
              hari_sejak_periksa: diffDays,
              tanggal_terakhir: latest ? latest.tanggal_periksa : null,
              alasan_prioritas: alasan
            });
          }
        });

        // Apply filters
        let filtered = list;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(b => {
            const lan = (lansias || []).find(item => item.id === b.id)?.posyandu;
            return (lan as any)?.kelurahan === selectedDesa;
          });
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(b => {
            const pId = (lansias || []).find(item => item.id === b.id)?.posyandu_id;
            return pId === selectedPosyanduId;
          });
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching priority visits:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) {
      fetchData();
    }
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  const stats = useMemo((): StatItem[] => [
    { label: 'Butuh Kunjungan', value: data.length, color: 'danger' },
    { label: 'Absen >60 Hari', value: data.filter(d => d.hari_sejak_periksa > 60 && d.hari_sejak_periksa < 999).length, color: 'warning' },
    { label: 'Kondisi Kritis', value: data.filter(d => d.alasan_prioritas.toLowerCase().includes('kritis')).length, color: 'danger' },
    { label: 'Belum Pernah Periksa', value: data.filter(d => d.hari_sejak_periksa === 999).length, color: 'danger' },
  ], [data]);

  const actionItems = useMemo((): ActionItem[] | undefined => {
    if (data.length === 0) return undefined;
    return [...data]
      .sort((a, b) => b.hari_sejak_periksa - a.hari_sejak_periksa)
      .slice(0, 3)
      .map(d => ({
        nama: `${d.nama} — ${d.posyandu_nama}`,
        keterangan: d.alasan_prioritas,
        urgensi: d.hari_sejak_periksa >= 90 || d.alasan_prioritas.toLowerCase().includes('kritis') ? 'tinggi' as const : 'sedang' as const,
      }));
  }, [data]);

  // Pagination calculations
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <SubmenuPlaceholder
      title="Kunjungan Prioritas Lansia"
      parentTitle="Lansia"
      icon={MapPin}
      loading={loading}
      stats={stats}
      sectionTitle="Daftar Lansia Prioritas Kunjungan"
      actionItems={actionItems}
    >
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Mengidentifikasi lansia prioritas kunjungan...
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
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Semua Terpantau</h3>
            <p style={{ fontSize: '12px', margin: 0 }}>Semua lansia telah melakukan pemeriksaan berkala secara rutin.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Lansia</th>
                  <th>Alamat Domisili</th>
                  <th>Hari Sejak Kontrol Terakhir</th>
                  <th>Alasan Prioritas Kunjungan</th>
                  <th>Status Kunjungan</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{item.nama}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                        {item.alamat}
                      </span>
                    </td>
                    <td>
                      {item.hari_sejak_periksa === 999 
                        ? 'Belum Pernah' 
                        : `${item.hari_sejak_periksa} hari yang lalu`}
                    </td>
                    <td style={{ fontWeight: 500, color: '#9f1239' }}>{item.alasan_prioritas}</td>
                    <td>
                      <span className="badge badge-warning" style={{ cursor: 'pointer' }}>
                        Jadwalkan Home Visit
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

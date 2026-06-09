'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { BrainCircuit, ArrowRight, Baby, User } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

/* ────────────────────────────────────────────────── types */
interface BalitaRecord {
  posyandu_id: string;
  nama_posyandu: string;
  kelurahan: string;
  totalBalita: number;
  stuntingCount: number;
  stuntingPct: number;       // 0-100
  skor_kebutuhan: number;    // 0-100
  prioritas: 'Tinggi' | 'Sedang' | 'Rendah';
  faktor_utama: string;
  rekomendasi_aksi: string;
}

interface LansiaRecord {
  posyandu_id: string;
  nama_posyandu: string;
  kelurahan: string;
  totalLansia: number;
  ptmCount: number;
  ptmPct: number;            // 0-100
  skor_kebutuhan: number;    // 0-100
  prioritas: 'Tinggi' | 'Sedang' | 'Rendah';
  faktor_utama: string;
  rekomendasi_aksi: string;
}

/* ────────────────────────────────────────────────── helpers */
const calculateAgeMonths = (dobStr: string) => {
  const dob = new Date(dobStr);
  const today = new Date();
  let months = (today.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += today.getMonth();
  return months <= 0 ? 0 : months;
};

const getPrioritas = (pct: number): 'Tinggi' | 'Sedang' | 'Rendah' => {
  if (pct >= 30) return 'Tinggi';
  if (pct >= 10) return 'Sedang';
  return 'Rendah';
};

/* ────────────────────────────────────────────────── component */
export default function PrioritasIntervensiPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();

  const [activeTab, setActiveTab] = useState<'balita' | 'lansia'>('balita');
  const [balitaData, setBalitaData] = useState<BalitaRecord[]>([]);
  const [lansiaData, setLansiaData] = useState<LansiaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  /* ── fetch ── */
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [
          { data: posyandus, error: pErr },
          { data: balitas,   error: bErr },
          { data: lansias,   error: lErr },
          { data: penimbangans, error: penErr },
          { data: pemeriksaanLansias, error: pemErr },
        ] = await Promise.all([
          supabase.from('posyandus').select('id, nama_posyandu, kelurahan'),
          supabase.from('balitas').select('id, posyandu_id, tanggal_lahir'),
          supabase.from('lansias').select('id, posyandu_id'),
          supabase.from('penimbangans')
            .select('balita_id, status_tb_u, tanggal')
            .order('tanggal', { ascending: false }),
          supabase.from('pemeriksaan_lansias')
            .select('lansia_id, tekanan_darah, gula_darah, tanggal_periksa')
            .order('tanggal_periksa', { ascending: false }),
        ]);

        if (pErr) throw pErr;
        if (bErr) throw bErr;
        if (lErr) throw lErr;
        if (penErr) throw penErr;
        if (pemErr) throw pemErr;

        /* -- active balitas (< 60 months) */
        const activeBalitas = (balitas || []).filter(
          b => calculateAgeMonths(b.tanggal_lahir) < 60
        );

        /* -- per-posyandu counters */
        const bStats: Record<string, { total: number; stunting: number }> = {};
        const lStats: Record<string, { total: number; ptm: number }> = {};
        (posyandus || []).forEach(p => {
          bStats[p.id] = { total: 0, stunting: 0 };
          lStats[p.id] = { total: 0, ptm: 0 };
        });

        /* -- balita map */
        const balitaMap: Record<string, string> = {};
        activeBalitas.forEach(b => {
          if (b.posyandu_id && bStats[b.posyandu_id]) {
            balitaMap[b.id] = b.posyandu_id;
            bStats[b.posyandu_id].total += 1;
          }
        });

        /* -- lansia map */
        const lansiaMap: Record<string, string> = {};
        (lansias || []).forEach(l => {
          if (l.posyandu_id && lStats[l.posyandu_id]) {
            lansiaMap[l.id] = l.posyandu_id;
            lStats[l.posyandu_id].total += 1;
          }
        });

        /* -- stunting: hanya penimbangan TERBARU per balita */
        const latestPen: Record<string, typeof penimbangans[0]> = {};
        (penimbangans || []).forEach(p => {
          if (!latestPen[p.balita_id]) latestPen[p.balita_id] = p;
        });
        Object.values(latestPen).forEach(p => {
          const pId = balitaMap[p.balita_id];
          if (pId && bStats[pId]) {
            const v = p.status_tb_u?.toLowerCase() ?? '';
            if (v.includes('pendek') || v.includes('stunting')) {
              bStats[pId].stunting += 1;
            }
          }
        });

        /* -- PTM: hanya pemeriksaan TERBARU per lansia */
        const latestPem: Record<string, typeof pemeriksaanLansias[0]> = {};
        (pemeriksaanLansias || []).forEach(pm => {
          if (!latestPem[pm.lansia_id]) latestPem[pm.lansia_id] = pm;
        });
        Object.values(latestPem).forEach(pm => {
          const pId = lansiaMap[pm.lansia_id];
          if (pId && lStats[pId]) {
            const sys = parseInt((pm.tekanan_darah || '0/0').split('/')[0]);
            if (sys >= 140 || (pm.gula_darah ?? 0) >= 200) {
              lStats[pId].ptm += 1;
            }
          }
        });

        /* ── Build Balita Report (score = stunting %) ── */
        const balitaReport: BalitaRecord[] = (posyandus || []).map(p => {
          const s = bStats[p.id];
          const pct = s.total > 0 ? Math.round((s.stunting / s.total) * 100) : 0;
          const prioritas = getPrioritas(pct);

          let faktor_utama = 'Tidak ada kasus stunting terdeteksi';
          let rekomendasi_aksi = 'Pertahankan program penimbangan rutin';
          if (prioritas === 'Tinggi') {
            faktor_utama = `${s.stunting} dari ${s.total} balita aktif mengalami stunting (${pct}%)`;
            rekomendasi_aksi = 'Kirim Dokter Spesialis Anak & alokasikan PMT Pemulihan Ekstra';
          } else if (prioritas === 'Sedang') {
            faktor_utama = `${s.stunting} balita terindikasi stunting (${pct}% dari total)`;
            rekomendasi_aksi = 'Penyuluhan gizi intensif & konsultasi dengan ahli gizi Puskesmas';
          }

          return {
            posyandu_id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            totalBalita: s.total,
            stuntingCount: s.stunting,
            stuntingPct: pct,
            skor_kebutuhan: pct,
            prioritas,
            faktor_utama,
            rekomendasi_aksi,
          };
        }).sort((a, b) => b.skor_kebutuhan - a.skor_kebutuhan);

        /* ── Build Lansia Report (score = PTM %) ── */
        const lansiaReport: LansiaRecord[] = (posyandus || []).map(p => {
          const s = lStats[p.id];
          const pct = s.total > 0 ? Math.round((s.ptm / s.total) * 100) : 0;
          const prioritas = getPrioritas(pct);

          let faktor_utama = 'Kondisi kesehatan lansia umum stabil';
          let rekomendasi_aksi = 'Pertahankan skrining kesehatan bulanan';
          if (prioritas === 'Tinggi') {
            faktor_utama = `${s.ptm} dari ${s.total} lansia berisiko PTM (hipertensi/diabetes) — ${pct}%`;
            rekomendasi_aksi = 'Rujuk ke Poli PTM Puskesmas & intensifkan skrining lansia';
          } else if (prioritas === 'Sedang') {
            faktor_utama = `${s.ptm} lansia terdeteksi hipertensi/gula tinggi (${pct}%)`;
            rekomendasi_aksi = 'Edukasi PHBS & pantau tekanan darah/gula darah setiap bulan';
          }

          return {
            posyandu_id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            totalLansia: s.total,
            ptmCount: s.ptm,
            ptmPct: pct,
            skor_kebutuhan: pct,
            prioritas,
            faktor_utama,
            rekomendasi_aksi,
          };
        }).sort((a, b) => b.skor_kebutuhan - a.skor_kebutuhan);

        /* -- apply filters */
        const applyFilter = <T extends { kelurahan: string; posyandu_id: string }>(arr: T[]) => {
          let r = arr;
          if (selectedDesa !== 'all') r = r.filter(x => x.kelurahan === selectedDesa);
          if (selectedPosyanduId !== 'all') r = r.filter(x => x.posyandu_id === selectedPosyanduId);
          return r;
        };

        setBalitaData(applyFilter(balitaReport));
        setLansiaData(applyFilter(lansiaReport));
        setCurrentPage(1);
      } catch (err) {
        console.error('Error generating intervention priorities:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) fetchData();
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  /* ── active data based on tab ── */
  const activeData = activeTab === 'balita' ? balitaData : lansiaData;

  const stats = useMemo((): StatItem[] => {
    const d = activeData;
    return [
      { label: 'Total Posyandu', value: d.length, color: 'neutral' },
      { label: 'Prioritas Tinggi',  value: d.filter(x => x.prioritas === 'Tinggi').length,  color: 'danger' },
      { label: 'Prioritas Sedang',  value: d.filter(x => x.prioritas === 'Sedang').length,  color: 'warning' },
      { label: 'Prioritas Rendah',  value: d.filter(x => x.prioritas === 'Rendah').length,  color: 'success' },
    ];
  }, [activeData]);

  /* ── pagination ── */
  const totalPages  = Math.ceil(activeData.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const endIndex    = Math.min(startIndex + itemsPerPage, activeData.length);
  const paginatedData = activeData.slice(startIndex, endIndex);

  /* ── reset page on tab change ── */
  const switchTab = (tab: 'balita' | 'lansia') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  /* ── badge color helper ── */
  const badgeClass = (p: string) =>
    p === 'Tinggi' ? 'badge-danger' : p === 'Sedang' ? 'badge-warning' : 'badge-success';

  const barColor = (p: string) =>
    p === 'Tinggi'
      ? 'var(--color-danger)'
      : p === 'Sedang'
      ? 'var(--color-warning)'
      : 'var(--color-success)';

  return (
    <SubmenuPlaceholder
      title="Prioritas Intervensi"
      parentTitle="Analitik Wilayah"
      icon={BrainCircuit}
      loading={loading}
      stats={stats}
      sectionTitle="Hasil Analisis"
    >
      {/* ── Tab switcher ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0',
      }}>
        {([
          { key: 'balita', label: 'Balita (Stunting)', Icon: Baby },
          { key: 'lansia', label: 'Lansia (PTM)',      Icon: User },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeTab === key ? 700 : 500,
              color: activeTab === key ? 'var(--color-primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── note ── */}
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', marginTop: 0 }}>
        {activeTab === 'balita'
          ? '* Skor = % balita aktif (&lt; 60 bulan) yang stunting berdasarkan penimbangan terakhir per anak.'
          : '* Skor = % lansia dengan hipertensi (sistolik ≥ 140) atau gula darah ≥ 200 berdasarkan pemeriksaan terakhir.'}
      </p>

      {/* ── table ── */}
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menghitung prioritas kebutuhan wilayah...
        </div>
      ) : activeData.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Tidak ada data posyandu yang ditemukan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Posyandu</th>
                  <th>Kelurahan/Desa</th>
                  <th>{activeTab === 'balita' ? 'Total Balita Aktif' : 'Total Lansia'}</th>
                  <th>Skor Urgensi (%)</th>
                  <th>Tingkat Prioritas</th>
                  <th>Faktor Risiko Dominan</th>
                  <th>Rekomendasi Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.posyandu_id}>
                    <td style={{ fontWeight: 600 }}>{item.nama_posyandu}</td>
                    <td>{item.kelurahan}</td>
                    <td style={{ textAlign: 'center' }}>
                      {activeTab === 'balita'
                        ? (item as BalitaRecord).totalBalita
                        : (item as LansiaRecord).totalLansia}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          flex: 1,
                          backgroundColor: '#e2e8f0',
                          height: '6px',
                          borderRadius: '3px',
                          width: '70px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${item.skor_kebutuhan}%`,
                            backgroundColor: barColor(item.prioritas),
                            height: '100%',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '36px' }}>
                          {item.skor_kebutuhan}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass(item.prioritas)}`}>
                        {item.prioritas}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', maxWidth: '220px' }}>
                      {item.faktor_utama}
                    </td>
                    <td style={{ whiteSpace: 'normal', fontSize: '11px', fontWeight: 500, color: 'var(--color-primary)', maxWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <ArrowRight size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{item.rekomendasi_aksi}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── pagination ── */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <span>Menampilkan {startIndex + 1}–{endIndex} dari {activeData.length} posyandu</span>
              <div className="pagination-pages">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >&lt;</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >{page}</button>
                ))}
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >&gt;</button>
              </div>
            </div>
          )}
        </div>
      )}
    </SubmenuPlaceholder>
  );
}

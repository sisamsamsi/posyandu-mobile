'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import { BookOpen, Sparkles, AlertCircle, Baby, User } from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

/* ─── types ─────────────────────────────────────────── */
interface BalitaRekRecord {
  posyandu_id: string;
  nama_posyandu: string;
  kelurahan: string;
  totalBalita: number;
  stuntingCount: number;
  wastingCount: number;
  stuntingPct: number;
  topik_prioritas: string;
  sasaran_peserta: string;
  metode_saran: string;
  dasar_rekomendasi: string;
  urgency: 'tinggi' | 'sedang' | 'rendah';
}

interface LansiaRekRecord {
  posyandu_id: string;
  nama_posyandu: string;
  kelurahan: string;
  totalLansia: number;
  hipertensiCount: number;
  diabetesCount: number;
  ptmPct: number;
  topik_prioritas: string;
  sasaran_peserta: string;
  metode_saran: string;
  dasar_rekomendasi: string;
  urgency: 'tinggi' | 'sedang' | 'rendah';
}

/* ─── helpers ────────────────────────────────────────── */
const calcAgeMonths = (dob: string) => {
  const d = new Date(dob), now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 - d.getMonth() + now.getMonth());
};

const urgencyBadge = (u: string) =>
  u === 'tinggi' ? 'badge-danger' : u === 'sedang' ? 'badge-warning' : 'badge-success';

const urgencyLabel = (u: string) =>
  u === 'tinggi' ? 'Urgen' : u === 'sedang' ? 'Sedang' : 'Rutin';

/* ─── tab switcher ───────────────────────────────────── */
function TabBar({
  active, onChange,
}: { active: 'balita' | 'lansia'; onChange: (t: 'balita' | 'lansia') => void }) {
  const tabs = [
    { key: 'balita' as const, label: 'Balita (Stunting & Gizi)', Icon: Baby },
    { key: 'lansia' as const, label: 'Lansia (PTM & Hipertensi)', Icon: User },
  ];
  return (
    <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
      {tabs.map(({ key, label, Icon }) => (
        <button key={key} onClick={() => onChange(key)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', fontSize: '13px', background: 'none', border: 'none',
          borderBottom: active === key ? '2px solid var(--color-primary)' : '2px solid transparent',
          marginBottom: '-2px', cursor: 'pointer', transition: 'all 0.15s',
          fontWeight: active === key ? 700 : 500,
          color: active === key ? 'var(--color-primary)' : 'var(--text-muted)',
        }}>
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── table: balita ──────────────────────────────────── */
function BalitaTable({ data, page, perPage, onPage }: {
  data: BalitaRekRecord[];
  page: number;
  perPage: number;
  onPage: (p: number) => void;
}) {
  const total = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const rows  = data.slice(start, start + perPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nama Posyandu</th>
              <th>Kelurahan/Desa</th>
              <th>Total Balita</th>
              <th>Stunting</th>
              <th>Urgensi</th>
              <th>Topik Penyuluhan Prioritas</th>
              <th>Sasaran Peserta</th>
              <th>Metode Edukasi</th>
              <th>Dasar Keputusan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.posyandu_id}>
                <td style={{ fontWeight: 600 }}>{item.nama_posyandu}</td>
                <td>{item.kelurahan}</td>
                <td style={{ textAlign: 'center' }}>{item.totalBalita}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, color: item.stuntingCount > 0 ? '#ef4444' : '#22c55e' }}>
                    {item.stuntingCount}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '3px' }}>
                    ({item.stuntingPct}%)
                  </span>
                </td>
                <td>
                  <span className={`badge ${urgencyBadge(item.urgency)}`}>
                    {urgencyLabel(item.urgency)}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-primary)', whiteSpace: 'normal', maxWidth: '180px' }}>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                    <Sparkles size={11} style={{ color: '#eab308', marginTop: '2px', flexShrink: 0 }} />
                    <span>{item.topik_prioritas}</span>
                  </div>
                </td>
                <td style={{ fontSize: '11px', whiteSpace: 'normal', maxWidth: '160px' }}>
                  {item.sasaran_peserta}
                </td>
                <td style={{ fontSize: '11px', whiteSpace: 'normal', maxWidth: '180px' }}>
                  {item.metode_saran}
                </td>
                <td style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'normal', maxWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                    <AlertCircle size={11} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                    <span>{item.dasar_rekomendasi}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 1 && (
        <div className="pagination-container">
          <span>Menampilkan {start + 1}–{Math.min(start + perPage, data.length)} dari {data.length} posyandu</span>
          <div className="pagination-pages">
            <button className="pagination-btn" onClick={() => onPage(Math.max(page - 1, 1))} disabled={page === 1}>&lt;</button>
            {Array.from({ length: total }, (_, i) => i + 1).map(p => (
              <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
            ))}
            <button className="pagination-btn" onClick={() => onPage(Math.min(page + 1, total))} disabled={page === total}>&gt;</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── table: lansia ──────────────────────────────────── */
function LansiaTable({ data, page, perPage, onPage }: {
  data: LansiaRekRecord[];
  page: number;
  perPage: number;
  onPage: (p: number) => void;
}) {
  const total = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const rows  = data.slice(start, start + perPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nama Posyandu</th>
              <th>Kelurahan/Desa</th>
              <th>Total Lansia</th>
              <th>Hipertensi</th>
              <th>Diabetes</th>
              <th>Urgensi</th>
              <th>Topik Penyuluhan Prioritas</th>
              <th>Sasaran Peserta</th>
              <th>Metode Edukasi</th>
              <th>Dasar Keputusan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.posyandu_id}>
                <td style={{ fontWeight: 600 }}>{item.nama_posyandu}</td>
                <td>{item.kelurahan}</td>
                <td style={{ textAlign: 'center' }}>{item.totalLansia}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, color: item.hipertensiCount > 0 ? '#ef4444' : '#22c55e' }}>
                    {item.hipertensiCount}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, color: item.diabetesCount > 0 ? '#f59e0b' : '#22c55e' }}>
                    {item.diabetesCount}
                  </span>
                </td>
                <td>
                  <span className={`badge ${urgencyBadge(item.urgency)}`}>
                    {urgencyLabel(item.urgency)}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-primary)', whiteSpace: 'normal', maxWidth: '180px' }}>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                    <Sparkles size={11} style={{ color: '#eab308', marginTop: '2px', flexShrink: 0 }} />
                    <span>{item.topik_prioritas}</span>
                  </div>
                </td>
                <td style={{ fontSize: '11px', whiteSpace: 'normal', maxWidth: '140px' }}>
                  {item.sasaran_peserta}
                </td>
                <td style={{ fontSize: '11px', whiteSpace: 'normal', maxWidth: '180px' }}>
                  {item.metode_saran}
                </td>
                <td style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'normal', maxWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                    <AlertCircle size={11} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                    <span>{item.dasar_rekomendasi}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 1 && (
        <div className="pagination-container">
          <span>Menampilkan {start + 1}–{Math.min(start + perPage, data.length)} dari {data.length} posyandu</span>
          <div className="pagination-pages">
            <button className="pagination-btn" onClick={() => onPage(Math.max(page - 1, 1))} disabled={page === 1}>&lt;</button>
            {Array.from({ length: total }, (_, i) => i + 1).map(p => (
              <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
            ))}
            <button className="pagination-btn" onClick={() => onPage(Math.min(page + 1, total))} disabled={page === total}>&gt;</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main page ──────────────────────────────────────── */
export default function RekomendasiPenyuluhanPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [activeTab, setActiveTab]     = useState<'balita' | 'lansia'>('balita');
  const [balitaData, setBalitaData]   = useState<BalitaRekRecord[]>([]);
  const [lansiaData, setLansiaData]   = useState<LansiaRekRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [balitaPage, setBalitaPage]   = useState(1);
  const [lansiaPage, setLansiaPage]   = useState(1);
  const perPage = 15;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [
          { data: posyandus, error: pErr },
          { data: balitas,   error: bErr },
          { data: lansias,   error: lErr },
          { data: penimbangans, error: penErr },
          { data: pemLansias, error: pemErr },
        ] = await Promise.all([
          supabase.from('posyandus').select('id, nama_posyandu, kelurahan'),
          supabase.from('balitas').select('id, posyandu_id, tanggal_lahir'),
          supabase.from('lansias').select('id, posyandu_id'),
          supabase.from('penimbangans')
            .select('balita_id, status_tb_u, status_bb_tb, tanggal')
            .order('tanggal', { ascending: false }),
          supabase.from('pemeriksaan_lansias')
            .select('lansia_id, tekanan_darah, gula_darah, tanggal_periksa')
            .order('tanggal_periksa', { ascending: false }),
        ]);

        if (pErr || bErr || lErr || penErr || pemErr) {
          throw pErr || bErr || lErr || penErr || pemErr;
        }

        /* -- active balitas */
        const activeBalitas = (balitas || []).filter(b => calcAgeMonths(b.tanggal_lahir) < 60);
        const balitaMap: Record<string, string> = {};
        const bCount: Record<string, { total: number; stunting: number; wasting: number }> = {};
        (posyandus || []).forEach(p => { bCount[p.id] = { total: 0, stunting: 0, wasting: 0 }; });
        activeBalitas.forEach(b => {
          if (b.posyandu_id && bCount[b.posyandu_id]) {
            balitaMap[b.id] = b.posyandu_id;
            bCount[b.posyandu_id].total++;
          }
        });

        /* -- stunting/wasting: terbaru per balita */
        const latestPen: Record<string, any> = {};
        (penimbangans || []).forEach(p => { if (!latestPen[p.balita_id]) latestPen[p.balita_id] = p; });
        Object.values(latestPen).forEach(p => {
          const pid = balitaMap[p.balita_id];
          if (!pid || !bCount[pid]) return;
          const tbU = p.status_tb_u?.toLowerCase() ?? '';
          const bbTb = p.status_bb_tb?.toLowerCase() ?? '';
          if (tbU.includes('pendek') || tbU.includes('stunting')) bCount[pid].stunting++;
          if (bbTb.includes('kurus') || bbTb.includes('wasting')) bCount[pid].wasting++;
        });

        /* -- lansia */
        const lansiaMap: Record<string, string> = {};
        const lCount: Record<string, { total: number; hipertensi: number; diabetes: number }> = {};
        (posyandus || []).forEach(p => { lCount[p.id] = { total: 0, hipertensi: 0, diabetes: 0 }; });
        (lansias || []).forEach(l => {
          if (l.posyandu_id && lCount[l.posyandu_id]) {
            lansiaMap[l.id] = l.posyandu_id;
            lCount[l.posyandu_id].total++;
          }
        });

        /* -- PTM: terbaru per lansia */
        const latestPem: Record<string, any> = {};
        (pemLansias || []).forEach(pm => { if (!latestPem[pm.lansia_id]) latestPem[pm.lansia_id] = pm; });
        Object.values(latestPem).forEach(pm => {
          const pid = lansiaMap[pm.lansia_id];
          if (!pid || !lCount[pid]) return;
          const sys = parseInt((pm.tekanan_darah || '0/0').split('/')[0]);
          if (sys >= 140) lCount[pid].hipertensi++;
          if ((pm.gula_darah ?? 0) >= 200) lCount[pid].diabetes++;
        });

        /* ── build balita records ── */
        const buildBalita = (p: any): BalitaRekRecord => {
          const s = bCount[p.id];
          const pct = s.total > 0 ? Math.round((s.stunting / s.total) * 100) : 0;
          const urgency: 'tinggi' | 'sedang' | 'rendah' =
            pct >= 30 ? 'tinggi' : pct >= 10 ? 'sedang' : 'rendah';

          const topik_prioritas =
            urgency === 'tinggi' ? 'Pencegahan Stunting, MP-ASI Kaya Protein & Zink' :
            urgency === 'sedang' ? 'Pemantauan Pertumbuhan & Gizi Seimbang' :
            'Stimulasi Tumbuh Kembang & Imunisasi Lengkap';

          const sasaran_peserta =
            urgency === 'tinggi' ? 'Ibu Hamil, Ibu Menyusui & Orang Tua Balita Stunting' :
            urgency === 'sedang' ? 'Orang Tua Balita & Kader Posyandu' :
            'Seluruh Orang Tua Balita';

          const metode_saran =
            urgency === 'tinggi'
              ? 'Demo Masak MP-ASI Tinggi Protein + Konseling Individu + Pemberian PMT Ekstra'
              : urgency === 'sedang'
              ? 'Penyuluhan Kelompok + Pemantauan Berat Badan Rutin Setiap Bulan'
              : 'Kelas Parenting & Lomba Balita Sehat';

          const dasar_rekomendasi =
            s.stunting > 0
              ? `${s.stunting} dari ${s.total} balita aktif terindikasi stunting (${pct}%). ${s.wasting > 0 ? `+ ${s.wasting} kasus wasting.` : ''}`
              : `Tidak ada kasus stunting. ${s.total} balita aktif dalam kondisi baik.`;

          return {
            posyandu_id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            totalBalita: s.total,
            stuntingCount: s.stunting,
            wastingCount: s.wasting,
            stuntingPct: pct,
            topik_prioritas,
            sasaran_peserta,
            metode_saran,
            dasar_rekomendasi,
            urgency,
          };
        };

        /* ── build lansia records ── */
        const buildLansia = (p: any): LansiaRekRecord => {
          const s = lCount[p.id];
          const ptmTotal = s.hipertensi + s.diabetes;
          const pct = s.total > 0 ? Math.round((ptmTotal / s.total) * 100) : 0;
          const urgency: 'tinggi' | 'sedang' | 'rendah' =
            pct >= 30 ? 'tinggi' : pct >= 10 ? 'sedang' : 'rendah';

          const topik_prioritas =
            s.hipertensi >= s.diabetes
              ? urgency !== 'rendah'
                ? 'Pengelolaan Hipertensi, Diet Rendah Garam & DASH'
                : 'Gaya Hidup Sehat & Pencegahan PTM'
              : urgency !== 'rendah'
              ? 'Pengelolaan Diabetes, Diet Glikemik Rendah'
              : 'Gaya Hidup Sehat & Pencegahan PTM';

          const sasaran_peserta =
            urgency === 'tinggi' ? 'Lansia Berisiko Tinggi & Keluarga Pendamping' :
            urgency === 'sedang' ? 'Lansia & Pra-Lansia di Wilayah Posyandu' :
            'Seluruh Lansia Terdaftar';

          const metode_saran =
            urgency === 'tinggi'
              ? 'Cek Tensi/Gula Rutin + Konseling Gizi Klinis + Rujuk ke Poli PTM Puskesmas'
              : urgency === 'sedang'
              ? 'Senam Lansia Bersama + Edukasi PHBS + Penyuluhan Kelompok'
              : 'Senam Lansia Rutin & Pemeriksaan Berkala Tiap Bulan';

          const dasar_rekomendasi =
            ptmTotal > 0
              ? `${s.hipertensi} hipertensi & ${s.diabetes} diabetes dari ${s.total} lansia (${pct}% berisiko PTM).`
              : `Tidak ada kasus PTM terdeteksi. ${s.total} lansia dalam kondisi normal.`;

          return {
            posyandu_id: p.id,
            nama_posyandu: p.nama_posyandu,
            kelurahan: p.kelurahan,
            totalLansia: s.total,
            hipertensiCount: s.hipertensi,
            diabetesCount: s.diabetes,
            ptmPct: pct,
            topik_prioritas,
            sasaran_peserta,
            metode_saran,
            dasar_rekomendasi,
            urgency,
          };
        };

        const applyFilter = <T extends { kelurahan: string; posyandu_id: string }>(arr: T[]) => {
          let r = arr;
          if (selectedDesa !== 'all') r = r.filter(x => x.kelurahan === selectedDesa);
          if (selectedPosyanduId !== 'all') r = r.filter(x => x.posyandu_id === selectedPosyanduId);
          return r;
        };

        const balitaReport = applyFilter(
          (posyandus || []).map(buildBalita).sort((a, b) => b.stuntingPct - a.stuntingPct)
        );
        const lansiaReport = applyFilter(
          (posyandus || []).map(buildLansia).sort((a, b) => b.ptmPct - a.ptmPct)
        );

        setBalitaData(balitaReport);
        setLansiaData(lansiaReport);
        setBalitaPage(1);
        setLansiaPage(1);
      } catch (err) {
        console.error('Error generating counseling recommendations:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) fetchData();
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  /* ── stats ── */
  const stats = useMemo((): StatItem[] => {
    if (activeTab === 'balita') {
      return [
        { label: 'Total Posyandu', value: balitaData.length, color: 'neutral' },
        { label: 'Penyuluhan Urgen', value: balitaData.filter(d => d.urgency === 'tinggi').length, color: 'danger' },
        { label: 'Penyuluhan Sedang', value: balitaData.filter(d => d.urgency === 'sedang').length, color: 'warning' },
        { label: 'Penyuluhan Rutin', value: balitaData.filter(d => d.urgency === 'rendah').length, color: 'success' },
      ];
    }
    return [
      { label: 'Total Posyandu', value: lansiaData.length, color: 'neutral' },
      { label: 'Penyuluhan Urgen', value: lansiaData.filter(d => d.urgency === 'tinggi').length, color: 'danger' },
      { label: 'Penyuluhan Sedang', value: lansiaData.filter(d => d.urgency === 'sedang').length, color: 'warning' },
      { label: 'Penyuluhan Rutin', value: lansiaData.filter(d => d.urgency === 'rendah').length, color: 'success' },
    ];
  }, [activeTab, balitaData, lansiaData]);

  const handleTabChange = (tab: 'balita' | 'lansia') => {
    setActiveTab(tab);
    setBalitaPage(1);
    setLansiaPage(1);
  };

  return (
    <SubmenuPlaceholder
      title="Rekomendasi Penyuluhan"
      parentTitle="Analitik Wilayah"
      icon={BookOpen}
      loading={loading}
      stats={stats}
      sectionTitle="Topik Penyuluhan per Posyandu"
    >
      <TabBar active={activeTab} onChange={handleTabChange} />

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', marginTop: 0 }}>
        {activeTab === 'balita'
          ? '* Topik ditentukan berdasarkan % stunting dari penimbangan terbaru per balita aktif (< 60 bulan).'
          : '* Topik ditentukan berdasarkan % lansia berisiko PTM dari pemeriksaan terbaru per lansia.'}
      </p>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Menganalisis topik prioritas penyuluhan...
        </div>
      ) : activeTab === 'balita' ? (
        balitaData.length === 0
          ? <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data posyandu.</div>
          : <BalitaTable data={balitaData} page={balitaPage} perPage={perPage} onPage={setBalitaPage} />
      ) : (
        lansiaData.length === 0
          ? <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data posyandu.</div>
          : <LansiaTable data={lansiaData} page={lansiaPage} perPage={perPage} onPage={setLansiaPage} />
      )}
    </SubmenuPlaceholder>
  );
}

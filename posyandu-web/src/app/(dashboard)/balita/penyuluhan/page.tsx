'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import {
  Brain, Sparkles, ChevronDown, ChevronUp,
  MessageSquare, FileText, CalendarDays, User,
} from 'lucide-react';
import SubmenuPlaceholder, { StatItem } from '@/components/layout/SubmenuPlaceholder';

/* ─── types ──────────────────────────────────────────── */
interface PenyuluhanRow {
  id: string;
  tanggal: string;
  created_at: string;
  pertanyaan: string[];
  jawaban: string[];
  rekomendasi: string;
  balita_id: string;
  balita_nama: string;
  balita_lahir: string;
  posyandu_id: string;
  kelurahan: string;
  /* dari penimbangan terbaru */
  status_bb_u: string | null;
  status_tb_u: string | null;
  status_bb_tb: string | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
}

/* ─── helper ──────────────────────────────────────────── */
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const giziColor = (status: string | null) => {
  if (!status) return '#94a3b8';
  const s = status.toLowerCase();
  if (s.includes('sangat') || s.includes('buruk')) return '#ef4444';
  if (s.includes('kurang') || s.includes('pendek') || s.includes('kurus')) return '#f59e0b';
  if (s.includes('lebih') || s.includes('obesitas')) return '#a855f7';
  return '#22c55e';
};

const giziLabel = (status_bb_u: string | null, status_tb_u: string | null, status_bb_tb: string | null) => {
  const parts = [
    status_bb_u ? `BB/U: ${status_bb_u}` : null,
    status_tb_u ? `TB/U: ${status_tb_u}` : null,
    status_bb_tb ? `BB/TB: ${status_bb_tb}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Belum Ada Data Penimbangan';
};

/* ─── expandable row component ────────────────────────── */
function PenyuluhanCard({ item }: { item: PenyuluhanRow }) {
  const [open, setOpen] = useState(false);

  const dominantStatus = item.status_tb_u || item.status_bb_u || item.status_bb_tb;
  const color = giziColor(dominantStatus);

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#fff',
    }}>
      {/* ── header row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1.8fr 1fr auto',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          cursor: 'pointer',
          background: open ? '#f8fafc' : '#fff',
          transition: 'background 0.15s',
        }}
        onClick={() => setOpen(p => !p)}
      >
        {/* nama */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <User size={14} color="#14b8a6" />
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
            {item.balita_nama}
          </span>
        </div>

        {/* tanggal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
          <CalendarDays size={12} />
          {fmtDate(item.tanggal || item.created_at)}
        </div>

        {/* status gizi */}
        <div style={{ fontSize: '11px' }}>
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '99px',
            background: color + '18',
            color,
            fontWeight: 600,
            border: `1px solid ${color}40`,
          }}>
            {giziLabel(item.status_bb_u, item.status_tb_u, item.status_bb_tb)}
          </span>
        </div>

        {/* sesi Q&A */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
          <MessageSquare size={12} />
          {item.pertanyaan.length} pertanyaan
        </div>

        {/* expand */}
        <div style={{ color: '#94a3b8' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* ── detail panel ── */}
      {open && (
        <div style={{
          borderTop: '1px solid #f1f5f9',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0',
        }}>
          {/* Q&A Transcript */}
          <div style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.6px', color: '#64748b', marginBottom: '12px', marginTop: 0,
            }}>
              📋 Transkrip Wawancara Kader
            </p>
            {item.pertanyaan.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Tidak ada data wawancara.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {item.pertanyaan.map((q, i) => (
                  <div key={i} style={{ fontSize: '12px' }}>
                    <p style={{ margin: 0, color: '#475569', fontWeight: 600 }}>
                      T: {q}
                    </p>
                    <p style={{
                      margin: '4px 0 0 0', color: '#1e293b',
                      background: '#f8fafc', padding: '6px 10px',
                      borderRadius: '8px', fontStyle: 'italic',
                    }}>
                      J: {item.jawaban[i] || '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Recommendation */}
          <div style={{ padding: '16px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.6px', color: '#64748b', marginBottom: '12px', marginTop: 0,
            }}>
              <Sparkles size={11} style={{ display: 'inline', marginRight: '4px', color: '#eab308' }} />
              Rekomendasi AI
            </p>

            {/* Nutritional context strip */}
            {(item.berat_badan || item.tinggi_badan) && (
              <div style={{
                background: '#f0fdfa', border: '1px solid #ccfbf1',
                borderRadius: '8px', padding: '8px 12px', marginBottom: '12px',
                fontSize: '12px', color: '#0d9488', display: 'flex', gap: '16px',
              }}>
                {item.berat_badan && <span>⚖️ {item.berat_badan} kg</span>}
                {item.tinggi_badan && <span>📏 {item.tinggi_badan} cm</span>}
              </div>
            )}

            <div style={{
              fontSize: '12.5px', color: '#334155', lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
            }}>
              {item.rekomendasi || 'Tidak ada rekomendasi tercatat.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main page ───────────────────────────────────────── */
export default function PenyuluhanAIPage() {
  const { selectedDesa, selectedPosyanduId, loading: filtersLoading } = useFilters();
  const [data, setData] = useState<PenyuluhanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        /* 1. Fetch semua sesi penyuluhan dari tabel nyata */
        let query = supabase
          .from('penyuluhans')
          .select(`
            id, tanggal, created_at, pertanyaan, jawaban, rekomendasi,
            balita:balitas(
              id, nama, tanggal_lahir, posyandu_id,
              posyandu:posyandus(kelurahan),
              penimbangans(
                berat_badan, tinggi_badan,
                status_bb_u, status_tb_u, status_bb_tb, tanggal
              )
            )
          `)
          .order('created_at', { ascending: false });

        const { data: raw, error } = await query;
        if (error) throw error;

        /* 2. Flatten & ambil penimbangan terbaru per balita */
        const rows: PenyuluhanRow[] = (raw || []).map((r: any) => {
          const balita = Array.isArray(r.balita) ? r.balita[0] : r.balita;
          const posyandu = Array.isArray(balita?.posyandu) ? balita?.posyandu[0] : balita?.posyandu;
          const penimbangans: any[] = balita?.penimbangans || [];

          // Ambil penimbangan terbaru
          const latest = penimbangans.sort(
            (a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
          )[0] ?? null;

          return {
            id: r.id,
            tanggal: r.tanggal,
            created_at: r.created_at,
            pertanyaan: r.pertanyaan || [],
            jawaban: r.jawaban || [],
            rekomendasi: r.rekomendasi || '',
            balita_id: balita?.id ?? '',
            balita_nama: balita?.nama ?? 'Tidak Diketahui',
            balita_lahir: balita?.tanggal_lahir ?? '',
            posyandu_id: balita?.posyandu_id ?? '',
            kelurahan: posyandu?.kelurahan ?? '',
            status_bb_u: latest?.status_bb_u ?? null,
            status_tb_u: latest?.status_tb_u ?? null,
            status_bb_tb: latest?.status_bb_tb ?? null,
            berat_badan: latest?.berat_badan ?? null,
            tinggi_badan: latest?.tinggi_badan ?? null,
          };
        });

        /* 3. Apply header filters */
        let filtered = rows;
        if (selectedDesa !== 'all') {
          filtered = filtered.filter(r => r.kelurahan === selectedDesa);
        }
        if (selectedPosyanduId !== 'all') {
          filtered = filtered.filter(r => r.posyandu_id === selectedPosyanduId);
        }

        setData(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error loading penyuluhan:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!filtersLoading) fetchData();
  }, [selectedDesa, selectedPosyanduId, filtersLoading]);

  /* ── search filter ── */
  const filtered = useMemo(() =>
    search.trim()
      ? data.filter(d => d.balita_nama.toLowerCase().includes(search.toLowerCase()))
      : data,
    [data, search]
  );

  /* ── stats ── */
  const stats = useMemo((): StatItem[] => {
    const stunting = data.filter(d =>
      d.status_tb_u?.toLowerCase().includes('pendek') ||
      d.status_bb_u?.toLowerCase().includes('kurang')
    ).length;
    const normal   = data.filter(d => !d.status_tb_u?.toLowerCase().includes('pendek') &&
      !d.status_bb_u?.toLowerCase().includes('kurang')).length;
    // Unique balitas
    const uniqueBalita = new Set(data.map(d => d.balita_id)).size;
    return [
      { label: 'Total Sesi',            value: data.length,   color: 'neutral' },
      { label: 'Balita Unik',           value: uniqueBalita,  color: 'primary' },
      { label: 'Sesi Balita Berisiko',  value: stunting,      color: 'danger'  },
      { label: 'Sesi Balita Normal',    value: normal,        color: 'success' },
    ];
  }, [data]);

  /* ── pagination ── */
  const totalPages  = Math.ceil(filtered.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <SubmenuPlaceholder
      title="Rekap Penyuluhan AI"
      parentTitle="Balita"
      icon={Brain}
      loading={loading}
      stats={stats}
      sectionTitle="Riwayat Sesi Wawancara Kader"
    >
      {/* search bar */}
      <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Cari nama balita..."
          style={{
            flex: 1, maxWidth: '320px',
            padding: '8px 12px', fontSize: '13px',
            border: '1px solid #e2e8f0', borderRadius: '8px',
            outline: 'none', color: '#1e293b',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Reset
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          {filtered.length} sesi ditemukan
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat data penyuluhan dari mobile...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '32px 24px', textAlign: 'center',
          border: '1px dashed #e2e8f0', borderRadius: '12px',
          color: 'var(--text-muted)',
        }}>
          <FileText size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>Belum ada sesi penyuluhan</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
            Data akan muncul setelah kader menyelesaikan wawancara AI di aplikasi mobile.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* column header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1.8fr 1fr auto',
            gap: '12px',
            padding: '6px 16px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#94a3b8',
          }}>
            <span>Nama Balita</span>
            <span>Tanggal Sesi</span>
            <span>Status Gizi Terkini</span>
            <span>Sesi</span>
            <span></span>
          </div>

          {paginatedData.map(item => (
            <PenyuluhanCard key={item.id} item={item} />
          ))}

          {/* pagination */}
          {totalPages > 1 && (
            <div className="pagination-container" style={{ marginTop: '8px' }}>
              <span>
                Menampilkan {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} dari {filtered.length} sesi
              </span>
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

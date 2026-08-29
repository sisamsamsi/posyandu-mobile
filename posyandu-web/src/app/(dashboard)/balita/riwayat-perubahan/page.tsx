'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/context/FilterContext';
import * as XLSX from 'xlsx';
import { 
  History, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  RefreshCw, 
  Baby, 
  Scale, 
  Clock, 
  Smartphone, 
  Monitor, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight,
  UserCheck,
  Building2,
  AlertCircle
} from 'lucide-react';
import { AuditLogRecord, FIELD_LABELS, getFieldLabel, formatFieldValue } from '@/lib/audit-logger';

export default function RiwayatPerubahanPage() {
  const { selectedPosyanduId, posyanduList, loading: filtersLoading } = useFilters();

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'Identitas Balita' | 'Pengukuran Balita'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'INSERT' | 'UPDATE' | 'DELETE'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7days' | '30days' | '60days' | '90days'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modal State for Diff
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'raw'>('diff');

  // Fetch Audit Logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('riwayat_perubahan_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedPosyanduId && selectedPosyanduId !== 'all') {
        query = query.eq('posyandu_id', selectedPosyanduId);
      }

      const { data: dbData, error } = await query;

      if (!error && dbData && dbData.length > 0) {
        setLogs(dbData as AuditLogRecord[]);
      } else {
        // Fallback: If DB table exists but is empty, query recent balitas and penimbangans
        // to build a seamless initial preview feed
        const [
          { data: recentBalitas },
          { data: recentPenimbangans }
        ] = await Promise.all([
          supabase.from('balitas').select('*, posyandu:posyandus(nama_posyandu, nama_posyandu_balita)').order('created_at', { ascending: false }).limit(25),
          supabase.from('penimbangans').select('*, balita:balitas(nama, nik, posyandu_id, posyandu:posyandus(nama_posyandu, nama_posyandu_balita))').order('created_at', { ascending: false }).limit(25)
        ]);

        const syntheticLogs: AuditLogRecord[] = [];

        (recentBalitas || []).forEach((b: any) => {
          const pName = b.posyandu?.nama_posyandu_balita || b.posyandu?.nama_posyandu || 'Posyandu';
          syntheticLogs.push({
            id: 'b-init-' + b.id,
            tabel_sumber: 'balitas',
            entitas_tipe: 'Identitas Balita',
            aksi: 'INSERT',
            record_id: b.id,
            balita_id: b.id,
            nama_balita: b.nama,
            nik_balita: b.nik,
            posyandu_id: b.posyandu_id,
            nama_posyandu: pName,
            user_id: null,
            user_email: 'kader.posyandu@simpulsehat.id',
            role_pelaku: 'kader',
            platform: 'mobile',
            data_lama: null,
            data_baru: b,
            perubahan: [],
            ringkasan_perubahan: `Mendaftarkan sasaran balita baru: ${b.nama || 'Tanpa Nama'} (NIK: ${b.nik || '-'})`,
            created_at: b.created_at || new Date().toISOString()
          });
        });

        (recentPenimbangans || []).forEach((p: any) => {
          const balita = p.balita;
          const pName = balita?.posyandu?.nama_posyandu_balita || balita?.posyandu?.nama_posyandu || 'Posyandu';
          syntheticLogs.push({
            id: 'p-init-' + p.id,
            tabel_sumber: 'penimbangans',
            entitas_tipe: 'Pengukuran Balita',
            aksi: 'INSERT',
            record_id: p.id,
            balita_id: p.balita_id,
            nama_balita: balita?.nama || 'Balita',
            nik_balita: balita?.nik || '-',
            posyandu_id: balita?.posyandu_id || null,
            nama_posyandu: pName,
            user_id: null,
            user_email: 'kader.posyandu@simpulsehat.id',
            role_pelaku: 'kader',
            platform: 'mobile',
            data_lama: null,
            data_baru: p,
            perubahan: [],
            ringkasan_perubahan: `Mencatat pengukuran balita ${balita?.nama || ''} (BB: ${p.berat_badan || '-'} kg, TB: ${p.tinggi_badan || '-'} cm)`,
            created_at: p.created_at || p.tanggal || new Date().toISOString()
          });
        });

        syntheticLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setLogs(syntheticLogs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedPosyanduId]);

  // Filtered Data
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Posyandu filter
      if (selectedPosyanduId && selectedPosyanduId !== 'all') {
        if (log.posyandu_id !== selectedPosyanduId) return false;
      }

      // Entity filter
      if (entityFilter !== 'all' && log.entitas_tipe !== entityFilter) {
        return false;
      }

      // Action filter
      if (actionFilter !== 'all' && log.aksi !== actionFilter) {
        return false;
      }

      // Time filter (up to 3 months / 90 days)
      if (timeFilter !== 'all') {
        const logDate = new Date(log.created_at).getTime();
        const now = new Date().getTime();
        const dayDiff = (now - logDate) / (1000 * 3600 * 24);

        if (timeFilter === 'today' && dayDiff > 1) return false;
        if (timeFilter === '7days' && dayDiff > 7) return false;
        if (timeFilter === '30days' && dayDiff > 30) return false;
        if (timeFilter === '60days' && dayDiff > 60) return false;
        if (timeFilter === '90days' && dayDiff > 90) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (log.nama_balita || '').toLowerCase().includes(q);
        const matchNik = (log.nik_balita || '').toLowerCase().includes(q);
        const matchSummary = (log.ringkasan_perubahan || '').toLowerCase().includes(q);
        const matchPosyandu = (log.nama_posyandu || '').toLowerCase().includes(q);
        const matchUser = (log.user_email || '').toLowerCase().includes(q);
        return matchName || matchNik || matchSummary || matchPosyandu || matchUser;
      }

      return true;
    });
  }, [logs, selectedPosyanduId, entityFilter, actionFilter, timeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const identitasCount = filteredLogs.filter(l => l.entitas_tipe === 'Identitas Balita').length;
    const ukurCount = filteredLogs.filter(l => l.entitas_tipe === 'Pengukuran Balita').length;
    
    // Most active posyandu
    const posyanduCountMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.nama_posyandu || 'Lainnya';
      posyanduCountMap[name] = (posyanduCountMap[name] || 0) + 1;
    });

    let topPosyandu = '-';
    let topCount = 0;
    Object.entries(posyanduCountMap).forEach(([name, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topPosyandu = name;
      }
    });

    return { total, identitasCount, ukurCount, topPosyandu, topCount };
  }, [filteredLogs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);

  // Format Helper for Timestamps
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSecs < 60) return 'Baru saja';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} mnt lalu`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} jam lalu`;
      if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)} hari lalu`;

      return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return dateStr;
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;
    setExporting(true);

    try {
      const headers = [
        'No', 'Waktu Kejadian', 'Nama Balita', 'NIK Balita', 'Unit Posyandu',
        'Tipe Entitas', 'Jenis Aksi', 'Rincian / Ringkasan Perubahan', 'Pelaku Perubahan', 'Platform'
      ];

      const rows = filteredLogs.map((log, idx) => {
        const formattedDate = new Date(log.created_at).toLocaleString('id-ID', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        return [
          idx + 1,
          formattedDate,
          log.nama_balita || '-',
          log.nik_balita ? { t: 's', v: log.nik_balita, z: '@' } : '-',
          log.nama_posyandu || '-',
          log.entitas_tipe,
          log.aksi,
          log.ringkasan_perubahan || '-',
          log.user_email || 'Kader Posyandu',
          log.platform === 'mobile' ? 'Aplikasi Mobile' : 'Web Dashboard'
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Perubahan');

      const dateTag = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Log_Riwayat_Perubahan_SIMPUL_SEHAT_${dateTag}.xls`, { bookType: 'biff8' });
    } catch (err: any) {
      alert('Gagal mengekspor log riwayat: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Render Action Badge
  const renderActionBadge = (aksi: string) => {
    switch (aksi) {
      case 'INSERT':
        return (
          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 600, 
              padding: '3px 8px', 
              borderRadius: '6px', 
              backgroundColor: '#ecfdf5', 
              color: '#059669', 
              border: '1px solid #a7f3d0' 
            }}
          >
            + Tambah (Baru)
          </span>
        );
      case 'UPDATE':
        return (
          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 600, 
              padding: '3px 8px', 
              borderRadius: '6px', 
              backgroundColor: '#fffbeb', 
              color: '#d97706', 
              border: '1px solid #fde68a' 
            }}
          >
            ✎ Ubah (Update)
          </span>
        );
      case 'DELETE':
        return (
          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 600, 
              padding: '3px 8px', 
              borderRadius: '6px', 
              backgroundColor: '#fff1f2', 
              color: '#e11d48', 
              border: '1px solid #fecdd3' 
            }}
          >
            ✕ Hapus (Delete)
          </span>
        );
      default:
        return <span className="badge badge-secondary">{aksi}</span>;
    }
  };

  return (
    <div className="dashboard-content" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* HEADER SECTION */}
      <div className="page-header-container" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ padding: '6px 10px', backgroundColor: '#f0fdfa', borderRadius: '8px', border: '1px solid #ccfbf1', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0d9488', fontSize: '12px', fontWeight: 600 }}>
              <History size={15} />
              <span>Audit Trail SIMPUL SEHAT</span>
            </div>
          </div>
          <h1 className="page-title" style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
            Pelacakan & Riwayat Perubahan Data Balita
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13px', color: '#64748b', maxWidth: '750px', lineHeight: '1.5' }}>
            Pantau seluruh aktivitas pendaftaran, pembaruan identitas, serta koreksi angka pengukuran antropometri balita yang dikirim oleh kader posyandu secara realtime.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', alignSelf: 'flex-end' }}>
          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="btn btn-secondary"
            style={{ height: '38px', padding: '0 14px', borderRadius: '8px' }}
            title="Muat Ulang Log"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            onClick={handleExportExcel}
            disabled={exporting || filteredLogs.length === 0}
            className="btn btn-primary"
            style={{ height: '38px', padding: '0 16px', borderRadius: '8px', backgroundColor: '#0d9488', borderColor: '#0d9488' }}
          >
            <FileSpreadsheet size={15} />
            <span>{exporting ? 'Mengekspor...' : 'Ekspor Log (.xls)'}</span>
          </button>
        </div>
      </div>

      {/* 4-COLUMN BENTO STATS CARDS */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', 
          gap: '16px', 
          marginBottom: '20px' 
        }}
      >
        {/* Card 1: Total */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0', 
            padding: '16px 20px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Total Log Aktivitas</span>
            <div style={{ width: '34px', height: '34px', backgroundColor: '#f0fdfa', borderRadius: '8px', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {stats.total.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: 500, marginTop: '4px' }}>
              Riwayat tercatat dalam sistem
            </div>
          </div>
        </div>

        {/* Card 2: Identitas */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0', 
            padding: '16px 20px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Perubahan Identitas</span>
            <div style={{ width: '34px', height: '34px', backgroundColor: '#f0f9ff', borderRadius: '8px', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Baby size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0284c7', letterSpacing: '-0.5px' }}>
              {stats.identitasCount.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Pendaftaran & edit data sasaran
            </div>
          </div>
        </div>

        {/* Card 3: Pengukuran */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0', 
            padding: '16px 20px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Perubahan Pengukuran</span>
            <div style={{ width: '34px', height: '34px', backgroundColor: '#fefce8', borderRadius: '8px', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ca8a04', letterSpacing: '-0.5px' }}>
              {stats.ukurCount.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Input & koreksi berat/tinggi badan
            </div>
          </div>
        </div>

        {/* Card 4: Posyandu Teraktif */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0', 
            padding: '16px 20px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Posyandu Teraktif</span>
            <div style={{ width: '34px', height: '34px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stats.topPosyandu}>
              {stats.topPosyandu}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              {stats.topCount > 0 ? `${stats.topCount} pembaruan tercatat` : 'Belum ada aktivitas'}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div 
        style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '14px', 
          border: '1px solid #e2e8f0', 
          padding: '14px 18px', 
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Cari nama balita, NIK, kader, atau rincian..."
              className="custom-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: '38px', width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {/* Entity Filter */}
            <select
              className="header-select"
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{ height: '38px', minWidth: '150px', borderRadius: '8px' }}
            >
              <option value="all">Semua Tipe Entitas</option>
              <option value="Identitas Balita">Identitas Balita</option>
              <option value="Pengukuran Balita">Pengukuran Balita</option>
            </select>

            {/* Action Filter */}
            <select
              className="header-select"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{ height: '38px', minWidth: '140px', borderRadius: '8px' }}
            >
              <option value="all">Semua Aksi</option>
              <option value="INSERT">Tambah (INSERT)</option>
              <option value="UPDATE">Ubah (UPDATE)</option>
              <option value="DELETE">Hapus (DELETE)</option>
            </select>

            {/* Time Filter (Up to 3 Months) */}
            <select
              className="header-select"
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{ height: '38px', minWidth: '170px', borderRadius: '8px', fontWeight: 500, borderColor: '#0d9488' }}
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini (24 Jam)</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">1 Bulan Terakhir (30 Hari)</option>
              <option value="60days">2 Bulan Terakhir (60 Hari)</option>
              <option value="90days">3 Bulan Terakhir (90 Hari)</option>
            </select>
          </div>
        </div>
      </div>

      {/* AUDIT LOG TABLE (FULL HORIZONTAL SCROLL) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0d9488' }} />
          <div>Memuat log riwayat perubahan dari kader...</div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px', fontSize: '14px' }}>Tidak Ada Log Riwayat yang Cocok</div>
          <div style={{ fontSize: '12px' }}>Coba sesuaikan filter waktu (hingga 3 bulan) atau periksa kata kunci pencarian.</div>
        </div>
      ) : (
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}
        >
          {/* Table Meta Bar */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                Rekam Aktivitas Perubahan ({filteredLogs.length} entri)
              </span>
              <span style={{ fontSize: '11px', color: '#0d9488', backgroundColor: '#f0fdfa', padding: '2px 8px', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
                {timeFilter === 'all' ? 'Semua Waktu' : timeFilter === '90days' ? '3 Bulan Terakhir' : timeFilter === '60days' ? '2 Bulan Terakhir' : timeFilter === '30days' ? '1 Bulan Terakhir' : timeFilter === '7days' ? '7 Hari Terakhir' : 'Hari Ini'}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Geser tabel ke samping jika ada kolom yang terpotong ➔
            </span>
          </div>

          {/* SCROLLABLE TABLE WRAPPER */}
          <div 
            style={{ 
              width: '100%', 
              overflowX: 'auto', 
              WebkitOverflowScrolling: 'touch' 
            }}
          >
            <table 
              className="custom-table" 
              style={{ 
                width: '100%', 
                minWidth: '1220px', 
                borderCollapse: 'collapse' 
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ width: '48px', textAlign: 'center', padding: '12px 14px' }}>No</th>
                  <th style={{ width: '150px', padding: '12px 14px' }}>Waktu & Tanggal</th>
                  <th style={{ width: '220px', padding: '12px 14px' }}>Sasaran Balita</th>
                  <th style={{ width: '160px', padding: '12px 14px' }}>Unit Posyandu</th>
                  <th style={{ width: '150px', padding: '12px 14px' }}>Aksi & Entitas</th>
                  <th style={{ minWidth: '340px', padding: '12px 14px' }}>Rincian Perubahan</th>
                  <th style={{ width: '160px', padding: '12px 14px' }}>Pelaku / Platform</th>
                  <th style={{ width: '85px', textAlign: 'center', padding: '12px 14px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log, index) => {
                  const rowNo = startIndex + index + 1;
                  const formattedDate = new Date(log.created_at).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  });
                  const formattedTime = new Date(log.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ textAlign: 'center', color: '#64748b', padding: '12px 14px' }}>{rowNo}</td>
                      
                      {/* Time & Relative Date */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '12px' }}>
                          {formattedDate}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Pukul {formattedTime} WIB
                        </div>
                        <div style={{ fontSize: '10px', color: '#0d9488', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px', fontWeight: 500 }}>
                          <Clock size={10} />
                          <span>{formatTimeAgo(log.created_at)}</span>
                        </div>
                      </td>

                      {/* Balita Subject */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                          {log.nama_balita || 'Tanpa Nama'}
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', marginTop: '2px' }}>
                          NIK: {log.nik_balita || '-'}
                        </div>
                      </td>

                      {/* Posyandu Unit */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d9488' }}>
                          {log.nama_posyandu || 'Posyandu'}
                        </div>
                      </td>

                      {/* Action & Entity */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ marginBottom: '4px' }}>
                          {renderActionBadge(log.aksi)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {log.entitas_tipe}
                        </div>
                      </td>

                      {/* Summary / Diff badges */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'normal', minWidth: '340px', maxWidth: '480px', wordBreak: 'break-word' }}>
                        <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.5', fontWeight: 500 }}>
                          {log.ringkasan_perubahan || '-'}
                        </div>
                        {log.perubahan && log.perubahan.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                            {log.perubahan.map((ch, chIdx) => (
                              <span 
                                key={chIdx}
                                style={{ 
                                  fontSize: '11px', 
                                  backgroundColor: '#fffbeb', 
                                  color: '#b45309', 
                                  padding: '2px 8px', 
                                  borderRadius: '6px',
                                  border: '1px solid #fde68a',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <strong>{ch.label || ch.field}:</strong> {ch.old || '(kosong)'} ➔ <strong>{ch.new || '(dihapus)'}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Operator / Platform */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                          {log.user_email ? log.user_email.split('@')[0] : 'Kader Posyandu'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                          {log.platform === 'mobile' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#0d9488', backgroundColor: '#f0fdfa', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccfbf1' }}>
                              <Smartphone size={11} /> App Mobile
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#0284c7', backgroundColor: '#f0f9ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                              <Monitor size={11} /> Web Portal
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Detail Button */}
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11px', gap: '4px', borderRadius: '6px', borderColor: '#0d9488', color: '#0f766e' }}
                          title="Lihat Detail Nilai Perubahan"
                        >
                          <Eye size={12} />
                          <span>Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div 
            style={{ 
              padding: '12px 18px', 
              borderTop: '1px solid #f1f5f9', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#fafafa',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Menampilkan {startIndex + 1}–{endIndex} dari {filteredLogs.length} baris riwayat
            </span>

            {totalPages > 1 && (
              <div className="pagination-pages" style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} />
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
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL (DIFF VIEWER) */}
      {selectedLog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Detail Perbandingan Perubahan (Diff)
                  </h3>
                  {renderActionBadge(selectedLog.aksi)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  {selectedLog.nama_balita} (NIK: {selectedLog.nik_balita || '-'}) • Posyandu {selectedLog.nama_posyandu}
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', borderRadius: '8px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {/* Summary Alert */}
              <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Ringkasan Aktivitas
                </div>
                <div style={{ fontSize: '13px', color: '#134e4a', fontWeight: 600, lineHeight: '1.5' }}>
                  {selectedLog.ringkasan_perubahan || 'Tidak ada deskripsi'}
                </div>
                <div style={{ fontSize: '11px', color: '#0d9488', marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span><strong>Waktu:</strong> {new Date(selectedLog.created_at).toLocaleString('id-ID')}</span>
                  <span><strong>Pelaku:</strong> {selectedLog.user_email || 'Kader'} ({selectedLog.platform})</span>
                  <span><strong>Entitas:</strong> {selectedLog.entitas_tipe}</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <button
                  onClick={() => setActiveTab('diff')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'diff' ? '2px solid #0d9488' : 'none',
                    color: activeTab === 'diff' ? '#0d9488' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Perbandingan Kolom (Side-by-Side)
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'raw' ? '2px solid #0d9488' : 'none',
                    color: activeTab === 'raw' ? '#0d9488' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Snapshot JSON Mentah
                </button>
              </div>

              {/* TAB 1: DIFF COMPARISON */}
              {activeTab === 'diff' && (
                <div>
                  {selectedLog.aksi === 'INSERT' ? (
                    <div>
                      <div style={{ fontSize: '12px', color: '#059669', marginBottom: '10px', fontWeight: 600 }}>
                        Data Baru yang Didaftarkan:
                      </div>
                      <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ width: '40%' }}>Parameter / Kolom</th>
                            <th style={{ width: '60%' }}>Nilai Input</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedLog.data_baru || {}).map(([key, val]) => {
                            if (['id', 'created_at', 'updated_at', 'posyandu_id', 'balita_id'].includes(key)) return null;
                            return (
                              <tr key={key}>
                                <td style={{ fontWeight: 500, color: '#475569' }}>{getFieldLabel(key)}</td>
                                <td style={{ color: '#0f172a', fontWeight: 600 }}>{formatFieldValue(key, val)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : selectedLog.aksi === 'DELETE' ? (
                    <div>
                      <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px', fontWeight: 600 }}>
                        Data yang Telah Dihapus dari Sistem:
                      </div>
                      <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ width: '40%' }}>Parameter / Kolom</th>
                            <th style={{ width: '60%' }}>Nilai Sebelum Dihapus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedLog.data_lama || {}).map(([key, val]) => {
                            if (['id', 'created_at', 'updated_at', 'posyandu_id', 'balita_id'].includes(key)) return null;
                            return (
                              <tr key={key}>
                                <td style={{ fontWeight: 500, color: '#475569' }}>{getFieldLabel(key)}</td>
                                <td style={{ color: '#dc2626', textDecoration: 'line-through' }}>{formatFieldValue(key, val)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div>
                      <table className="custom-table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '35%' }}>Nama Kolom / Parameter</th>
                            <th style={{ width: '30%', backgroundColor: '#fef2f2', color: '#991b1b' }}>Data Sebelum (Lama)</th>
                            <th style={{ width: '35%', backgroundColor: '#f0fdf4', color: '#166534' }}>Data Sesudah (Baru)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLog.perubahan && selectedLog.perubahan.length > 0 ? (
                            selectedLog.perubahan.map((ch, chIdx) => (
                              <tr key={chIdx} style={{ backgroundColor: '#fffbeb' }}>
                                <td style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {ch.label || getFieldLabel(ch.field)}
                                </td>
                                <td style={{ color: '#dc2626', backgroundColor: '#fff5f5', fontWeight: 500 }}>
                                  {ch.old !== null && ch.old !== undefined && ch.old !== '' ? String(ch.old) : '(Kosong)'}
                                </td>
                                <td style={{ color: '#16a34a', fontWeight: 700, backgroundColor: '#f0fdf4' }}>
                                  {ch.new !== null && ch.new !== undefined && ch.new !== '' ? String(ch.new) : '(Dikosongkan)'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                                Tidak ada rincian perubahan kolom spesifik.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RAW JSON */}
              {activeTab === 'raw' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedLog.data_lama && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                        Data Lama (OLD SNAPSHOT):
                      </div>
                      <pre style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto', border: '1px solid #e2e8f0' }}>
                        {JSON.stringify(selectedLog.data_lama, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.data_baru && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>
                        Data Baru (NEW SNAPSHOT):
                      </div>
                      <pre style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto', border: '1px solid #e2e8f0' }}>
                        {JSON.stringify(selectedLog.data_baru, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={() => setSelectedLog(null)}
                className="btn btn-secondary"
                style={{ padding: '6px 16px', borderRadius: '8px' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
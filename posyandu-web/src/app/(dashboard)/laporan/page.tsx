'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LaporanRow {
  no: number;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  anak_ke: number;
  bb_lahir: number | null;
  tb_lahir: number | null;
  nama_ortu: string;
  no_hp_ortu: string | null;
  alamat: string;
  rt: number | null;
  tanggal_pengukuran: string | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
  lingkar_lengan: number | null;
  lingkar_kepala: number | null;
  status_bb_u: string | null;
  nama_posyandu: string;
  is_baru: boolean;
}

interface LansiaLaporanRow {
  no: number;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  alamat: string;
  rt: number | null;
  tanggal_periksa: string | null;
  tekanan_darah: string | null;
  gula_darah: number | null;
  kolesterol: number | null;
  asam_urat: number | null;
  nama_posyandu: string;
  is_baru: boolean;
}

export default function LaporanPage() {
  const { selectedDesa, selectedPosyanduId, posyanduList, loading: filtersLoading } = useFilters();
  
  // States
  const [activeCategory, setActiveCategory] = useState<'balita' | 'lansia'>('balita');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('6'); // Juni (1-indexed)
  const [selectedYear, setSelectedYear] = useState('2026');
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sasaranFilter, setSasaranFilter] = useState('all');

  // Set current month/year dynamically on mount to prevent stale defaults
  useEffect(() => {
    const today = new Date();
    setSelectedMonth((today.getMonth() + 1).toString());
    setSelectedYear(today.getFullYear().toString());
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const monthsList = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const calculateAgeMonths = (dobStr: string, refDate: Date) => {
    const dob = new Date(dobStr);
    let months = (refDate.getFullYear() - dob.getFullYear()) * 12;
    months -= dob.getMonth();
    months += refDate.getMonth();
    return months <= 0 ? 0 : months;
  };

  const fetchLaporanData = async () => {
    try {
      setLoading(true);
      const yearNum = parseInt(selectedYear);
      const monthNum = parseInt(selectedMonth);

      // Define date bounds for measurements
      const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Get target posyandu IDs
      let targetPosyanduIds: string[] = [];
      if (selectedPosyanduId !== 'all') {
        targetPosyanduIds = [selectedPosyanduId];
      } else {
        targetPosyanduIds = posyanduList
          .filter(p => selectedDesa === 'all' || p.kelurahan === selectedDesa)
          .map(p => p.id);
      }

      if (targetPosyanduIds.length === 0) {
        setData([]);
        return;
      }

      if (activeCategory === 'balita') {
        // 1. Fetch balitas in target Posyandus
        const { data: allBalitas, error: bErr } = await supabase
          .from('balitas')
          .select('*, posyandu:posyandus(nama_posyandu, nama_posyandu_balita)')
          .in('posyandu_id', targetPosyanduIds);

        if (bErr) throw bErr;

        if (!allBalitas || allBalitas.length === 0) {
          setData([]);
          return;
        }

        // Filter to keep only active balitas (< 60 months old at the selected month/year)
        const refDate = new Date(yearNum, monthNum - 1, 1);
        const balitas = allBalitas.filter(b => calculateAgeMonths(b.tanggal_lahir, refDate) < 60);

        if (balitas.length === 0) {
          setData([]);
          return;
        }

        const balitaIds = balitas.map(b => b.id);

        // 2. Fetch measurements in this month
        const { data: weighings, error: wErr } = await supabase
          .from('penimbangans')
          .select('*')
          .in('balita_id', balitaIds)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);

        if (wErr) throw wErr;

        // Group measurements by balita_id (keep latest)
        const weighMap = new Map<string, any>();
        (weighings || []).forEach(w => {
          if (!weighMap.has(w.balita_id) || w.tanggal > weighMap.get(w.balita_id).tanggal) {
            weighMap.set(w.balita_id, w);
          }
        });

        // 3. Map into report structure
        const reportRows = balitas.map((b, index) => {
          const w = weighMap.get(b.id);
          const createdDate = new Date(b.created_at);
          const isNew = (createdDate.getMonth() + 1) === monthNum && createdDate.getFullYear() === yearNum;

          return {
            no: index + 1,
            nik: b.nik,
            nama: b.nama,
            tanggal_lahir: b.tanggal_lahir,
            jenis_kelamin: b.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
            anak_ke: b.anak_ke || 1,
            bb_lahir: b.bb_lahir,
            tb_lahir: b.tb_lahir,
            nama_ortu: b.nama_ortu || '',
            no_hp_ortu: b.no_hp_ortu || '',
            alamat: b.alamat || '',
            rt: b.rt,
            rw: b.rw || '',
            no_kk: b.no_kk || '',
            nik_ortu: b.nik_ortu || '',
            usia_kehamilan_lahir: b.usia_kehamilan_lahir || '',
            lk_lahir: b.lk_lahir || '',
            buku_kia: b.buku_kia !== null && b.buku_kia !== undefined ? b.buku_kia : true,
            buku_kia_bayi_kecil: b.buku_kia_bayi_kecil || false,
            tatalaksana_bblr: b.tatalaksana_bblr || false,
            imd: b.imd !== null && b.imd !== undefined ? b.imd : true,
            tanggal_pengukuran: w ? w.tanggal : null,
            berat_badan: w ? w.berat_badan : null,
            tinggi_badan: w ? w.tinggi_badan : null,
            lingkar_lengan: w ? w.lingkar_lengan : null,
            lingkar_kepala: w ? w.lingkar_kepala : null,
            status_bb_u: w ? w.status_bb_u : null,
            nama_posyandu: (b as any).posyandu?.nama_posyandu_balita || (b as any).posyandu?.nama_posyandu || '',
            is_baru: isNew
          };
        });

        // Request 5: Sort by oldest first (DOB ascending)
        reportRows.sort((a, b) => new Date(a.tanggal_lahir).getTime() - new Date(b.tanggal_lahir).getTime());
        // Reassign 'no' index after sorting
        reportRows.forEach((row, i) => {
          row.no = i + 1;
        });

        setData(reportRows);
      } else {
        // 1. Fetch lansias in target Posyandus
        const { data: allLansias, error: lErr } = await supabase
          .from('lansias')
          .select('*, posyandu:posyandus(nama_posyandu, nama_posyandu_lansia)')
          .in('posyandu_id', targetPosyanduIds);

        if (lErr) throw lErr;

        if (!allLansias || allLansias.length === 0) {
          setData([]);
          return;
        }

        const lansiaIds = allLansias.map(l => l.id);

        // 2. Fetch examinations in this month
        const { data: examinations, error: exErr } = await supabase
          .from('pemeriksaan_lansias')
          .select('*')
          .in('lansia_id', lansiaIds)
          .gte('tanggal_periksa', startDate)
          .lte('tanggal_periksa', endDate);

        if (exErr) throw exErr;

        // Group by lansia_id (keep latest)
        const examMap = new Map<string, any>();
        (examinations || []).forEach(ex => {
          if (!examMap.has(ex.lansia_id) || ex.tanggal_periksa > examMap.get(ex.lansia_id).tanggal_periksa) {
            examMap.set(ex.lansia_id, ex);
          }
        });

        // 3. Map into report structure
        const reportRows = allLansias.map((l, index) => {
          const ex = examMap.get(l.id);
          const createdDate = new Date(l.created_at);
          const isNew = (createdDate.getMonth() + 1) === monthNum && createdDate.getFullYear() === yearNum;

          return {
            no: index + 1,
            nik: l.nik,
            nama: l.nama,
            tanggal_lahir: l.tanggal_lahir,
            jenis_kelamin: l.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
            alamat: l.alamat || '',
            rt: l.rt,
            tanggal_periksa: ex ? ex.tanggal_periksa : null,
            tekanan_darah: ex ? ex.tekanan_darah : null,
            gula_darah: ex ? ex.gula_darah : null,
            kolesterol: ex ? ex.kolesterol : null,
            asam_urat: ex ? ex.asam_urat : null,
            nama_posyandu: (l as any).posyandu?.nama_posyandu_lansia || (l as any).posyandu?.nama_posyandu || '',
            is_baru: isNew
          };
        });

        // Request 5: Sort by oldest first (DOB ascending)
        reportRows.sort((a, b) => new Date(a.tanggal_lahir).getTime() - new Date(b.tanggal_lahir).getTime());
        // Reassign 'no' index after sorting
        reportRows.forEach((row, i) => {
          row.no = i + 1;
        });

        setData(reportRows);
      }
    } catch (err: any) {
      console.error('Error loading report:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filtersLoading) {
      fetchLaporanData();
    }
  }, [selectedPosyanduId, selectedMonth, selectedYear, activeCategory, filtersLoading]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sasaranFilter, selectedMonth, selectedYear, activeCategory, selectedPosyanduId]);

  // Apply filters in-memory
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // 1. Status Timbang/Periksa Filter
      if (statusFilter !== 'all') {
        const hasMeasurement = activeCategory === 'balita' ? !!row.tanggal_pengukuran : !!row.tanggal_periksa;
        if (statusFilter === 'sudah' && !hasMeasurement) return false;
        if (statusFilter === 'belum' && hasMeasurement) return false;
      }

      // 2. Sasaran Baru/Lama Filter
      if (sasaranFilter !== 'all') {
        if (sasaranFilter === 'baru' && !row.is_baru) return false;
        if (sasaranFilter === 'lama' && row.is_baru) return false;
      }

      return true;
    });
  }, [data, statusFilter, sasaranFilter, activeCategory]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Export to Excel standard Kemenkes
  const handleExportExcel = () => {
    if (filteredData.length === 0) return;
    setExporting(true);

    try {
      const activePosyandu = posyanduList.find(p => p.id === selectedPosyanduId);
      const posyanduName = activePosyandu?.nama_posyandu || 'Semua_Posyandu';
      const monthLabel = monthsList.find(m => m.value === selectedMonth)?.label || '';

      let exportData: any[] = [];

      if (activeCategory === 'balita') {
        // Map rows to final e-PPGBM structure columns
        exportData = filteredData.map((row) => ({
          'No': row.no,
          'Posyandu': row.nama_posyandu,
          // Request 5: Add single quote prefix to prevent automatic scientific notation or formatting change
          'NIK Balita': `'${row.nik}`,
          'Nama Balita': row.nama,
          'Tanggal Lahir': `'${row.tanggal_lahir}`,
          'Jenis Kelamin (L/P)': row.jenis_kelamin,
          'Anak Ke': row.anak_ke,
          'No KK': row.no_kk ? `'${row.no_kk}` : '',
          'NIK Orang Tua': row.nik_ortu ? `'${row.nik_ortu}` : '',
          'Usia Kehamilan Lahir (minggu)': row.usia_kehamilan_lahir || '',
          'Berat Lahir (kg)': row.bb_lahir || '',
          'Tinggi/Panjang Lahir (cm)': row.tb_lahir || '',
          'Lingkar Kepala Lahir (cm)': row.lk_lahir || '',
          'Buku KIA': row.buku_kia ? 'Ya' : 'Tidak',
          'Buku KIA Bayi Kecil': row.buku_kia_bayi_kecil ? 'Ya' : 'Tidak',
          'Mendapat Tatalaksana BBLR': row.tatalaksana_bblr ? 'Ya' : 'Tidak',
          'IMD': row.imd ? 'Ya' : 'Tidak',
          'Nama Orang Tua / Wali': row.nama_ortu || '',
          'No HP Orang Tua': row.no_hp_ortu || '',
          'Alamat': row.alamat,
          'RT': row.rt || '',
          'RW': row.rw || '1',
          'Tanggal Pengukuran': row.tanggal_pengukuran || '',
          'Berat Badan (kg)': row.berat_badan || '',
          'Tinggi Badan (cm)': row.tinggi_badan || '',
          'Cara Pengukuran': row.tinggi_badan ? (row.tinggi_badan < 85 ? 'Telentang' : 'Berdiri') : '',
          'LILA (cm)': row.lingkar_lengan || '',
          'Lingkar Kepala (cm)': row.lingkar_kepala || '',
          'Status Gizi': row.status_bb_u || '',
          // Request 6: Show new toddler label
          'Status Sasaran': row.is_baru ? 'Baru' : 'Lama'
        }));
      } else {
        // Map rows to Lansia structure columns
        exportData = filteredData.map((row) => ({
          'No': row.no,
          'Posyandu': row.nama_posyandu,
          // Request 5: Add single quote prefix
          'NIK Lansia': `'${row.nik}`,
          'Nama Lansia': row.nama,
          'Tanggal Lahir': `'${row.tanggal_lahir}`,
          'Jenis Kelamin (L/P)': row.jenis_kelamin,
          'Alamat': row.alamat,
          'RT': row.rt || '',
          'Tanggal Pemeriksaan': row.tanggal_periksa || '',
          'Tekanan Darah (mmHg)': row.tekanan_darah || '',
          'Gula Darah (mg/dL)': row.gula_darah || '',
          'Kolesterol (mg/dL)': row.kolesterol || '',
          'Asam Urat (mg/dL)': row.asam_urat || '',
          // Request 6: Show new lansia label
          'Status Sasaran': row.is_baru ? 'Baru' : 'Lama'
        }));
      }

      // Generate worksheet & workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-fit column widths
      const maxLens = Object.keys(exportData[0]).map(key => {
        return Math.max(
          key.length,
          ...exportData.map(row => String((row as any)[key] || '').length)
        );
      });
      worksheet['!cols'] = maxLens.map(len => ({ wch: len + 3 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, activeCategory === 'balita' ? 'Laporan e-PPGBM' : 'Laporan Lansia');

      // Trigger download
      const filename = activeCategory === 'balita' 
        ? `Laporan_ePPGBM_${posyanduName.replace(/\s+/g, '_')}_${monthLabel}_${selectedYear}.xlsx`
        : `Laporan_Lansia_${posyanduName.replace(/\s+/g, '_')}_${monthLabel}_${selectedYear}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
    } catch (err: any) {
      alert('Gagal mengekspor laporan: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* FILTER & DOWNLOAD PANEL */}
      <div className="filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Month Select */}
            <select 
              className="header-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Year Select */}
            <select 
              className="header-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            {selectedPosyanduId === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#0f766e' }}>
                <AlertCircle size={14} style={{ color: '#14b8a6' }} />
                <span>Menampilkan laporan gabungan dari semua posyandu.</span>
              </div>
            )}
          </div>

          <div>
            <button 
              onClick={handleExportExcel}
              disabled={exporting || filteredData.length === 0}
              className="btn btn-primary"
            >
              <FileSpreadsheet size={14} />
              <span>{exporting ? 'Mengekspor...' : `Ekspor Laporan ${activeCategory === 'balita' ? 'e-PPGBM' : 'Lansia'}`}</span>
            </button>
          </div>
        </div>

        {/* Toggle Switcher for splitting category & new filters */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="toggle-switch-container" style={{ alignSelf: 'flex-start' }}>
            <button 
              className={`toggle-btn ${activeCategory === 'balita' ? 'active' : ''}`}
              onClick={() => setActiveCategory('balita')}
            >
              Laporan Balita (e-PPGBM)
            </button>
            <button 
              className={`toggle-btn ${activeCategory === 'lansia' ? 'active' : ''}`}
              onClick={() => setActiveCategory('lansia')}
            >
              Laporan Lansia
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select 
              className="header-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="all">Semua Status {activeCategory === 'balita' ? 'Timbang' : 'Periksa'}</option>
              <option value="sudah">Sudah {activeCategory === 'balita' ? 'Ditimbang' : 'Diperiksa'}</option>
              <option value="belum">Belum {activeCategory === 'balita' ? 'Ditimbang' : 'Diperiksa'}</option>
            </select>

            <select 
              className="header-select"
              value={sasaranFilter}
              onChange={(e) => setSasaranFilter(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="all">Semua Sasaran</option>
              <option value="baru">{activeCategory === 'balita' ? 'Balita' : 'Lansia'} Baru</option>
              <option value="lama">{activeCategory === 'balita' ? 'Balita' : 'Lansia'} Lama</option>
            </select>
          </div>
        </div>
      </div>

      {/* REPORT PREVIEW */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Menyusun data laporan...
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Tidak ada data {activeCategory === 'balita' ? 'balita' : 'lansia'} terdaftar di posyandu ini.
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Tidak ada data {activeCategory === 'balita' ? 'balita' : 'lansia'} yang cocok dengan filter yang dipilih.
        </div>
      ) : (
        <div className="table-container">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#1e293b' }}>
              Pratinjau Data Laporan Bulanan ({activeCategory === 'balita' ? 'e-PPGBM' : 'Kesehatan Lansia'})
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {activeCategory === 'balita' ? (
                <>
                  {data.filter(d => d.tanggal_pengukuran).length} dari {data.length} balita telah ditimbang bulan ini ({data.filter(d => d.is_baru).length} balita baru)
                </>
              ) : (
                <>
                  {data.filter(d => d.tanggal_periksa).length} dari {data.length} lansia telah diperiksa bulan ini ({data.filter(d => d.is_baru).length} lansia baru)
                </>
              )}
            </span>
          </div>
          <table className="custom-table">
            <thead>
              {activeCategory === 'balita' ? (
                <tr>
                  <th>No</th>
                  <th>Nama Balita</th>
                  <th>NIK</th>
                  <th>JK</th>
                  {selectedPosyanduId === 'all' && <th>Posyandu</th>}
                  <th>Tanggal Ukur</th>
                  <th>Berat (kg)</th>
                  <th>Tinggi (cm)</th>
                  <th>LILA (cm)</th>
                  <th>Status Timbang</th>
                </tr>
              ) : (
                <tr>
                  <th>No</th>
                  <th>Nama Lansia</th>
                  <th>NIK</th>
                  <th>JK</th>
                  {selectedPosyanduId === 'all' && <th>Posyandu</th>}
                  <th>Tanggal Periksa</th>
                  <th>Tekanan Darah</th>
                  <th>Gula Darah</th>
                  <th>Kolesterol</th>
                  <th>Asam Urat</th>
                  <th>Status Periksa</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeCategory === 'balita' ? (
                paginatedData.map((row) => (
                  <tr key={row.no}>
                    <td>{row.no}</td>
                    <td style={{ fontWeight: 500, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {row.nama}
                        {row.is_baru && (
                          <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px' }}>
                            Baru
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.nik}</td>
                    <td>{row.jenis_kelamin}</td>
                    {selectedPosyanduId === 'all' && <td style={{ fontWeight: 500, color: '#0d9488' }}>{row.nama_posyandu}</td>}
                    <td>{row.tanggal_pengukuran ? new Date(row.tanggal_pengukuran).toLocaleDateString('id-ID') : '-'}</td>
                    <td>{row.berat_badan || '-'}</td>
                    <td>{row.tinggi_badan || '-'}</td>
                    <td>{row.lingkar_lengan || '-'}</td>
                    <td>
                      {row.tanggal_pengukuran ? (
                        <span className="badge badge-success">Sudah Ditimbang</span>
                      ) : (
                        <span className="badge badge-danger">Belum Ditimbang</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.no}>
                    <td>{row.no}</td>
                    <td style={{ fontWeight: 500, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {row.nama}
                        {row.is_baru && (
                          <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px' }}>
                            Baru
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.nik}</td>
                    <td>{row.jenis_kelamin}</td>
                    {selectedPosyanduId === 'all' && <td style={{ fontWeight: 500, color: '#0d9488' }}>{row.nama_posyandu}</td>}
                    <td>{row.tanggal_periksa ? new Date(row.tanggal_periksa).toLocaleDateString('id-ID') : '-'}</td>
                    <td>{row.tekanan_darah || '-'}</td>
                    <td>{row.gula_darah ? `${row.gula_darah} mg/dL` : '-'}</td>
                    <td>{row.kolesterol ? `${row.kolesterol} mg/dL` : '-'}</td>
                    <td>{row.asam_urat ? `${row.asam_urat} mg/dL` : '-'}</td>
                    <td>
                      {row.tanggal_periksa ? (
                        <span className="badge badge-success">Sudah Diperiksa</span>
                      ) : (
                        <span className="badge badge-danger">Belum Diperiksa</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="pagination-container" style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Menampilkan {startIndex + 1}–{endIndex} dari {filteredData.length} baris sasaran (Total: {data.length} sasaran)
            </span>
            {totalPages > 1 && (
              <div className="pagination-pages" style={{ display: 'flex', gap: '4px' }}>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

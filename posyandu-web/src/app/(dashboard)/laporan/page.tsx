'use client';

import React, { useState, useEffect } from 'react';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import { FileSpreadsheet, Download, RefreshCw, AlertCircle } from 'lucide-react';
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
}

export default function LaporanPage() {
  const { selectedDesa, selectedPosyanduId, posyanduList, loading: filtersLoading } = useFilters();
  
  // States
  const [data, setData] = useState<LaporanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('5'); // Mei (1-indexed)
  const [selectedYear, setSelectedYear] = useState('2026');
  const [exporting, setExporting] = useState(false);

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

      // 1. Fetch balitas in target Posyandus
      const { data: allBalitas, error: bErr } = await supabase
        .from('balitas')
        .select('*, posyandu:posyandus(nama_posyandu, nama_posyandu_balita)')
        .in('posyandu_id', targetPosyanduIds)
        .order('nama', { ascending: true });

      if (bErr) throw bErr;

      if (!allBalitas || allBalitas.length === 0) {
        setData([]);
        return;
      }

      // Filter to keep only active balitas (< 60 months old at the selected month/year)
      const balitas = allBalitas.filter(b => {
        const dob = new Date(b.tanggal_lahir);
        const refDate = new Date(yearNum, monthNum - 1, 1);
        let months = (refDate.getFullYear() - dob.getFullYear()) * 12;
        months -= dob.getMonth();
        months += refDate.getMonth();
        const age = months <= 0 ? 0 : months;
        return age < 60;
      });

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

      // Group measurements by balita_id
      const weighMap = new Map<string, any>();
      (weighings || []).forEach(w => {
        if (!weighMap.has(w.balita_id) || w.tanggal > weighMap.get(w.balita_id).tanggal) {
          weighMap.set(w.balita_id, w);
        }
      });

      // 3. Map into report structure
      const reportRows = balitas.map((b, index) => {
        const w = weighMap.get(b.id);
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
          tanggal_pengukuran: w ? w.tanggal : null,
          berat_badan: w ? w.berat_badan : null,
          tinggi_badan: w ? w.tinggi_badan : null,
          lingkar_lengan: w ? w.lingkar_lengan : null,
          lingkar_kepala: w ? w.lingkar_kepala : null,
          status_bb_u: w ? w.status_bb_u : null,
          nama_posyandu: (b as any).posyandu?.nama_posyandu_balita || (b as any).posyandu?.nama_posyandu || ''
        };
      });

      setData(reportRows);
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
  }, [selectedPosyanduId, selectedMonth, selectedYear, filtersLoading]);

  // Export to Excel standard Kemenkes
  const handleExportExcel = () => {
    if (data.length === 0) return;
    setExporting(true);

    try {
      const activePosyandu = posyanduList.find(p => p.id === selectedPosyanduId);
      const posyanduName = activePosyandu?.nama_posyandu || 'Semua_Posyandu';
      const monthLabel = monthsList.find(m => m.value === selectedMonth)?.label || '';

      // Map rows to final e-PPGBM structure columns
      const exportData = data.map((row) => ({
        'No': row.no,
        'Posyandu': row.nama_posyandu,
        'NIK Balita': row.nik,
        'Nama Balita': row.nama,
        'Tanggal Lahir': row.tanggal_lahir,
        'Jenis Kelamin (L/P)': row.jenis_kelamin,
        'Anak Ke': row.anak_ke,
        'Berat Lahir (kg)': row.bb_lahir || '',
        'Tinggi/Panjang Lahir (cm)': row.tb_lahir || '',
        'Nama Orang Tua / Wali': row.nama_ortu || '',
        'No HP Orang Tua': row.no_hp_ortu || '',
        'Alamat': row.alamat,
        'RT': row.rt || '',
        'RW': 1,
        'Tanggal Pengukuran': row.tanggal_pengukuran || '',
        'Berat Badan (kg)': row.berat_badan || '',
        'Tinggi Badan (cm)': row.tinggi_badan || '',
        'Cara Pengukuran': row.tinggi_badan ? (row.tinggi_badan < 85 ? 'Telentang' : 'Berdiri') : '',
        'LILA (cm)': row.lingkar_lengan || '',
        'Lingkar Kepala (cm)': row.lingkar_kepala || '',
        'Status Gizi': row.status_bb_u || ''
      }));

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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan e-PPGBM');

      // Trigger download
      const filename = `Laporan_ePPGBM_${posyanduName.replace(/\s+/g, '_')}_${monthLabel}_${selectedYear}.xlsx`;
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
      <div className="filter-bar">
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
            disabled={exporting || data.length === 0}
            className="btn btn-primary"
          >
            <FileSpreadsheet size={14} />
            <span>{exporting ? 'Mengekspor...' : 'Ekspor Laporan e-PPGBM'}</span>
          </button>
        </div>
      </div>

      {/* REPORT PREVIEW */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Menyusun data laporan...
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Tidak ada data balita terdaftar di posyandu ini.
        </div>
      ) : (
        <div className="table-container">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#1e293b' }}>
              Pratinjau Data Laporan Bulanan (e-PPGBM)
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {data.filter(d => d.tanggal_pengukuran).length} dari {data.length} balita telah ditimbang bulan ini
            </span>
          </div>
          <table className="custom-table">
            <thead>
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
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.no}>
                  <td>{row.no}</td>
                  <td style={{ fontWeight: 500, color: '#1e293b' }}>{row.nama}</td>
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
              ))}
            </tbody>
          </table>
          <div className="pagination-container">
            <span>Menampilkan total {data.length} baris sasaran</span>
          </div>
        </div>
      )}
    </div>
  );
}

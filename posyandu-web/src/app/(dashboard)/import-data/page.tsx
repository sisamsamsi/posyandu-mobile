'use client';

import React, { useState, useEffect } from 'react';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import { maskNik } from '@/lib/utils';
import { Upload, FileSpreadsheet, ArrowLeft, ArrowRight, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportDataPage() {
  const { posyanduList } = useFilters();
  
  // Stepper state: 1 (Upload), 2 (Mapping), 3 (Preview), 4 (Done)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [posyanduId, setPosyanduId] = useState('');
  
  // Import type (balita or lansia)
  const [importType, setImportType] = useState<'balita' | 'lansia'>('balita');

  // Load type parameter from URL search query on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      if (type === 'lansia' || type === 'balita') {
        setImportType(type);
      }
    }
  }, []);

  // Helper: nama segmen sesuai tipe
  const getSegmentName = (p: { nama_posyandu: string; nama_posyandu_balita?: string | null; nama_posyandu_lansia?: string | null; kelurahan?: string | null }) => {
    const segName = importType === 'balita'
      ? (p.nama_posyandu_balita || p.nama_posyandu)
      : (p.nama_posyandu_lansia || p.nama_posyandu);
    return `${segName} (Desa ${p.kelurahan || '-'})`;
  };
  
  // File parsing states
  const [file, setFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  
  // Mapping state: key is Excel header, value is DB field
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [sampleData, setSampleData] = useState<Record<string, any>>({});
  
  // Preview / Final stats states
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [stats, setStats] = useState({ inserted: 0, skipped: 0, errors: [] as string[] });

  const dbFieldsBalita = [
    { label: 'Lewati Kolom', value: 'skip' },
    { label: 'NIK (16 Digit)', value: 'nik' },
    { label: 'Nama Balita', value: 'nama' },
    { label: 'Tanggal Lahir', value: 'tanggal_lahir' },
    { label: 'Jenis Kelamin', value: 'jenis_kelamin' },
    { label: 'Nama Orang Tua / Wali', value: 'nama_ortu' },
    { label: 'No HP Orang Tua', value: 'no_hp_ortu' },
    { label: 'Alamat Domisili', value: 'alamat' },
    { label: 'RT', value: 'rt' },
    { label: 'Berat Lahir (kg)', value: 'bb_lahir' },
    { label: 'Tinggi Lahir (cm)', value: 'tb_lahir' },
    { label: 'Anak Ke', value: 'anak_ke' }
  ];

  const dbFieldsLansia = [
    { label: 'Lewati Kolom', value: 'skip' },
    { label: 'NIK (16 Digit)', value: 'nik' },
    { label: 'Nama Lansia', value: 'nama' },
    { label: 'Tanggal Lahir', value: 'tanggal_lahir' },
    { label: 'Jenis Kelamin', value: 'jenis_kelamin' },
    { label: 'Alamat Domisili', value: 'alamat' },
    { label: 'RT', value: 'rt' },
    { label: 'Penyakit Bawaan', value: 'penyakit_bawaan' },
  ];

  const dbFields = importType === 'balita' ? dbFieldsBalita : dbFieldsLansia;

  // Helper: bersihkan dan normalisasi nilai tanggal dari Excel
  // Menangani: spasi trailing, format DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, dan Excel serial number
  const cleanDate = (val: any): string | null => {
    if (val === null || val === undefined || val === '') return null;
    // Excel serial number (angka)
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (!str) return null;
    // YYYY-MM-DD (sudah benar)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    // Fallback: coba parse biasa
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return null;
  };

  // 1. Handle File Select & Load Headers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse raw JSON
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
        setExcelRows(rows);

        if (rows.length > 0) {
          // Get unique headers
          const headers = Object.keys(rows[0]);
          setExcelHeaders(headers);
          
          // Store first row as sample data
          setSampleData(rows[0]);
        }
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format file benar.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // 2. Call AI Matcher API
  const handleRunAIMatcher = async () => {
    if (!file || excelHeaders.length === 0) {
      alert('Pilih file Excel terlebih dahulu.');
      return;
    }
    if (!posyanduId) {
      alert(`Pilih unit Posyandu tujuan impor ${importType === 'balita' ? 'balita' : 'lansia'}.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: excelHeaders })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Store returned mappings
      const initialMappings: Record<string, string> = {};
      excelHeaders.forEach(h => {
        initialMappings[h] = data.mappings?.[h] || 'skip';
      });
      setMappings(initialMappings);

      // Move to mapping step
      setStep(2);
    } catch (err: any) {
      // Fallback mapping if AI fails
      const fallback: Record<string, string> = {};
      excelHeaders.forEach(h => {
        const clean = h.toLowerCase().replace(/[^a-z]/g, '');
        if (clean.includes('nik') || clean.includes('ktp')) fallback[h] = 'nik';
        else if (clean.includes('nama') || clean.includes('anak')) fallback[h] = 'nama';
        else if (clean.includes('lahir') || clean.includes('tgl')) fallback[h] = 'tanggal_lahir';
        else if (clean.includes('jk') || clean.includes('kelamin') || clean.includes('sex')) fallback[h] = 'jenis_kelamin';
        else if (clean.includes('ibu') || clean.includes('ayah') || clean.includes('ortu') || clean.includes('orangtua') || clean.includes('wali')) fallback[h] = 'nama_ortu';
        else if (clean.includes('alamat')) fallback[h] = 'alamat';
        else if (clean.includes('rt')) fallback[h] = 'rt';
        else fallback[h] = 'skip';
      });
      setMappings(fallback);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // 3. Process Mapped Data & Generate Preview
  const handleGeneratePreview = () => {
    const parsed = excelRows.map((row) => {
      const item: any = { posyandu_id: posyanduId };
      
      // Map row columns to standard fields
      Object.entries(mappings).forEach(([excelHeader, dbField]) => {
        if (dbField !== 'skip') {
          let val = row[excelHeader];
          // Simple cleanups
          if (dbField === 'nik') val = String(val || '').trim().replace(/[^0-9]/g, '');
          if (dbField === 'jenis_kelamin') {
            const s = String(val || '').toLowerCase();
            val = s.startsWith('l') || s === '1' ? 'Laki-laki' : 'Perempuan';
          }
          item[dbField] = val;
        }
      });
      
      return item;
    });

    setParsedData(parsed);
    setStep(3);
  };

  // 4. Submit Bulk Insert to Supabase (Optimized to avoid N+1 query problem)
  const handleSaveData = async () => {
    setLoading(true);
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    const table = importType === 'balita' ? 'balitas' : 'lansias';

    try {
      // 1. Filter out invalid NIKs
      const validItemsToProcess = [];
      for (const item of parsedData) {
        if (!item.nik || item.nik.length !== 16 || isNaN(Number(item.nik))) {
          errors.push(`NIK tidak valid (harus 16 digit angka) untuk: ${item.nama || 'Tanpa Nama'}`);
          skipped++;
        } else {
          validItemsToProcess.push(item);
        }
      }

      if (validItemsToProcess.length > 0) {
        // 2. Fetch all existing NIKs in bulk (1 query)
        const nikList = validItemsToProcess.map(item => item.nik);
        const { data: existingRecords, error: fetchErr } = await supabase
          .from(table)
          .select('nik')
          .in('nik', nikList);

        if (fetchErr) throw fetchErr;

        const existingNiks = new Set((existingRecords || []).map(r => r.nik));

        // 3. Separate new records vs skipped (duplicates)
        const itemsToInsert = [];
        for (const item of validItemsToProcess) {
          if (existingNiks.has(item.nik)) {
            skipped++;
          } else {
            if (importType === 'balita') {
              const tglLahir = cleanDate(item.tanggal_lahir);
              if (!tglLahir) {
                errors.push(`Tanggal lahir tidak valid untuk: ${item.nama || 'Tanpa Nama'} (nilai: "${item.tanggal_lahir}")`);
                skipped++;
                continue;
              }
              itemsToInsert.push({
                posyandu_id: item.posyandu_id,
                nik: item.nik,
                nama: String(item.nama || 'Tanpa Nama').trim(),
                tanggal_lahir: tglLahir,
                jenis_kelamin: item.jenis_kelamin,
                nama_ortu: String(item.nama_ortu || 'Ortu').trim(),
                no_hp_ortu: item.no_hp_ortu ? String(item.no_hp_ortu).trim() : null,
                alamat: String(item.alamat || 'Alamat tidak diisi').trim(),
                rt: parseInt(item.rt) || 1,
                bb_lahir: item.bb_lahir ? parseFloat(String(item.bb_lahir).replace(',', '.')) : null,
                tb_lahir: item.tb_lahir ? parseFloat(String(item.tb_lahir).replace(',', '.')) : null,
                anak_ke: parseInt(item.anak_ke) || 1,
                created_at: `${tglLahir}T00:00:00Z` // Gunakan tanggal lahir sebagai created_at agar tidak dianggap pendaftaran baru hari ini
              });
            } else {
              const tglLahir = cleanDate(item.tanggal_lahir);
              if (!tglLahir) {
                errors.push(`Tanggal lahir tidak valid untuk: ${item.nama || 'Tanpa Nama'} (nilai: "${item.tanggal_lahir}")`);
                skipped++;
                continue;
              }
              itemsToInsert.push({
                posyandu_id: item.posyandu_id,
                nik: item.nik,
                nama: String(item.nama || 'Tanpa Nama').trim(),
                tanggal_lahir: tglLahir,
                jenis_kelamin: item.jenis_kelamin,
                alamat: item.alamat ? String(item.alamat).trim() : null,
                rt: item.rt ? parseInt(item.rt) : null,
                penyakit_bawaan: item.penyakit_bawaan
                  ? String(item.penyakit_bawaan).split(',').map((s: string) => s.trim()).filter(Boolean)
                  : [],
                created_at: `${tglLahir}T00:00:00Z` // Gunakan tanggal lahir sebagai created_at agar tidak dianggap pendaftaran baru hari ini
              });
            }
          }
        }

        // 4. Bulk Insert
        if (itemsToInsert.length > 0) {
          const { data: insertedData, error: insErr } = await supabase
            .from(table)
            .insert(itemsToInsert)
            .select('id');

          if (insErr) {
            errors.push(`Gagal menyimpan data bulk ${importType}: ${insErr.message}`);
            skipped += itemsToInsert.length;
          } else if (insertedData && insertedData.length > 0) {
            inserted += insertedData.length;

            // 5. Create imunisasi placeholders for balita only
            if (importType === 'balita') {
              const immunizationPayloads = insertedData.map(b => ({ balita_id: b.id }));
              const { error: imErr } = await supabase
                .from('imunisasi')
                .insert(immunizationPayloads);

              if (imErr) {
                errors.push(`Gagal membuat data imunisasi bulk: ${imErr.message}`);
              }
            }
          }
        }
      }

      setStats({ inserted, skipped, errors });
      setStep(4);
    } catch (err: any) {
      alert('Terjadi kesalahan saat menyimpan data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      {/* STEPPER HEADER */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '12px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 1 ? 1 : 0.4 }}>
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: step >= 1 ? '#14B8A6' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>1</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: step >= 1 ? '#1e293b' : '#64748b' }}>Upload File</span>
        </div>
        <ArrowRight size={12} style={{ color: '#cbd5e1' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 2 ? 1 : 0.4 }}>
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: step >= 2 ? '#14B8A6' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>2</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: step >= 2 ? '#1e293b' : '#64748b' }}>Pemetaan Kolom</span>
        </div>
        <ArrowRight size={12} style={{ color: '#cbd5e1' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 3 ? 1 : 0.4 }}>
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: step >= 3 ? '#14B8A6' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>3</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: step >= 3 ? '#1e293b' : '#64748b' }}>Preview Data</span>
        </div>
        <ArrowRight size={12} style={{ color: '#cbd5e1' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 4 ? 1 : 0.4 }}>
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: step >= 4 ? '#14B8A6' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>4</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: step >= 4 ? '#1e293b' : '#64748b' }}>Selesai</span>
        </div>
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {step === 1 && (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#f0fdfa',
                color: '#14B8A6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #ccfbf1',
                marginBottom: '8px'
              }}
            >
              <Upload size={28} />
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              {importType === 'balita' ? 'Impor Data Balita e-PPGBM' : 'Impor Data Lansia'}
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', maxWidth: '400px', margin: '0 auto 4px auto' }}>
              {importType === 'balita'
                ? 'Pilihlah unit Posyandu tujuan dan unggah file Excel (.xlsx) data awal balita Anda untuk disinkronisasikan ke handphone Kader.'
                : 'Pilihlah unit Posyandu tujuan dan unggah file Excel (.xlsx) data lansia untuk disinkronisasikan ke database.'}
            </p>

            {/* Import Type Switcher */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '4px', gap: '2px', marginBottom: '4px' }}>
              <button
                onClick={() => { setImportType('balita'); setFile(null); setExcelHeaders([]); setExcelRows([]); setMappings({}); }}
                style={{
                  padding: '7px 20px',
                  borderRadius: '9px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  backgroundColor: importType === 'balita' ? '#14B8A6' : 'transparent',
                  color: importType === 'balita' ? '#fff' : '#64748b',
                  boxShadow: importType === 'balita' ? '0 2px 6px rgba(20,184,166,0.3)' : 'none',
                }}
              >
                Balita
              </button>
              <button
                onClick={() => { setImportType('lansia'); setFile(null); setExcelHeaders([]); setExcelRows([]); setMappings({}); }}
                style={{
                  padding: '7px 20px',
                  borderRadius: '9px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  backgroundColor: importType === 'lansia' ? '#6366F1' : 'transparent',
                  color: importType === 'lansia' ? '#fff' : '#64748b',
                  boxShadow: importType === 'lansia' ? '0 2px 6px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                Lansia
              </button>
            </div>

            {/* Select posyandu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', width: '300px', margin: '0 auto' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                {importType === 'balita' ? 'Unit Posyandu Balita Tujuan Impor' : 'Unit Posyandu Lansia Tujuan Impor'}
              </label>
              <select 
                className="header-select"
                value={posyanduId}
                onChange={(e) => setPosyanduId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '12px' }}
              >
                <option value="">Pilih Unit Posyandu...</option>
                {posyanduList.map(p => (
                  <option key={p.id} value={p.id}>{getSegmentName(p)}</option>
                ))}
              </select>
              {posyanduId && (() => {
                const sel = posyanduList.find(p => p.id === posyanduId);
                if (!sel) return null;
                const hasSegment = importType === 'balita'
                  ? sel.nama_posyandu_balita
                  : sel.nama_posyandu_lansia;
                if (!hasSegment) return (
                  <span style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>
                    ⚠️ Posyandu ini belum memiliki nama segmen {importType} khusus, menggunakan nama ILP utama.
                  </span>
                );
                return null;
              })()}
            </div>

            {/* Input file button */}
            <div style={{ marginTop: '12px' }}>
              <input 
                type="file" 
                accept=".xlsx, .xls"
                id="excel-upload"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="excel-upload"
                className="btn btn-secondary"
                style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '12px' }}
              >
                <FileSpreadsheet size={16} />
                <span>{file ? file.name : 'Pilih File Excel'}</span>
              </label>
            </div>

            {/* Submit button */}
            <button 
              onClick={handleRunAIMatcher}
              disabled={loading || !file || !posyanduId}
              className="btn btn-primary"
              style={{ marginTop: '24px', width: '200px', borderRadius: '12px', backgroundColor: importType === 'lansia' ? '#6366F1' : undefined, borderColor: importType === 'lansia' ? '#6366F1' : undefined }}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>AI Menganalisis...</span>
                </>
              ) : (
                <>
                  <span>Analisis Pemetaan AI</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PEMETAAN KOLOM */}
      {step === 2 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
              Pemetaan Kolom dengan AI
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              AI telah memetakan kolom di file Anda ke field database <strong>{importType === 'balita' ? 'Balita' : 'Lansia'}</strong>. Silakan periksa dan sesuaikan jika diperlukan.
            </p>
          </div>

          <div className="table-container" style={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Kolom di File Anda</th>
                  <th>Pemetaan ke Kolom SIMPUL SEHAT</th>
                  <th>Contoh Data</th>
                </tr>
              </thead>
              <tbody>
                {excelHeaders.map((header) => (
                  <tr key={header}>
                    <td style={{ fontWeight: 600 }}>{header}</td>
                    <td>
                      <select
                        className="header-select"
                        value={mappings[header] || 'skip'}
                        onChange={(e) => setMappings({ ...mappings, [header]: e.target.value })}
                        style={{ width: '180px', padding: '4px 8px' }}
                      >
                        {dbFields.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>
                      {sampleData[header] ? String(sampleData[header]).slice(0, 30) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={() => setStep(1)} className="btn btn-secondary">
              Kembali
            </button>
            <button onClick={handleGeneratePreview} className="btn btn-primary">
              <span>Lanjutkan Preview</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW DATA */}
      {step === 3 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
              Preview Baris Data Impor
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Menampilkan 10 baris pertama dari {parsedData.length} data yang terurai. NIK ganda akan otomatis dilewati untuk mencegah kerusakan database.
            </p>
          </div>

          <div className="table-container" style={{ border: '1px solid #e2e8f0', boxShadow: 'none', marginBottom: '20px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>NIK (16 Digit)</th>
                  <th>Tanggal Lahir</th>
                  <th>JK</th>
                  <th>Nama Orang Tua/Wali</th>
                  <th>Alamat</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.nama || '-'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{maskNik(row.nik)}</td>
                    <td>{row.tanggal_lahir || '-'}</td>
                    <td>{row.jenis_kelamin || '-'}</td>
                    <td>{row.nama_ortu || 'Ortu'}</td>
                    <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.alamat || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} className="btn btn-secondary">
              Kembali
            </button>
            <button onClick={handleSaveData} disabled={loading} className="btn btn-primary">
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Simpan Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SELESAI */}
      {step === 4 && (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #dcfce7',
                marginBottom: '8px'
              }}
            >
              <Check size={28} />
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Impor Data Selesai
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              Proses sinkronisasi data e-PPGBM ke database Supabase berhasil diselesaikan.
            </p>

            {/* Impor Stats */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                width: '320px',
                backgroundColor: '#f8fafc',
                padding: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                marginTop: '16px',
                textAlign: 'left'
              }}
            >
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>BERHASIL DISINKRON:</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>{stats.inserted} {importType === 'balita' ? 'Balita' : 'Lansia'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>DILEWATI (NIK DUPLIKAT):</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ea580c' }}>{stats.skipped} Baris</span>
              </div>
            </div>

            {/* Errors alert if any */}
            {stats.errors.length > 0 && (
              <div 
                style={{
                  width: '320px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #ffe4e6',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '10px',
                  color: '#b91c1c',
                  textAlign: 'left',
                  marginTop: '12px'
                }}
              >
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <AlertTriangle size={12} />
                  <span>Kesalahan Impor:</span>
                </div>
                {stats.errors.map((err, i) => <div key={i}>- {err}</div>)}
              </div>
            )}

            <button 
              onClick={() => {
                setFile(null);
                setExcelHeaders([]);
                setExcelRows([]);
                setMappings({});
                setStep(1);
              }}
              className="btn btn-secondary"
              style={{ marginTop: '24px', borderRadius: '12px' }}
            >
              Impor File Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

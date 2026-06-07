'use client';

import React, { useState } from 'react';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import { Upload, FileSpreadsheet, ArrowLeft, ArrowRight, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportDataPage() {
  const { posyanduList } = useFilters();
  
  // Stepper state: 1 (Upload), 2 (Mapping), 3 (Preview), 4 (Done)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [posyanduId, setPosyanduId] = useState('');
  
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

  const dbFields = [
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
      alert('Pilih unit Posyandu tujuan impor.');
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

  // 4. Submit Bulk Insert to Supabase
  const handleSaveData = async () => {
    setLoading(true);
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      // Loop through data and check/insert
      for (const item of parsedData) {
        if (!item.nik || item.nik.length !== 16) {
          errors.push(`NIK tidak valid (harus 16 digit) untuk: ${item.nama || 'Tanpa Nama'}`);
          skipped++;
          continue;
        }

        // Check duplicate
        const { data: existing } = await supabase
          .from('balitas')
          .select('id')
          .eq('nik', item.nik)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Insert Toddler
        const { data: insertedBalita, error: insErr } = await supabase
          .from('balitas')
          .insert([{
            posyandu_id: item.posyandu_id,
            nik: item.nik,
            nama: item.nama || 'Tanpa Nama',
            tanggal_lahir: item.tanggal_lahir,
            jenis_kelamin: item.jenis_kelamin,
            nama_ortu: item.nama_ortu || 'Ortu',
            no_hp_ortu: item.no_hp_ortu || null,
            alamat: item.alamat || 'Alamat tidak diisi',
            rt: parseInt(item.rt) || 1,
            bb_lahir: item.bb_lahir ? parseFloat(item.bb_lahir) : null,
            tb_lahir: item.tb_lahir ? parseFloat(item.tb_lahir) : null,
            anak_ke: parseInt(item.anak_ke) || 1
          }])
          .select('id')
          .single();

        if (insErr) {
          errors.push(`Gagal menyimpan ${item.nama || 'Row'}: ${insErr.message}`);
          skipped++;
        } else {
          // Auto create immunization record
          await supabase.from('imunisasi').insert([{ balita_id: insertedBalita.id }]);
          inserted++;
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
              Impor Data Balita e-PPGBM
            </h3>
            <p style={{ fontSize: '11px', color: '#64748b', maxWidth: '400px', margin: '0 auto 12px auto' }}>
              Pilihlah unit Posyandu tujuan dan unggah file Excel (.xlsx) data awal balita Anda untuk disinkronisasikan ke handphone Kader.
            </p>

            {/* Select posyandu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', width: '280px', margin: '0 auto' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Unit Posyandu Tujuan Impor</label>
              <select 
                className="header-select"
                value={posyanduId}
                onChange={(e) => setPosyanduId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '12px' }}
              >
                <option value="">Pilih Posyandu Balita...</option>
                {posyanduList.filter(p => p.tipe_posyandu === 'balita').map(p => (
                  <option key={p.id} value={p.id}>{p.nama_posyandu} (Desa {p.kelurahan})</option>
                ))}
              </select>
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
              style={{ marginTop: '24px', width: '180px', borderRadius: '12px' }}
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
              AI telah memetakan kolom di file Anda. Silakan periksa dan sesuaikan jika diperlukan.
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
                    <td style={{ fontFamily: 'monospace' }}>{row.nik || '-'}</td>
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
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>{stats.inserted} Balita</span>
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

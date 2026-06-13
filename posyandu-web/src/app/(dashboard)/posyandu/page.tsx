'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Plus, RefreshCw, Key, Check, Edit2, Trash2, MapPin, Calendar, Clock, Baby, Users, Printer } from 'lucide-react';
import { useFilters } from '@/context/FilterContext';

interface Posyandu {
  id: string;
  nama_posyandu: string;
  tipe_posyandu: string;
  alamat_lengkap: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  invite_code: string | null;
  created_at: string;
  // Sub-division settings
  nama_posyandu_balita: string | null;
  alamat_posyandu_balita: string | null;
  nama_posyandu_lansia: string | null;
  alamat_posyandu_lansia: string | null;
  jadwal_balita_tanggal: number | null;
  jadwal_balita_jam: string | null;
  jadwal_lansia_tanggal: number | null;
  jadwal_lansia_jam: string | null;
}

export default function PosyanduPage() {
  const { loading: filtersLoading } = useFilters();
  const [posyandus, setPosyandus] = useState<Posyandu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [userPuskesmasId, setUserPuskesmasId] = useState<string | null>(null);
  const [wilayahList, setWilayahList] = useState<string[]>([]);
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>('all');

  // Get unique kelurahans from all posyandus to use as fallback options
  const uniqueKelurahans = React.useMemo(() => {
    return Array.from(new Set(posyandus.map(p => p.kelurahan).filter(Boolean))) as string[];
  }, [posyandus]);

  const kelurahanOptions = wilayahList.length > 0 ? wilayahList : uniqueKelurahans;

  const filteredPosyandus = React.useMemo(() => {
    return selectedKelurahan === 'all' ? posyandus : posyandus.filter(p => p.kelurahan === selectedKelurahan);
  }, [posyandus, selectedKelurahan]);

  // Fetch logged-in user's puskesmas_id and wilayah_binaan
  useEffect(() => {
    async function loadUserPuskesmasId() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from('user_roles')
            .select(`
              puskesmas_id,
              puskesmas:puskesmas(wilayah_binaan)
            `)
            .eq('user_id', session.user.id)
            .single() as any;
          
          if (data?.puskesmas_id) {
            setUserPuskesmasId(data.puskesmas_id);
            const p = (Array.isArray(data.puskesmas) ? data.puskesmas[0] : data.puskesmas) as any;
            if (p?.wilayah_binaan) {
              const list = p.wilayah_binaan
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
              setWilayahList(list);
            }
          }
        }
      } catch (err) {
        console.error('Gagal mengambil puskesmas_id pengguna:', err);
      }
    }
    loadUserPuskesmasId();
  }, []);

  // Form States (Main)
  const [namaPosyandu, setNamaPosyandu] = useState('');
  const [alamat, setAlamat] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [kecamatan, setKecamatan] = useState('Pakualaman');
  const [generatedCode, setGeneratedCode] = useState('');

  // Form States (Balita Sub-Posyandu)
  const [namaPosyanduBalita, setNamaPosyanduBalita] = useState('');
  const [alamatBalita, setAlamatBalita] = useState('');
  const [jadwalBalitaTanggal, setJadwalBalitaTanggal] = useState<number | ''>('');
  const [jadwalBalitaJam, setJadwalBalitaJam] = useState('08:00');

  // Form States (Lansia Sub-Posyandu)
  const [namaPosyanduLansia, setNamaPosyanduLansia] = useState('');
  const [alamatLansia, setAlamatLansia] = useState('');
  const [jadwalLansiaTanggal, setJadwalLansiaTanggal] = useState<number | ''>('');
  const [jadwalLansiaJam, setJadwalLansiaJam] = useState('09:00');

  // Helper helper to handle Main Name change and auto-populate sub-posyandu names
  const handleNamaPosyanduChange = (val: string) => {
    setNamaPosyandu(val);
    
    // Auto-fill Balita name if it hasn't been modified or is empty
    if (!namaPosyanduBalita || namaPosyanduBalita === `Posyandu Balita ${namaPosyandu}`) {
      setNamaPosyanduBalita(val ? `Posyandu Balita ${val}` : '');
    }
    
    // Auto-fill Lansia name if it hasn't been modified or is empty
    if (!namaPosyanduLansia || namaPosyanduLansia === `Posyandu Lansia ${namaPosyandu}`) {
      setNamaPosyanduLansia(val ? `Posyandu Lansia ${val}` : '');
    }
  };

  // Fetch Posyandus from Supabase
  const fetchPosyandus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posyandus')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosyandus((data as Posyandu[]) || []);
    } catch (err: any) {
      console.error('Error fetching posyandus:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filtersLoading) {
      fetchPosyandus();
    }
  }, [filtersLoading]);

  // Generate a random 6-character alphanumeric code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleOpenModal = () => {
    setEditId(null);
    setNamaPosyandu('');
    setAlamat('');
    setKelurahan('');
    setKecamatan('Pakualaman');
    setGeneratedCode(generateCode());

    // Clear sub-posyandu fields
    setNamaPosyanduBalita('');
    setAlamatBalita('');
    setJadwalBalitaTanggal('');
    setJadwalBalitaJam('08:00');

    setNamaPosyanduLansia('');
    setAlamatLansia('');
    setJadwalLansiaTanggal('');
    setJadwalLansiaJam('09:00');

    setShowModal(true);
  };

  const handleOpenEditModal = (p: Posyandu) => {
    setEditId(p.id);
    setNamaPosyandu(p.nama_posyandu || '');
    setAlamat(p.alamat_lengkap || '');
    setKelurahan(p.kelurahan || '');
    setKecamatan(p.kecamatan || '');
    setGeneratedCode(p.invite_code || '');

    // Set sub-posyandu fields from DB
    setNamaPosyanduBalita(p.nama_posyandu_balita || '');
    setAlamatBalita(p.alamat_posyandu_balita || '');
    setJadwalBalitaTanggal(p.jadwal_balita_tanggal || '');
    setJadwalBalitaJam(p.jadwal_balita_jam || '08:00');

    setNamaPosyanduLansia(p.nama_posyandu_lansia || '');
    setAlamatLansia(p.alamat_posyandu_lansia || '');
    setJadwalLansiaTanggal(p.jadwal_lansia_tanggal || '');
    setJadwalLansiaJam(p.jadwal_lansia_jam || '09:00');

    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus unit Posyandu "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        const { error } = await supabase
          .from('posyandus')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        fetchPosyandus();
      } catch (err: any) {
        alert('Gagal menghapus posyandu: ' + err.message);
      }
    }
  };

  const handlePrintCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Mohon izinkan pop-up di browser Anda.');
      return;
    }

    const title = `Daftar Kode Undangan Posyandu - Kelurahan ${selectedKelurahan === 'all' ? 'Semua Wilayah' : selectedKelurahan}`;
    const rows = filteredPosyandus.map((p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${p.nama_posyandu}</strong></td>
        <td>${p.nama_posyandu_balita || '-'}</td>
        <td>${p.nama_posyandu_lansia || '-'}</td>
        <td><span class="invite-code">${p.invite_code || '-'}</span></td>
        <td>${p.alamat_lengkap || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 24px;
              color: #1e293b;
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
              border-bottom: 2px solid #14b8a6;
              padding-bottom: 12px;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              color: #0f766e;
            }
            .header p {
              margin: 4px 0 0;
              font-size: 13px;
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              text-align: left;
              font-size: 12px;
            }
            th {
               background-color: #f1f5f9;
               color: #475569;
               font-weight: 700;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .invite-code {
              font-family: monospace;
              font-weight: 700;
              font-size: 13px;
              color: #0f766e;
              background-color: #ccfbf1;
              padding: 2px 8px;
              border-radius: 4px;
              border: 1px solid #99f6e4;
              display: inline-block;
            }
            .footer {
              margin-top: 30px;
              text-align: right;
              font-size: 10px;
              color: #94a3b8;
            }
            @media print {
              body { padding: 0; }
              @page { size: portrait; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DAFTAR KODE AKSES / UNDANGAN POSYANDU</h1>
            <p>${title}</p>
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
          </div>
          <table>
            <thead>
               <tr>
                 <th style="width: 5%">No</th>
                 <th style="width: 25%">Nama Posyandu</th>
                 <th style="width: 20%">Layanan Balita</th>
                 <th style="width: 20%">Layanan Lansia</th>
                 <th style="width: 15%">Kode Undangan (Mobile)</th>
                 <th style="width: 15%">Alamat / Dusun</th>
               </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">
            Layanan Posyandu Digital - SIMPUL SEHAT
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        nama_posyandu: namaPosyandu.trim(),
        tipe_posyandu: 'balita', // keep as balita for backward compat in old tables
        alamat_lengkap: alamat.trim(),
        kelurahan: kelurahan.trim(),
        kecamatan: kecamatan.trim(),
        kabupaten: 'Yogyakarta',
        provinsi: 'DIY',
        invite_code: generatedCode,
        puskesmas_id: userPuskesmasId,
        
        // Populate specific sub-posyandu identities
        nama_posyandu_balita: namaPosyanduBalita.trim() || `Posyandu Balita ${namaPosyandu.trim()}`,
        alamat_posyandu_balita: alamatBalita.trim() || alamat.trim(),
        jadwal_balita_tanggal: jadwalBalitaTanggal === '' ? null : Number(jadwalBalitaTanggal),
        jadwal_balita_jam: jadwalBalitaJam.trim() || '08:00',
        
        nama_posyandu_lansia: namaPosyanduLansia.trim() || `Posyandu Lansia ${namaPosyandu.trim()}`,
        alamat_posyandu_lansia: alamatLansia.trim() || alamat.trim(),
        jadwal_lansia_tanggal: jadwalLansiaTanggal === '' ? null : Number(jadwalLansiaTanggal),
        jadwal_lansia_jam: jadwalLansiaJam.trim() || '09:00',
      };

      if (editId) {
        const { error } = await supabase
          .from('posyandus')
          .update(payload)
          .eq('id', editId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('posyandus')
          .insert([payload]);
        
        if (error) throw error;
      }

      setShowModal(false);
      fetchPosyandus();
    } catch (err: any) {
      alert('Gagal menyimpan posyandu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Action Header */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={16} style={{ color: '#14B8A6' }} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Daftar Posyandu Terdaftar</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Kelurahan Filter Dropdown */}
          <select
            value={selectedKelurahan}
            onChange={(e) => setSelectedKelurahan(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              backgroundColor: '#fff',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Semua Kelurahan</option>
            {kelurahanOptions.map((kel) => (
              <option key={kel} value={kel}>Kelurahan {kel}</option>
            ))}
          </select>

          {/* Cetak Kode Undangan Button */}
          <button 
            onClick={handlePrintCodes} 
            className="btn btn-secondary" 
            style={{ 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderColor: '#14b8a6',
              color: '#0f766e',
              backgroundColor: '#f0fdfa'
            }}
            title="Cetak Kode Undangan"
          >
            <Printer size={14} />
            <span>Cetak Kode</span>
          </button>

          <button onClick={fetchPosyandus} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleOpenModal} className="btn btn-primary">
            <Plus size={14} />
            <span>Tambah Posyandu</span>
          </button>
        </div>
      </div>

      {/* Main Card Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Memuat data posyandu...
        </div>
      ) : posyandus.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Belum ada posyandu terdaftar. Silakan klik tombol "Tambah Posyandu" untuk mendaftarkan unit baru.
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {filteredPosyandus.map((p) => (
              <div 
                key={p.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: '#f0fdfa', borderRadius: '12px', color: '#14b8a6' }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
                        {p.nama_posyandu}
                      </h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} />
                        {p.kelurahan || '-'}, {p.kecamatan || '-'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handleOpenEditModal(p)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Ubah"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id, p.nama_posyandu)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#ef4444', borderRadius: '8px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Hapus"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Main Address */}
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Alamat ILP:</span> {p.alamat_lengkap || '-'}
                </p>

                {/* Divider */}
                <div style={{ borderTop: '1px dashed #e2e8f0', margin: '2px 0' }} />

                {/* Services Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Balita Service Card */}
                  <div style={{ border: '1px solid #ccfbf1', backgroundColor: '#f0fdfa', borderRadius: '12px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#14b8a6' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Baby size={12} />
                        {p.nama_posyandu_balita || 'Layanan Balita'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#0d9488', display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px' }}>
                      <span>📍 {p.alamat_posyandu_balita || p.alamat_lengkap || '-'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📅 Tanggal: <b>{p.jadwal_balita_tanggal || '-'}</b> ({p.jadwal_balita_jam || '08:00'})
                      </span>
                    </div>
                  </div>

                  {/* Lansia Service Card */}
                  <div style={{ border: '1px solid #e0e7ff', backgroundColor: '#eef2ff', borderRadius: '12px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4f46e5' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#3730a3', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} />
                        {p.nama_posyandu_lansia || 'Layanan Lansia'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#4338ca', display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px' }}>
                      <span>📍 {p.alamat_posyandu_lansia || p.alamat_lengkap || '-'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📅 Tanggal: <b>{p.jadwal_lansia_tanggal || '-'}</b> ({p.jadwal_lansia_jam || '08:00'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer (Auth Info) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Key size={12} style={{ color: '#14b8a6' }} />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Kode Undangan:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: '#0d9488', backgroundColor: '#ccfbf1', padding: '1px 6px', borderRadius: '4px' }}>
                      {p.invite_code || '-'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {new Date(p.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="pagination-container" style={{ marginTop: '20px' }}>
            <span>Menampilkan {filteredPosyandus.length} unit posyandu</span>
          </div>
        </div>
      )}

      {/* CREATE/EDIT POSYANDU MODAL */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <form 
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '640px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                {editId ? 'Ubah Data Posyandu ILP' : 'Mendaftarkan Unit Posyandu ILP Baru'}
              </span>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
              
              {/* 1. INFORMASI ADMINISTRASI ILP */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Informasi Administrasi Utama ILP
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  {/* Nama Posyandu ILP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Nama Posyandu ILP (Nama Padukuhan/Dusun)</label>
                    <input 
                      type="text" 
                      required 
                      value={namaPosyandu}
                      onChange={(e) => handleNamaPosyanduChange(e.target.value)}
                      placeholder="Contoh: Semboja RW 02"
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  </div>

                   {/* Kelurahan & Kecamatan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Kelurahan / Desa</label>
                      {wilayahList.length > 0 ? (
                        <select
                          required
                          value={kelurahan}
                          onChange={(e) => setKelurahan(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', color: '#1e293b' }}
                        >
                          <option value="">-- Pilih Kalurahan --</option>
                          {wilayahList.map((w) => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input 
                            type="text" 
                            required 
                            value={kelurahan}
                            onChange={(e) => setKelurahan(e.target.value)}
                            placeholder="Ketik kelurahan/desa..."
                            style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #ef4444', borderRadius: '8px', backgroundColor: '#fef2f2' }}
                          />
                          <span style={{ fontSize: '9px', color: '#ef4444', lineHeight: '1.2' }}>
                            Atur Wilayah Kerja di menu Pengaturan terlebih dahulu untuk mengaktifkan pilihan dropdown.
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Kecamatan</label>
                      <input 
                        type="text" 
                        required 
                        value={kecamatan}
                        onChange={(e) => setKecamatan(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </div>
                  </div>

                  {/* Alamat Lengkap Utama */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Alamat Lengkap Utama</label>
                    <textarea 
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      placeholder="Nama dusun, RT/RW, nomor lokasi..."
                      rows={2}
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. PELAYANAN BALITA */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Baby size={14} />
                  2. Detail Sub-Posyandu Balita
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f0fdfa', padding: '14px', borderRadius: '12px', border: '1px solid #ccfbf1' }}>
                  {/* Nama Posyandu Balita */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>Nama Fisik Posyandu Balita</label>
                    <input 
                      type="text" 
                      required 
                      value={namaPosyanduBalita}
                      onChange={(e) => setNamaPosyanduBalita(e.target.value)}
                      placeholder="Contoh: Posyandu Balita Singkong"
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #ccfbf1', borderRadius: '8px', backgroundColor: '#fff' }}
                    />
                  </div>

                  {/* Alamat Posyandu Balita */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>Alamat / Lokasi Layanan Balita</label>
                    <input 
                      type="text" 
                      value={alamatBalita}
                      onChange={(e) => setAlamatBalita(e.target.value)}
                      placeholder="Contoh: Kediaman Bu RW, RT 01 (Biarkan kosong untuk samakan dengan alamat utama)"
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #ccfbf1', borderRadius: '8px', backgroundColor: '#fff' }}
                    />
                  </div>

                  {/* Jadwal Balita */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>Setiap Tanggal (1-31)</label>
                      <input 
                        type="number" 
                        min={1}
                        max={31}
                        value={jadwalBalitaTanggal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJadwalBalitaTanggal(val === '' ? '' : Math.min(31, Math.max(1, Number(val))));
                        }}
                        placeholder="Contoh: 10"
                        style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #ccfbf1', borderRadius: '8px', backgroundColor: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>Jam Pelayanan</label>
                      <input 
                        type="text" 
                        value={jadwalBalitaJam}
                        onChange={(e) => setJadwalBalitaJam(e.target.value)}
                        placeholder="Contoh: 08:00 - 11:00"
                        style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #ccfbf1', borderRadius: '8px', backgroundColor: '#fff' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. PELAYANAN LANSIA */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} />
                  3. Detail Sub-Posyandu Lansia
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#eef2ff', padding: '14px', borderRadius: '12px', border: '1px solid #e0e7ff' }}>
                  {/* Nama Posyandu Lansia */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#3730a3' }}>Nama Fisik Posyandu Lansia</label>
                    <input 
                      type="text" 
                      required 
                      value={namaPosyanduLansia}
                      onChange={(e) => setNamaPosyanduLansia(e.target.value)}
                      placeholder="Contoh: Posyandu Lansia Sehat Sejahtera"
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e0e7ff', borderRadius: '8px', backgroundColor: '#fff' }}
                    />
                  </div>

                  {/* Alamat Posyandu Lansia */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#3730a3' }}>Alamat / Lokasi Layanan Lansia</label>
                    <input 
                      type="text" 
                      value={alamatLansia}
                      onChange={(e) => setAlamatLansia(e.target.value)}
                      placeholder="Contoh: Balai RW, RT 02 (Biarkan kosong untuk samakan dengan alamat utama)"
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e0e7ff', borderRadius: '8px', backgroundColor: '#fff' }}
                    />
                  </div>

                  {/* Jadwal Lansia */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#3730a3' }}>Setiap Tanggal (1-31)</label>
                      <input 
                        type="number" 
                        min={1}
                        max={31}
                        value={jadwalLansiaTanggal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJadwalLansiaTanggal(val === '' ? '' : Math.min(31, Math.max(1, Number(val))));
                        }}
                        placeholder="Contoh: 22"
                        style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e0e7ff', borderRadius: '8px', backgroundColor: '#fff' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#3730a3' }}>Jam Pelayanan</label>
                      <input 
                        type="text" 
                        value={jadwalLansiaJam}
                        onChange={(e) => setJadwalLansiaJam(e.target.value)}
                        placeholder="Contoh: 09:00 - selesai"
                        style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e0e7ff', borderRadius: '8px', backgroundColor: '#fff' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. KODE KETUA DIHASILKAN */}
              <div 
                style={{
                  padding: '12px',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', color: '#0f766e', fontWeight: 600, display: 'block' }}>KODE AKSES KADER DIHASILKAN (SIGNUP MOBILE):</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', color: '#14B8A6', fontFamily: 'monospace' }}>
                    {generatedCode}
                  </span>
                </div>
                <div style={{ color: '#14B8A6', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                  <Check size={14} />
                  <span>Siap Digunakan</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan & Rilis Kode'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


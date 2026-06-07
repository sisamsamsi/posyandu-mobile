'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Plus, RefreshCw, Key, Check } from 'lucide-react';
import { useFilters } from '@/context/FilterContext';

interface Posyandu {
  id: string;
  nama_posyandu: string;
  tipe_posyandu: string;
  alamat_lengkap: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kode_ketua: string | null;
  created_at: string;
}

export default function PosyanduPage() {
  const { loading: filtersLoading } = useFilters();
  const [posyandus, setPosyandus] = useState<Posyandu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [namaPosyandu, setNamaPosyandu] = useState('');
  const [tipePosyandu, setTipePosyandu] = useState('balita');
  const [alamat, setAlamat] = useState('');
  const [kelurahan, setKelurahan] = useState('Sukamaju');
  const [kecamatan, setKecamatan] = useState('Pakualaman');
  const [generatedCode, setGeneratedCode] = useState('');

  // Fetch Posyandus from Supabase
  const fetchPosyandus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posyandus')
        .select('id, nama_posyandu, tipe_posyandu, alamat_lengkap, kelurahan, kecamatan, kode_ketua, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosyandus(data || []);
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
    setNamaPosyandu('');
    setTipePosyandu('balita');
    setAlamat('');
    setKelurahan('Sukamaju');
    setKecamatan('Pakualaman');
    setGeneratedCode(generateCode());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        nama_posyandu: namaPosyandu.trim(),
        tipe_posyandu: tipePosyandu,
        alamat_lengkap: alamat.trim(),
        kelurahan: kelurahan,
        kecamatan: kecamatan,
        kabupaten: 'Yogyakarta',
        provinsi: 'DIY',
        kode_ketua: generatedCode,
        // Fallbacks for older mobile columns
        nama_posyandu_balita: tipePosyandu === 'balita' ? namaPosyandu.trim() : null,
        alamat_posyandu_balita: tipePosyandu === 'balita' ? alamat.trim() : null,
        nama_posyandu_lansia: tipePosyandu === 'lansia' ? namaPosyandu.trim() : null,
        alamat_posyandu_lansia: tipePosyandu === 'lansia' ? alamat.trim() : null,
      };

      const { error } = await supabase
        .from('posyandus')
        .insert([payload]);

      if (error) throw error;

      setShowModal(false);
      fetchPosyandus();
    } catch (err: any) {
      alert('Gagal membuat posyandu: ' + err.message);
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchPosyandus} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleOpenModal} className="btn btn-primary">
            <Plus size={14} />
            <span>Tambah Posyandu</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Memuat data posyandu...
        </div>
      ) : posyandus.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Belum ada posyandu terdaftar. Silakan klik tombol "Tambah Posyandu" untuk mendaftarkan unit baru.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nama Posyandu</th>
                <th>Tipe Posyandu</th>
                <th>Kelurahan / Desa</th>
                <th>Kecamatan</th>
                <th>Alamat Lengkap</th>
                <th>Kode Ketua (Mobile Auth)</th>
                <th>Tanggal Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {posyandus.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, color: '#1e293b' }}>{p.nama_posyandu}</td>
                  <td>
                    <span className={`badge ${p.tipe_posyandu === 'balita' ? 'badge-info' : 'badge-warning'}`}>
                      {p.tipe_posyandu === 'balita' ? 'Balita' : 'Lansia'}
                    </span>
                  </td>
                  <td>{p.kelurahan || '-'}</td>
                  <td>{p.kecamatan || '-'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.alamat_lengkap || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={12} style={{ color: '#14B8A6' }} />
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px', color: '#0d9488', backgroundColor: '#f0fdfa', padding: '2px 6px', borderRadius: '8px' }}>
                        {p.kode_ketua || '-'}
                      </span>
                    </div>
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination-container">
            <span>Menampilkan {posyandus.length} unit posyandu</span>
          </div>
        </div>
      )}

      {/* CREATE POSYANDU MODAL */}
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
              maxWidth: '440px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>Mendaftarkan Unit Posyandu Baru</span>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Nama Posyandu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Nama Posyandu</label>
                <input 
                  type="text" 
                  required 
                  value={namaPosyandu}
                  onChange={(e) => setNamaPosyandu(e.target.value)}
                  placeholder="Contoh: Posyandu Melati 2"
                  style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
              </div>

              {/* Tipe Posyandu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Tipe Layanan Posyandu</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="tipe" 
                      value="balita" 
                      checked={tipePosyandu === 'balita'} 
                      onChange={() => setTipePosyandu('balita')} 
                    />
                    <span>Posyandu Balita (Tumbuh Kembang)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="tipe" 
                      value="lansia" 
                      checked={tipePosyandu === 'lansia'} 
                      onChange={() => setTipePosyandu('lansia')} 
                    />
                    <span>Posyandu Lansia (Degeneratif)</span>
                  </label>
                </div>
              </div>

              {/* Kelurahan & Kecamatan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kelurahan / Desa</label>
                  <select 
                    value={kelurahan}
                    onChange={(e) => setKelurahan(e.target.value)}
                    style={{ padding: '8px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  >
                    <option value="Sukamaju">Sukamaju</option>
                    <option value="Mekarjaya">Mekarjaya</option>
                    <option value="Tugu">Tugu</option>
                    <option value="Cisalak">Cisalak</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kecamatan</label>
                  <input 
                    type="text" 
                    required 
                    value={kecamatan}
                    onChange={(e) => setKecamatan(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Alamat Lengkap</label>
                <textarea 
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Nama dusun, RT/RW, nomor lokasi..."
                  rows={2}
                  style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', resize: 'none' }}
                />
              </div>

              {/* Generated Kode Ketua Card */}
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
                  <span style={{ fontSize: '10px', color: '#0f766e', fontWeight: 500, display: 'block' }}>KODE KETUA DIHASILKAN (MOBILE SIGNUP):</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', color: '#14B8A6', fontFamily: 'monospace' }}>
                    {generatedCode}
                  </span>
                </div>
                <div style={{ color: '#14B8A6', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500 }}>
                  <Check size={14} />
                  <span>Siap Pakai</span>
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
                {submitting ? 'Menyimpan...' : 'Simpan & Rilis Kode'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

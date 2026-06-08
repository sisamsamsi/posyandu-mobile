'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Plus, RefreshCw, Key, Check, Edit2, Trash2 } from 'lucide-react';
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
}

export default function PosyanduPage() {
  const { loading: filtersLoading } = useFilters();
  const [posyandus, setPosyandus] = useState<Posyandu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form States
  const [namaPosyandu, setNamaPosyandu] = useState('');
  const [tipePosyandu, setTipePosyandu] = useState('balita');
  const [alamat, setAlamat] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [kecamatan, setKecamatan] = useState('Pakualaman');
  const [generatedCode, setGeneratedCode] = useState('');

  // Fetch Posyandus from Supabase
  const fetchPosyandus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posyandus')
        .select('id, nama_posyandu, tipe_posyandu, alamat_lengkap, kelurahan, kecamatan, invite_code, created_at')
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
    setEditId(null);
    setNamaPosyandu('');
    setTipePosyandu('balita'); // internal default
    setAlamat('');
    setKelurahan('');
    setKecamatan('Pakualaman');
    setGeneratedCode(generateCode());
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Posyandu) => {
    setEditId(p.id);
    setNamaPosyandu(p.nama_posyandu || '');
    setTipePosyandu(p.tipe_posyandu || 'balita');
    setAlamat(p.alamat_lengkap || '');
    setKelurahan(p.kelurahan || '');
    setKecamatan(p.kecamatan || '');
    setGeneratedCode(p.invite_code || '');
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
        // Populate both division columns to sync with unified ILP mobile schema
        nama_posyandu_balita: namaPosyandu.trim(),
        alamat_posyandu_balita: alamat.trim(),
        nama_posyandu_lansia: namaPosyandu.trim(),
        alamat_posyandu_lansia: alamat.trim(),
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
                <th>Kelurahan / Desa</th>
                <th>Kecamatan</th>
                <th>Alamat Lengkap</th>
                <th>Kode Undangan (Mobile Auth)</th>
                <th>Tanggal Dibuat</th>
                <th style={{ width: '150px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {posyandus.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, color: '#1e293b' }}>{p.nama_posyandu}</td>
                  <td>{p.kelurahan || '-'}</td>
                  <td>{p.kecamatan || '-'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.alamat_lengkap || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={12} style={{ color: '#14B8A6' }} />
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px', color: '#0d9488', backgroundColor: '#f0fdfa', padding: '2px 6px', borderRadius: '8px' }}>
                        {p.invite_code || '-'}
                      </span>
                    </div>
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(p)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', height: '28px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id, p.nama_posyandu)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', height: '28px', color: '#ef4444', borderColor: '#fee2e2', backgroundColor: '#fef2f2' }}
                      >
                        <Trash2 size={12} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
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
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{editId ? 'Ubah Data Posyandu' : 'Mendaftarkan Unit Posyandu Baru'}</span>
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

              {/* Info Layanan Primer */}
              <div style={{ 
                padding: '10px 12px', 
                backgroundColor: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px',
                fontSize: '11px',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Layanan Terintegrasi (ILP)</span>
                <span>Unit Posyandu baru akan didaftarkan sebagai unit terintegrasi yang melayani Balita (Tumbuh Kembang) & Lansia (Degeneratif) sekaligus.</span>
              </div>

              {/* Kelurahan & Kecamatan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kelurahan / Desa</label>
                  <input 
                    type="text" 
                    required 
                    value={kelurahan}
                    onChange={(e) => setKelurahan(e.target.value)}
                    placeholder="Nama kelurahan/desa..."
                    style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  />
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
                {submitting ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan & Rilis Kode'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

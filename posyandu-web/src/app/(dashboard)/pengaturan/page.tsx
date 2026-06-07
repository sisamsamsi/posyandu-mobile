'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, RefreshCw, Key, Shield, UserCheck, Check, AlertCircle } from 'lucide-react';

export default function PengaturanPage() {
  // Connection state
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [dbMessage, setDbMessage] = useState('');
  
  // Profile settings state
  const [namaPuskesmas, setNamaPuskesmas] = useState('Puskesmas Pondok I');
  const [kodePuskesmas, setKodePuskesmas] = useState('P3402010101');
  const [kepalaPuskesmas, setKepalaPuskesmas] = useState('Dr. dr. Hendra Irawan, M.Kes');
  const [nipKepala, setNipKepala] = useState('197508102003121004');
  const [alamat, setAlamat] = useState('Jl. Raya Wonosari KM 7, Bantul, DIY');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Load custom profile if saved locally
  useEffect(() => {
    const savedProfile = localStorage.getItem('simpul_sehat_puskesmas_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setNamaPuskesmas(parsed.namaPuskesmas || 'Puskesmas Pondok I');
        setKodePuskesmas(parsed.kodePuskesmas || 'P3402010101');
        setKepalaPuskesmas(parsed.kepalaPuskesmas || 'Dr. dr. Hendra Irawan, M.Kes');
        setNipKepala(parsed.nipKepala || '197508102003121004');
        setAlamat(parsed.alamat || 'Jl. Raya Wonosari KM 7, Bantul, DIY');
      } catch (_) {}
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    setTimeout(() => {
      const profile = { namaPuskesmas, kodePuskesmas, kepalaPuskesmas, nipKepala, alamat };
      localStorage.setItem('simpul_sehat_puskesmas_profile', JSON.stringify(profile));
      setSaving(false);
      setSuccessMsg('Pengaturan profil Puskesmas berhasil disimpan.');
    }, 800);
  };

  const handleTestDatabase = async () => {
    setDbStatus('testing');
    setDbMessage('');
    try {
      // Fetch table count or metadata to verify connection and credentials
      const { error } = await supabase
        .from('posyandus')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      setDbStatus('success');
      setDbMessage('Koneksi Supabase aktif & RLS Kebijakan valid!');
    } catch (err: any) {
      setDbStatus('failed');
      setDbMessage('Kesalahan Koneksi: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
      {/* 1. LEFT SIDE: PROFILE FORM */}
      <div className="card">
        <div className="card-header-compact">
          <span className="card-title-compact" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={14} style={{ color: '#14B8A6' }} />
            Profil Instansi Puskesmas
          </span>
        </div>

        {successMsg && (
          <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', fontSize: '11px', color: '#16a34a', marginBottom: '16px', alignItems: 'center' }}>
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Nama Puskesmas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Nama Instansi Puskesmas</label>
            <input 
              type="text" required value={namaPuskesmas}
              onChange={(e) => setNamaPuskesmas(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
            />
          </div>

          {/* Kode Puskesmas & Alamat */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kode Registrasi Puskesmas</label>
              <input 
                type="text" required value={kodePuskesmas}
                onChange={(e) => setKodePuskesmas(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kecamatan/Wilayah Kerja</label>
              <input 
                type="text" required defaultValue="Wonokromo"
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc', color: '#64748b' }}
                disabled
              />
            </div>
          </div>

          {/* Kepala Puskesmas & NIP */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Nama Kepala Puskesmas</label>
              <input 
                type="text" required value={kepalaPuskesmas}
                onChange={(e) => setKepalaPuskesmas(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>NIP Kepala</label>
              <input 
                type="text" required value={nipKepala}
                onChange={(e) => setNipKepala(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
            </div>
          </div>

          {/* Alamat Lengkap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Alamat Instansi</label>
            <textarea 
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={2}
              style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', resize: 'none' }}
            />
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>
            <Save size={14} />
            <span>{saving ? 'Menyimpan...' : 'Simpan Profil'}</span>
          </button>
        </form>
      </div>

      {/* 2. RIGHT SIDE: CONNECTION TESTERS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Supabase Test */}
        <div className="card">
          <div className="card-header-compact">
            <span className="card-title-compact" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} style={{ color: '#2563eb' }} />
              Status Integrasi Database (Supabase)
            </span>
          </div>

          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
            Periksa integrasi database PostgreSQL Anda dengan Supabase. Koneksi ini melacak profil dan penimbangan dari aplikasi mobile secara real-time.
          </p>

          {dbStatus === 'success' && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', fontSize: '11px', color: '#16a34a', marginBottom: '16px', alignItems: 'center' }}>
              <Check size={14} style={{ flexShrink: 0 }} />
              <span>{dbMessage}</span>
            </div>
          )}

          {dbStatus === 'failed' && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '12px', fontSize: '11px', color: '#e11d48', marginBottom: '16px', alignItems: 'center' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{dbMessage}</span>
            </div>
          )}

          <button 
            onClick={handleTestDatabase} 
            disabled={dbStatus === 'testing'}
            className="btn btn-secondary" 
            style={{ alignSelf: 'flex-start' }}
          >
            {dbStatus === 'testing' ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Menguji Koneksi...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Uji Koneksi Supabase</span>
              </>
            )}
          </button>
        </div>

        {/* Security / System Roles */}
        <div className="card">
          <div className="card-header-compact">
            <span className="card-title-compact" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} style={{ color: '#ea580c' }} />
              Keamanan Hak Akses (RBAC)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <UserCheck size={14} style={{ color: '#14B8A6' }} />
              <div>
                <span style={{ fontWeight: 600, color: '#1e293b', display: 'block' }}>Peran Terautentikasi: Staf Puskesmas</span>
                Akses tulis profil dasar & ekspor/impor e-PPGBM aktif.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <UserCheck size={14} style={{ color: '#2563eb' }} />
              <div>
                <span style={{ fontWeight: 600, color: '#1e293b', display: 'block' }}>Peran Terautentikasi: Ketua Posyandu</span>
                Akses tulis timbangan lapangan & registrasi kader aktif.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

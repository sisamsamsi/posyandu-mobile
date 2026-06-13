'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, RefreshCw, Key, Shield, UserCheck, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function PengaturanPage() {
  // Connection state
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [dbMessage, setDbMessage] = useState('');
  
  // Profile settings state
  const [namaPuskesmas, setNamaPuskesmas] = useState('');
  const [kodePuskesmas, setKodePuskesmas] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kabupaten, setKabupaten] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [kepalaPuskesmas, setKepalaPuskesmas] = useState('');
  const [nipKepala, setNipKepala] = useState('');
  const [alamat, setAlamat] = useState('');
  const [wilayahBinaan, setWilayahBinaan] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Load custom profile from database if authenticated, fallback to local storage
  useEffect(() => {
    async function loadPuskesmasProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select(`
              role,
              puskesmas_id,
              puskesmas:puskesmas(*)
            `)
            .eq('user_id', session.user.id)
            .single();

          if (roleError) throw roleError;

          if (roleData && roleData.puskesmas) {
            const p = (Array.isArray(roleData.puskesmas) ? roleData.puskesmas[0] : roleData.puskesmas) as any;
            setNamaPuskesmas(p.nama_puskesmas || '');
            setKodePuskesmas(p.kode_puskesmas || '');
            setKecamatan(p.kecamatan || '');
            setKabupaten(p.kabupaten || '');
            setProvinsi(p.provinsi || '');
            setKepalaPuskesmas(p.kepala_puskesmas || '');
            setNipKepala(p.nip_kepala || '');
            setAlamat(p.alamat || '');
            setWilayahBinaan(p.wilayah_binaan || '');

            const profile = {
              namaPuskesmas: p.nama_puskesmas,
              kodePuskesmas: p.kode_puskesmas,
              kecamatan: p.kecamatan,
              kabupaten: p.kabupaten,
              provinsi: p.provinsi,
              kepalaPuskesmas: p.kepala_puskesmas,
              nipKepala: p.nip_kepala,
              alamat: p.alamat,
              wilayahBinaan: p.wilayah_binaan
            };
            localStorage.setItem('simpul_sehat_puskesmas_profile', JSON.stringify(profile));
            window.dispatchEvent(new Event('puskesmas-profile-updated'));
            return;
          }
        }
      } catch (err) {
        console.warn('Gagal memuat profil Puskesmas dari database, menggunakan data lokal:', err);
      }

      // Fallback
      const savedProfile = localStorage.getItem('simpul_sehat_puskesmas_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setNamaPuskesmas(parsed.namaPuskesmas || '');
          setKodePuskesmas(parsed.kodePuskesmas || '');
          setKecamatan(parsed.kecamatan || '');
          setKabupaten(parsed.kabupaten || '');
          setProvinsi(parsed.provinsi || '');
          setKepalaPuskesmas(parsed.kepalaPuskesmas || '');
          setNipKepala(parsed.nipKepala || '');
          setAlamat(parsed.alamat || '');
          setWilayahBinaan(parsed.wilayahBinaan || '');
        } catch (_) {}
      }
    }

    loadPuskesmasProfile();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError(false);

    if (newPassword.length < 6) {
      setPasswordError(true);
      setPasswordMsg('Kata sandi harus minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(true);
      setPasswordMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordMsg('Kata sandi Anda berhasil diperbarui.');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      console.error(err);
      setPasswordError(true);
      setPasswordMsg('Gagal memperbarui kata sandi: ' + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('puskesmas_id')
          .eq('user_id', session.user.id)
          .single();

        if (roleData?.puskesmas_id) {
          const { error } = await supabase
            .from('puskesmas')
            .update({
              nama_puskesmas: namaPuskesmas,
              kode_puskesmas: kodePuskesmas,
              kecamatan: kecamatan,
              kabupaten: kabupaten,
              provinsi: provinsi,
              kepala_puskesmas: kepalaPuskesmas,
              nip_kepala: nipKepala,
              alamat: alamat,
              wilayah_binaan: wilayahBinaan
            })
            .eq('id', roleData.puskesmas_id);

          if (error) throw error;
        }
      }
      
      const profile = { 
        namaPuskesmas, 
        kodePuskesmas, 
        kecamatan, 
        kabupaten, 
        provinsi, 
        kepalaPuskesmas, 
        nipKepala, 
        alamat, 
        wilayahBinaan 
      };
      localStorage.setItem('simpul_sehat_puskesmas_profile', JSON.stringify(profile));
      setSuccessMsg('Pengaturan profil Puskesmas berhasil disimpan.');
      window.dispatchEvent(new Event('puskesmas-profile-updated'));
    } catch (err: any) {
      console.error(err);
      setSuccessMsg('Error: Gagal menyimpan ke database. ' + err.message);
    } finally {
      setSaving(false);
    }
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

          {/* Kode Puskesmas & Kecamatan */}
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
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kecamatan</label>
              <input 
                type="text" required value={kecamatan}
                onChange={(e) => setKecamatan(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
            </div>
          </div>

          {/* Kabupaten & Provinsi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kabupaten / Kota</label>
              <input 
                type="text" required value={kabupaten}
                onChange={(e) => setKabupaten(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Provinsi</label>
              <input 
                type="text" required value={provinsi}
                onChange={(e) => setProvinsi(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
            </div>
          </div>

          {/* Operator Puskesmas & NIP/ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Nama Operator Puskesmas</label>
              <input 
                type="text" required value={kepalaPuskesmas}
                onChange={(e) => setKepalaPuskesmas(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>NIP/ID Operator</label>
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

          {/* Wilayah Kerja / Kalurahan Binaan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Wilayah Kerja / Kalurahan Binaan (Dipisahkan Koma)</label>
            <input 
              type="text" 
              value={wilayahBinaan}
              onChange={(e) => setWilayahBinaan(e.target.value)}
              placeholder="Contoh: Ringinharjo, Trirenggo, Palbapang"
              style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.4' }}>
              Daftar kalurahan ini akan menjadi pilihan dropdown Kelurahan saat mendaftarkan Posyandu baru.
            </span>
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

        {/* Ubah Kata Sandi */}
        <div className="card">
          <div className="card-header-compact">
            <span className="card-title-compact" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} style={{ color: '#14B8A6' }} />
              Ubah Kata Sandi Akun
            </span>
          </div>

          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
            Perbarui kata sandi akun operator Puskesmas Anda di bawah ini secara aman.
          </p>

          {passwordMsg && (
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              padding: '10px', 
              backgroundColor: passwordError ? '#fff1f2' : '#f0fdf4', 
              border: passwordError ? '1px solid #ffe4e6' : '1px solid #dcfce7', 
              borderRadius: '12px', 
              fontSize: '11px', 
              color: passwordError ? '#e11d48' : '#16a34a', 
              marginBottom: '16px', 
              alignItems: 'center' 
            }}>
              {passwordError ? <AlertCircle size={14} style={{ flexShrink: 0 }} /> : <Check size={14} style={{ flexShrink: 0 }} />}
              <span>{passwordMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Kata Sandi Baru</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showNewPassword ? 'text' : 'password'} 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  style={{ width: '100%', padding: '8px 36px 8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Konfirmasi Kata Sandi Baru</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  style={{ width: '100%', padding: '8px 36px 8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={updatingPassword} className="btn btn-primary" style={{ marginTop: '8px', alignSelf: 'flex-start' }}>
              <span>{updatingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

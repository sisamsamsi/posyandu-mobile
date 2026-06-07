'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit, User, ShieldAlert } from 'lucide-react';
import { useFilters } from '@/context/FilterContext';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PemeriksaanLansia {
  id: string;
  tanggal_periksa: string;
  keluhan: string | null;
  tekanan_darah: string | null;
  tinggi_badan: number | null;
  berat_badan: number | null;
  lingkar_perut: number | null;
  kolesterol: number | null;
  gula_darah: number | null;
  asam_urat: number | null;
  trigliserida: number | null;
  catatan_tambahan: string | null;
}

interface Lansia {
  id: string;
  nik: string;
  nama: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  alamat: string | null;
  rt: number | null;
  penyakit_bawaan: string[];
  posyandu?: { nama_posyandu: string; kelurahan: string };
}

export default function LansiaDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { loading: filtersLoading } = useFilters();

  // States
  const [lansia, setLansia] = useState<Lansia | null>(null);
  const [history, setHistory] = useState<PemeriksaanLansia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (filtersLoading) return;
    async function loadData() {
      try {
        setLoading(true);

        // Fetch profile
        const { data: lData, error: lErr } = await supabase
          .from('lansias')
          .select('*, posyandu:posyandus(nama_posyandu, kelurahan)')
          .eq('id', id)
          .maybeSingle();

        if (lErr) throw lErr;

        // Fetch history
        const { data: hData, error: hErr } = await supabase
          .from('pemeriksaan_lansias')
          .select('*')
          .eq('lansia_id', id)
          .order('tanggal_periksa', { ascending: true });

        if (hErr) throw hErr;

        if (lData) {
          setLansia(lData as any);
          setHistory(hData || []);
        }
      } catch (err) {
        console.error('Error loading detail lansia:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, filtersLoading]);

  // Calculate age
  const calculateAge = (dobStr?: string) => {
    if (!dobStr) return 0;
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const latestExam = history.length > 0 ? history[history.length - 1] : null;

  const age = calculateAge(lansia?.tanggal_lahir);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat rekam medis lansia...</div>;
  }

  if (!lansia) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#ef4444' }}>Lansia tidak ditemukan.</p>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginTop: '12px' }}>
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER CONTROLS */}
      <div className="filter-bar" style={{ padding: '8px 16px', marginBottom: '16px' }}>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
          <ArrowLeft size={14} />
          <span>Kembali ke Database</span>
        </button>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
          Detail Lansia: {lansia.nama}
        </span>
      </div>

      {/* DUAL COLUMN SECTION */}
      <div className="detail-container">
        {/* Left Side: Profile Card */}
        <div className="profile-card-left">
          <div 
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#f0fdfa',
              color: '#14B8A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              border: '2px solid #ccfbf1'
            }}
          >
            <User size={40} />
          </div>
          <h2 className="profile-card-name">{lansia.nama}</h2>
          <span className="profile-card-sub">
            {lansia.jenis_kelamin} • {age} Tahun
          </span>

          <button 
            onClick={() => router.push(`/lansia?edit=${lansia.id}`)}
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '11px', padding: '5px' }}
          >
            <Edit size={12} />
            <span>Edit Profil</span>
          </button>

          <div className="profile-divider" />

          <div className="profile-details-list">
            <div className="profile-details-item">
              <span className="profile-details-label">NIK:</span>
              <span className="profile-details-val" style={{ fontFamily: 'monospace' }}>{lansia.nik}</span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Lahir:</span>
              <span className="profile-details-val">
                {new Date(lansia.tanggal_lahir).toLocaleDateString('id-ID')}
              </span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Posyandu:</span>
              <span className="profile-details-val">{lansia.posyandu?.nama_posyandu || 'Kenanga 1'}</span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Kalurahan:</span>
              <span className="profile-details-val">{lansia.posyandu?.kelurahan || 'Mekarjaya'}</span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Alamat:</span>
              <span className="profile-details-val" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '140px' }}>
                {lansia.alamat || '-'}
              </span>
            </div>
            <div className="profile-details-item" style={{ flexDirection: 'column', gap: '4px', alignItems: 'flex-start', marginTop: '6px' }}>
              <span className="profile-details-label">Penyakit Bawaan:</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                {lansia.penyakit_bawaan && lansia.penyakit_bawaan.length > 0 ? (
                  lansia.penyakit_bawaan.map(p => (
                    <span key={p} className="badge badge-warning" style={{ fontSize: '10px' }}>{p}</span>
                  ))
                ) : (
                  <span style={{ color: '#94a3b8' }}>Tidak ada riwayat</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Clinical Records (No Mock Tabs) */}
        <div className="profile-tabs-right" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Rekam Laboratorium Lapangan Lansia
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Posyandu Lansia: {lansia.posyandu?.nama_posyandu || '-'}
            </span>
          </div>

          <div className="table-container" style={{ border: '1px solid #e2e8f0', boxShadow: 'none', marginBottom: '16px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tanggal Cek</th>
                  <th>Tensi (mmHg)</th>
                  <th>Gula Darah (GDA)</th>
                  <th>Kolesterol</th>
                  <th>Asam Urat</th>
                  <th>Lingkar Perut</th>
                  <th>Keluhan</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{new Date(h.tanggal_periksa).toLocaleDateString('id-ID')}</td>
                      <td style={{ color: h.tekanan_darah && parseInt(h.tekanan_darah.split('/')[0]) >= 140 ? '#ef4444' : 'inherit' }}>
                        {h.tekanan_darah || '-'}
                      </td>
                      <td style={{ color: h.gula_darah && h.gula_darah >= 200 ? '#ef4444' : 'inherit' }}>
                        {h.gula_darah ? `${h.gula_darah} mg/dL` : '-'}
                      </td>
                      <td style={{ color: h.kolesterol && h.kolesterol >= 200 ? '#ef4444' : 'inherit' }}>
                        {h.kolesterol ? `${h.kolesterol} mg/dL` : '-'}
                      </td>
                      <td>{h.asam_urat ? h.asam_urat.toFixed(1) : '-'}</td>
                      <td>{h.lingkar_perut ? `${h.lingkar_perut} cm` : '-'}</td>
                      <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.keluhan || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', padding: '30px' }}>
                      Belum ada riwayat pemeriksaan untuk lansia ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes card */}
          {latestExam && latestExam.catatan_tambahan && (
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Instruksi Tindak Lanjut Terakhir (Puskesmas):</span>
              <p style={{ fontSize: '12px', color: '#334155', margin: 0 }}>{latestExam.catatan_tambahan}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

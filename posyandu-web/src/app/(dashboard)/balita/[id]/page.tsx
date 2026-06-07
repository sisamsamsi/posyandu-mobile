'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit, Baby, Activity, MessageSquareCode, Calendar, ClipboardCheck } from 'lucide-react';
import { useFilters } from '@/context/FilterContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Penimbangan {
  id: string;
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;
  zscore_bb_u: number | null;
  status_bb_u: string | null;
  zscore_tb_u: number | null;
  status_tb_u: string | null;
  zscore_bb_tb: number | null;
  status_bb_tb: string | null;
  catatan: string | null;
}

interface Whopoint {
  x: number;
  sd3: number;
  sd2: number;
  sd0: number;
  sdM2: number;
  sdM3: number;
}

// Weight-for-Age (BB/U) - age in months
const bbuBoys: Whopoint[] = [
  { x: 0, sd3: 5.0, sd2: 4.4, sd0: 3.3, sdM2: 2.5, sdM3: 2.1 },
  { x: 3, sd3: 8.9, sd2: 8.0, sd0: 6.4, sdM2: 5.0, sdM3: 4.4 },
  { x: 6, sd3: 10.9, sd2: 9.8, sd0: 7.9, sdM2: 6.4, sdM3: 5.9 },
  { x: 9, sd3: 12.2, sd2: 11.0, sd0: 8.9, sdM2: 7.5, sdM3: 6.9 },
  { x: 12, sd3: 13.3, sd2: 12.0, sd0: 9.6, sdM2: 8.6, sdM3: 7.8 },
  { x: 18, sd3: 15.3, sd2: 13.7, sd0: 11.5, sdM2: 9.8, sdM3: 8.8 },
  { x: 24, sd3: 16.4, sd2: 15.3, sd0: 12.2, sdM2: 10.7, sdM3: 9.7 },
  { x: 36, sd3: 19.7, sd2: 18.0, sd0: 14.3, sdM2: 12.7, sdM3: 11.3 },
  { x: 48, sd3: 22.7, sd2: 20.7, sd0: 16.3, sdM2: 14.3, sdM3: 12.7 },
  { x: 60, sd3: 25.8, sd2: 23.4, sd0: 18.3, sdM2: 16.0, sdM3: 14.1 }
];

const bbuGirls: Whopoint[] = [
  { x: 0, sd3: 4.8, sd2: 4.2, sd0: 3.2, sdM2: 2.4, sdM3: 2.0 },
  { x: 3, sd3: 8.3, sd2: 7.5, sd0: 5.8, sdM2: 4.6, sdM3: 4.0 },
  { x: 6, sd3: 10.3, sd2: 9.3, sd0: 7.3, sdM2: 5.8, sdM3: 5.3 },
  { x: 9, sd3: 11.5, sd2: 10.4, sd0: 8.2, sdM2: 6.8, sdM3: 6.1 },
  { x: 12, sd3: 12.8, sd2: 11.5, sd0: 8.9, sdM2: 7.7, sdM3: 7.0 },
  { x: 18, sd3: 14.8, sd2: 13.2, sd0: 10.2, sdM2: 9.0, sdM3: 8.1 },
  { x: 24, sd3: 16.0, sd2: 14.8, sd0: 11.5, sdM2: 10.0, sdM3: 9.0 },
  { x: 36, sd3: 19.3, sd2: 17.6, sd0: 13.9, sdM2: 12.0, sdM3: 10.8 },
  { x: 48, sd3: 22.2, sd2: 20.2, sd0: 16.1, sdM2: 13.7, sdM3: 12.3 },
  { x: 60, sd3: 25.1, sd2: 22.9, sd0: 18.2, sdM2: 15.4, sdM3: 13.7 }
];

// Height-for-Age (TB/U) - age in months
const tbuBoys: Whopoint[] = [
  { x: 0, sd3: 55.6, sd2: 53.7, sd0: 49.9, sdM2: 46.1, sdM3: 44.2 },
  { x: 3, sd3: 67.2, sd2: 65.5, sd0: 61.4, sdM2: 57.3, sdM3: 55.6 },
  { x: 6, sd3: 73.8, sd2: 71.9, sd0: 67.6, sdM2: 65.5, sdM3: 63.3 },
  { x: 9, sd3: 78.6, sd2: 76.5, sd0: 72.0, sdM2: 69.7, sdM3: 67.5 },
  { x: 12, sd3: 82.9, sd2: 80.8, sd0: 76.1, sdM2: 73.4, sdM3: 71.0 },
  { x: 18, sd3: 89.8, sd2: 87.5, sd0: 82.3, sdM2: 79.6, sdM3: 76.9 },
  { x: 24, sd3: 97.0, sd2: 93.5, sd0: 87.8, sdM2: 84.1, sdM3: 81.0 },
  { x: 36, sd3: 107.2, sd2: 102.7, sd0: 96.1, sdM2: 92.4, sdM3: 88.7 },
  { x: 48, sd3: 115.9, sd2: 111.1, sd0: 103.3, sdM2: 99.1, sdM3: 94.9 },
  { x: 60, sd3: 123.9, sd2: 118.7, sd0: 110.0, sdM2: 105.3, sdM3: 100.7 }
];

const tbuGirls: Whopoint[] = [
  { x: 0, sd3: 54.7, sd2: 52.9, sd0: 49.1, sdM2: 45.4, sdM3: 43.6 },
  { x: 3, sd3: 65.7, sd2: 64.0, sd0: 59.8, sdM2: 56.4, sdM3: 55.0 },
  { x: 6, sd3: 71.9, sd2: 70.0, sd0: 65.7, sdM2: 63.5, sdM3: 61.2 },
  { x: 9, sd3: 76.6, sd2: 74.6, sd0: 70.1, sdM2: 67.7, sdM3: 65.3 },
  { x: 12, sd3: 80.9, sd2: 78.9, sd0: 74.0, sdM2: 71.4, sdM3: 68.9 },
  { x: 18, sd3: 87.9, sd2: 85.8, sd0: 80.7, sdM2: 77.6, sdM3: 74.9 },
  { x: 24, sd3: 95.0, sd2: 92.2, sd0: 86.4, sdM2: 82.9, sdM3: 80.0 },
  { x: 36, sd3: 105.0, sd2: 101.6, sd0: 95.1, sdM2: 91.2, sdM3: 87.4 },
  { x: 48, sd3: 113.8, sd2: 110.0, sd0: 102.7, sdM2: 98.0, sdM3: 93.8 },
  { x: 60, sd3: 122.0, sd2: 117.8, sd0: 109.4, sdM2: 104.4, sdM3: 99.7 }
];

// Weight-for-Height (BB/TB) - height in cm
const bbtbBoys: Whopoint[] = [
  { x: 45, sd3: 3.3, sd2: 3.0, sd0: 2.4, sdM2: 2.0, sdM3: 1.9 },
  { x: 55, sd3: 5.7, sd2: 5.3, sd0: 4.5, sdM2: 3.9, sdM3: 3.6 },
  { x: 65, sd3: 9.0, sd2: 8.4, sd0: 7.3, sdM2: 6.4, sdM3: 5.9 },
  { x: 75, sd3: 11.8, sd2: 11.0, sd0: 9.6, sdM2: 8.5, sdM3: 7.9 },
  { x: 85, sd3: 14.2, sd2: 13.3, sd0: 11.7, sdM2: 10.3, sdM3: 9.5 },
  { x: 95, sd3: 17.2, sd2: 16.1, sd0: 14.1, sdM2: 12.4, sdM3: 11.5 },
  { x: 105, sd3: 20.9, sd2: 19.6, sd0: 17.1, sdM2: 14.9, sdM3: 13.8 },
  { x: 110, sd3: 23.0, sd2: 21.5, sd0: 18.7, sdM2: 16.3, sdM3: 15.0 }
];

const bbtbGirls: Whopoint[] = [
  { x: 45, sd3: 3.1, sd2: 2.8, sd0: 2.3, sdM2: 2.0, sdM3: 1.9 },
  { x: 55, sd3: 5.4, sd2: 5.0, sd0: 4.3, sdM2: 3.7, sdM3: 3.4 },
  { x: 65, sd3: 8.5, sd2: 7.9, sd0: 6.8, sdM2: 6.0, sdM3: 5.5 },
  { x: 75, sd3: 11.1, sd2: 10.4, sd0: 9.0, sdM2: 7.9, sdM3: 7.3 },
  { x: 85, sd3: 13.6, sd2: 12.7, sd0: 11.0, sdM2: 9.7, sdM3: 8.9 },
  { x: 95, sd3: 16.6, sd2: 15.5, sd0: 13.5, sdM2: 11.8, sdM3: 10.8 },
  { x: 105, sd3: 20.3, sd2: 19.0, sd0: 16.5, sdM2: 14.4, sdM3: 13.2 },
  { x: 110, sd3: 22.4, sd2: 20.9, sd0: 18.2, sdM2: 15.8, sdM3: 14.5 }
];

const calculateAgeMonthsAtDate = (dobStr: string, dateStr: string) => {
  const dob = new Date(dobStr);
  const date = new Date(dateStr);
  let months = (date.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += date.getMonth();
  if (date.getDate() < dob.getDate()) {
    months--;
  }
  return months <= 0 ? 0 : months;
};

const interpolateSD = (points: Whopoint[], x: number): Omit<Whopoint, 'x'> => {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (x <= sorted[0].x) return { sd3: sorted[0].sd3, sd2: sorted[0].sd2, sd0: sorted[0].sd0, sdM2: sorted[0].sdM2, sdM3: sorted[0].sdM3 };
  if (x >= sorted[sorted.length - 1].x) return { sd3: sorted[sorted.length - 1].sd3, sd2: sorted[sorted.length - 1].sd2, sd0: sorted[sorted.length - 1].sd0, sdM2: sorted[sorted.length - 1].sdM2, sdM3: sorted[sorted.length - 1].sdM3 };
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i+1];
    if (x >= p1.x && x <= p2.x) {
      const t = (x - p1.x) / (p2.x - p1.x);
      return {
        sd3: p1.sd3 + t * (p2.sd3 - p1.sd3),
        sd2: p1.sd2 + t * (p2.sd2 - p1.sd2),
        sd0: p1.sd0 + t * (p2.sd0 - p1.sd0),
        sdM2: p1.sdM2 + t * (p2.sdM2 - p1.sdM2),
        sdM3: p1.sdM3 + t * (p2.sdM3 - p1.sdM3),
      };
    }
  }
  return { sd3: sorted[0].sd3, sd2: sorted[0].sd2, sd0: sorted[0].sd0, sdM2: sorted[0].sdM2, sdM3: sorted[0].sdM3 };
};

export default function BalitaDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { loading: filtersLoading } = useFilters();

  // States
  const [balita, setBalita] = useState<any | null>(null);
  const [history, setHistory] = useState<Penimbangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kms' | 'history'>('kms');
  const [kmsType, setKmsType] = useState<'bbu' | 'tbu' | 'bbtb'>('bbu');

  useEffect(() => {
    if (filtersLoading) return;
    async function loadData() {
      try {
        setLoading(true);

        // Fetch profile
        const { data: bData, error: bErr } = await supabase
          .from('balitas')
          .select('*, posyandu:posyandus(nama_posyandu, kelurahan)')
          .eq('id', id)
          .maybeSingle();

        if (bErr) throw bErr;

        // Fetch history
        const { data: hData, error: hErr } = await supabase
          .from('penimbangans')
          .select('*')
          .eq('balita_id', id)
          .order('tanggal', { ascending: true });

        if (hErr) throw hErr;

        if (bData) {
          setBalita(bData as any);
          setHistory(hData || []);
        }
      } catch (err) {
        console.error('Error loading detail balita:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, filtersLoading]);

  // Calculate age in months
  const getAgeMonths = (dobStr?: string) => {
    if (!dobStr) return 0;
    const dob = new Date(dobStr);
    const today = new Date();
    let months = (today.getFullYear() - dob.getFullYear()) * 12;
    months -= dob.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
  };

  const getLineNames = () => {
    if (kmsType === 'bbu') {
      return {
        sd3: 'SD3 (Sangat Lebih)',
        sd2: 'SD2 (Lebih)',
        sd0: 'SD0 (Median)',
        sdM2: 'SD-2 (Kurang)',
        sdM3: 'SD-3 (Sangat Kurang)',
        child: 'Berat Badan Anak (kg)'
      };
    } else if (kmsType === 'tbu') {
      return {
        sd3: 'SD3 (Sangat Tinggi)',
        sd2: 'SD2 (Tinggi)',
        sd0: 'SD0 (Median)',
        sdM2: 'SD-2 (Pendek)',
        sdM3: 'SD-3 (Sangat Pendek)',
        child: 'Tinggi Badan Anak (cm)'
      };
    } else {
      return {
        sd3: 'SD3 (Sangat Gemuk)',
        sd2: 'SD2 (Gemuk)',
        sd0: 'SD0 (Median)',
        sdM2: 'SD-2 (Kurus)',
        sdM3: 'SD-3 (Sangat Kurus)',
        child: 'Berat Badan Anak (kg)'
      };
    }
  };

  const getKmsChartData = () => {
    if (!balita) return [];
    const isBoy = balita.jenis_kelamin === 'Laki-laki';
    
    if (kmsType === 'bbu') {
      const refPoints = isBoy ? bbuBoys : bbuGirls;
      const maxAge = Math.max(24, Math.min(60, ageMonths + 3));
      
      const data = [];
      for (let m = 0; m <= maxAge; m++) {
        const sds = interpolateSD(refPoints, m);
        const match = history.find(h => {
          const hAge = calculateAgeMonthsAtDate(balita.tanggal_lahir, h.tanggal);
          return hAge === m;
        });
        
        data.push({
          x: m,
          label: `${m} bln`,
          'SD3': parseFloat(sds.sd3.toFixed(1)),
          'SD2': parseFloat(sds.sd2.toFixed(1)),
          'SD0': parseFloat(sds.sd0.toFixed(1)),
          'SD-2': parseFloat(sds.sdM2.toFixed(1)),
          'SD-3': parseFloat(sds.sdM3.toFixed(1)),
          'Anak': match ? match.berat_badan : undefined
        });
      }
      return data;
    } else if (kmsType === 'tbu') {
      const refPoints = isBoy ? tbuBoys : tbuGirls;
      const maxAge = Math.max(24, Math.min(60, ageMonths + 3));
      
      const data = [];
      for (let m = 0; m <= maxAge; m++) {
        const sds = interpolateSD(refPoints, m);
        const match = history.find(h => {
          const hAge = calculateAgeMonthsAtDate(balita.tanggal_lahir, h.tanggal);
          return hAge === m;
        });
        
        data.push({
          x: m,
          label: `${m} bln`,
          'SD3': parseFloat(sds.sd3.toFixed(1)),
          'SD2': parseFloat(sds.sd2.toFixed(1)),
          'SD0': parseFloat(sds.sd0.toFixed(1)),
          'SD-2': parseFloat(sds.sdM2.toFixed(1)),
          'SD-3': parseFloat(sds.sdM3.toFixed(1)),
          'Anak': match ? match.tinggi_badan : undefined
        });
      }
      return data;
    } else {
      const refPoints = isBoy ? bbtbBoys : bbtbGirls;
      const childHeights = history.map(h => h.tinggi_badan).filter(Boolean);
      const minChildH = childHeights.length > 0 ? Math.min(...childHeights) : 45;
      const maxChildH = childHeights.length > 0 ? Math.max(...childHeights) : 110;
      const minH = Math.max(45, Math.floor(minChildH / 5) * 5);
      const maxH = Math.min(110, Math.ceil(maxChildH / 5) * 5 + 5);
      
      const data = [];
      for (let h = minH; h <= maxH; h += 2) {
        const sds = interpolateSD(refPoints, h);
        const match = history.find(item => {
          return Math.abs(item.tinggi_badan - h) <= 1;
        });
        
        data.push({
          x: h,
          label: `${h} cm`,
          'SD3': parseFloat(sds.sd3.toFixed(1)),
          'SD2': parseFloat(sds.sd2.toFixed(1)),
          'SD0': parseFloat(sds.sd0.toFixed(1)),
          'SD-2': parseFloat(sds.sdM2.toFixed(1)),
          'SD-3': parseFloat(sds.sdM3.toFixed(1)),
          'Anak': match ? match.berat_badan : undefined
        });
      }
      return data;
    }
  };

  const ageMonths = getAgeMonths(balita?.tanggal_lahir);
  const chartData = getKmsChartData();
  const lineNames = getLineNames();

  const latestMeas = history[history.length - 1] || null;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat profil detail...</div>;
  }

  if (!balita) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#ef4444' }}>Balita tidak ditemukan atau Anda tidak memiliki akses.</p>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginTop: '12px' }}>
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 1. TOP HEADER WITH BACK BUTTON */}
      <div className="filter-bar" style={{ padding: '8px 16px', marginBottom: '16px' }}>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
          <ArrowLeft size={14} />
          <span>Kembali ke Database</span>
        </button>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
          Detail Balita: {balita.nama}
        </span>
      </div>

      {/* 2. DUAL COLUMN DETAILS */}
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
            <Baby size={40} />
          </div>
          <h2 className="profile-card-name">{balita.nama}</h2>
          <span className="profile-card-sub">
            {balita.jenis_kelamin} • {ageMonths} Bulan
          </span>

          <button 
            onClick={() => router.push(`/balita?edit=${balita.id}`)}
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
              <span className="profile-details-val" style={{ fontFamily: 'monospace' }}>{balita.nik}</span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Lahir:</span>
              <span className="profile-details-val">
                {new Date(balita.tanggal_lahir).toLocaleDateString('id-ID')}
              </span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Posyandu:</span>
              <span className="profile-details-val">{balita.posyandu?.nama_posyandu || 'Melati 1'}</span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Kalurahan:</span>
              <span className="profile-details-val">{balita.posyandu?.kelurahan || 'Sukamaju'}</span>
            </div>
            <div className="profile-details-item">
              <span className="profile-details-label">Orang Tua / Wali:</span>
              <span className="profile-details-val">{balita.nama_ortu || '-'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tab Controls & Tab Body */}
        <div className="profile-tabs-right">
          {/* Header tabs */}
          <div className="tabs-header">
            <button 
              className={`tab-link ${activeTab === 'kms' ? 'active' : ''}`}
              onClick={() => setActiveTab('kms')}
            >
              Grafik KMS
            </button>
            <button 
              className={`tab-link ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Riwayat Timbang
            </button>
          </div>

          {/* Tab Body Content */}
          <div className="tab-body">
            {/* TAB 1: GRAFIK KMS */}
            {activeTab === 'kms' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {kmsType === 'bbu' ? 'Grafik Berat Badan menurut Umur (BB/U)' : kmsType === 'tbu' ? 'Grafik Tinggi Badan menurut Umur (TB/U)' : 'Grafik Berat Badan menurut Tinggi (BB/TB)'}
                  </h3>
                  
                  {/* Selector for KMS type */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => setKmsType('bbu')} 
                      className={`btn ${kmsType === 'bbu' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '8px' }}
                    >
                      BB/U
                    </button>
                    <button 
                      onClick={() => setKmsType('tbu')} 
                      className={`btn ${kmsType === 'tbu' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '8px' }}
                    >
                      TB/U
                    </button>
                    <button 
                      onClick={() => setKmsType('bbtb')} 
                      className={`btn ${kmsType === 'bbtb' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '8px' }}
                    >
                      BB/TB
                    </button>
                  </div>
                </div>
                
                {/* WHO Growth Chart */}
                <div style={{ width: '100%', height: '320px', marginBottom: '20px' }}>
                  {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
                        
                        {/* WHO Reference Lines */}
                        <Line type="monotone" name={lineNames.sd3} dataKey="SD3" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls />
                        <Line type="monotone" name={lineNames.sd2} dataKey="SD2" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls />
                        <Line type="monotone" name={lineNames.sd0} dataKey="SD0" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                        <Line type="monotone" name={lineNames.sdM2} dataKey="SD-2" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
                        <Line type="monotone" name={lineNames.sdM3} dataKey="SD-3" stroke="#ef4444" strokeWidth={1.5} dot={false} connectNulls />
                        
                        {/* Child actual values line */}
                        <Line 
                          type="monotone" 
                          name={lineNames.child} 
                          dataKey="Anak" 
                          stroke="#2563eb" 
                          strokeWidth={3} 
                          dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#2563eb' }} 
                          connectNulls 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px' }}>
                      Belum ada riwayat penimbangan untuk balita ini
                    </div>
                  )}
                </div>

                {/* Status Badges Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>STATUS BB/U (BERAT/USIA)</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, display: 'block', color: '#1e293b', margin: '2px 0' }}>
                      {latestMeas && latestMeas.zscore_bb_u !== null && latestMeas.zscore_bb_u !== undefined ? latestMeas.zscore_bb_u.toFixed(1) : '-'}
                    </span>
                    <span className="badge badge-success">{latestMeas?.status_bb_u || 'Normal'}</span>
                  </div>

                  <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>STATUS TB/U (TINGGI/USIA)</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, display: 'block', color: '#1e293b', margin: '2px 0' }}>
                      {latestMeas && latestMeas.zscore_tb_u !== null && latestMeas.zscore_tb_u !== undefined ? latestMeas.zscore_tb_u.toFixed(1) : '-'}
                    </span>
                    <span className="badge badge-success">{latestMeas?.status_tb_u || 'Normal'}</span>
                  </div>

                  <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>STATUS BB/TB (BERAT/TINGGI)</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, display: 'block', color: '#1e293b', margin: '2px 0' }}>
                      {latestMeas && latestMeas.zscore_bb_tb !== null && latestMeas.zscore_bb_tb !== undefined ? latestMeas.zscore_bb_tb.toFixed(1) : '-'}
                    </span>
                    <span className="badge badge-success">{latestMeas?.status_bb_tb || 'Normal'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RIWAYAT TIMBANG */}
            {activeTab === 'history' && (
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                  Rekam Medis Timbangan Lapangan
                </h3>
                <div className="table-container" style={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Berat (kg)</th>
                        <th>Tinggi (cm)</th>
                        <th>LILA (cm)</th>
                        <th>LK (cm)</th>
                        <th>Z-Score BB/U</th>
                        <th>Status Gizi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length > 0 ? (
                        history.map((h) => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 500 }}>{new Date(h.tanggal).toLocaleDateString('id-ID')}</td>
                            <td>{h.berat_badan} kg</td>
                            <td>{h.tinggi_badan} cm</td>
                            <td>{h.lingkar_lengan || '-'}</td>
                            <td>{h.lingkar_kepala || '-'}</td>
                            <td style={{ color: h.zscore_bb_u && h.zscore_bb_u < -2 ? '#ef4444' : 'inherit' }}>
                              {h.zscore_bb_u ? h.zscore_bb_u.toFixed(2) : '-'}
                            </td>
                            <td>
                              <span className={`badge ${h.status_bb_u?.includes('Buruk') || h.status_bb_u?.includes('Kurang') || h.status_bb_u?.includes('Sangat') ? 'badge-danger' : 'badge-success'}`}>
                                {h.status_bb_u || 'Normal'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', padding: '20px' }}>
                            Belum ada riwayat penimbangan untuk anak ini
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import { 
  Baby, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  User,
  Heart,
  Droplet,
  Users
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';



export default function Dashboard() {
  const { selectedDesa, setSelectedDesa, selectedPosyanduId, setSelectedPosyanduId, desaList, posyanduList, loading: filtersLoading } = useFilters();
  const [toggleMode, setToggleMode] = useState<'balita' | 'lansia'>('balita');
  const [mounted, setMounted] = useState(false);
  
  // Generate Indonesian month options
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(`${monthsIndo[d.getMonth()]} ${d.getFullYear()}`);
    }
    return options;
  };

  const monthOptionsList = generateMonthOptions();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${monthsIndo[now.getMonth()]} ${now.getFullYear()}`;
  });

  // Stats States
  const [stats, setStats] = useState({
    totalBalita: 0,
    kehadiran: 0,
    stunting: 0,
    wasting: 0,
    totalLansia: 0,
    lansiaKehadiran: 0,
    hipertensi: 0,
    diabetes: 0
  });
  const [anomalies, setAnomalies] = useState<any[]>([]);

  // Dynamic Chart States
  const [stuntingTrend, setStuntingTrend] = useState<any[]>([]);
  const [giziDistribution, setGiziDistribution] = useState<any[]>([]);
  const [lansiaTensiTrend, setLansiaTensiTrend] = useState<any[]>([]);
  const [lansiaRisk, setLansiaRisk] = useState<any[]>([]);
  const [posyanduStatuses, setPosyanduStatuses] = useState<any[]>([]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real count from Supabase if possible
  useEffect(() => {
    async function fetchRealStats() {
      try {
        // Parse selectedMonth (e.g. "Mei 2026")
        const monthMap: Record<string, number> = {
          'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
          'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12,
          'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'Jun': 6,
          'Jul': 7, 'Agt': 8, 'Sep': 9, 'Okt': 10, 'Nov': 11, 'Des': 12
        };
        const parts = selectedMonth.split(' ');
        const monthName = parts[0];
        const year = parseInt(parts[1]) || new Date().getFullYear();
        const monthNum = monthMap[monthName] || (new Date().getMonth() + 1);

        // Start and end dates for the selected month
        const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Get Posyandu IDs matching selected filters
        let posyanduIds: string[] = [];
        if (selectedPosyanduId !== 'all') {
          posyanduIds = [selectedPosyanduId];
        } else if (selectedDesa !== 'all') {
          posyanduIds = posyanduList
            .filter(p => p.kelurahan === selectedDesa)
            .map(p => p.id);
        } else {
          posyanduIds = posyanduList.map(p => p.id);
        }

        const safePosyanduIds = posyanduIds.length > 0 ? posyanduIds : ['00000000-0000-0000-0000-000000000000'];

        // Query balitas and lansias in these posyandus
        const [balitasRes, lansiasRes] = await Promise.all([
          supabase.from('balitas').select('id, jenis_kelamin, posyandu_id, tanggal_lahir').in('posyandu_id', safePosyanduIds),
          supabase.from('lansias').select('id, jenis_kelamin, posyandu_id').in('posyandu_id', safePosyanduIds)
        ]);

        const allBalitas = balitasRes.data || [];
        const activeBalitas = allBalitas.filter(b => {
          const dob = new Date(b.tanggal_lahir);
          const refDate = new Date(year, monthNum - 1, 1);
          let months = (refDate.getFullYear() - dob.getFullYear()) * 12;
          months -= dob.getMonth();
          months += refDate.getMonth();
          const age = months <= 0 ? 0 : months;
          return age < 60;
        });
        const activeLansias = lansiasRes.data || [];

        const activeBalitaIds = activeBalitas.map(b => b.id);
        const activeLansiaIds = activeLansias.map(l => l.id);

        const safeBalitaIds = activeBalitaIds.length > 0 ? activeBalitaIds : ['00000000-0000-0000-0000-000000000000'];
        const safeLansiaIds = activeLansiaIds.length > 0 ? activeLansiaIds : ['00000000-0000-0000-0000-000000000000'];

        // Fetch monthly weighings and checks
        const [penimbangansRes, pemeriksaanRes] = await Promise.all([
          supabase.from('penimbangans')
            .select('*')
            .in('balita_id', safeBalitaIds)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate),
          supabase.from('pemeriksaan_lansias')
            .select('*, lansia:lansias(jenis_kelamin)')
            .in('lansia_id', safeLansiaIds)
            .gte('tanggal_periksa', startDate)
            .lte('tanggal_periksa', endDate)
        ]);

        const monthlyPenimbangans = penimbangansRes.data || [];
        const monthlyPemeriksaans = pemeriksaanRes.data || [];

        const totalBalita = activeBalitas.length;
        const totalLansia = activeLansias.length;

        const balitaVisits = monthlyPenimbangans.length;
        const lansiaVisits = monthlyPemeriksaans.length;

        const kehadiran = totalBalita > 0 ? Math.round((balitaVisits / totalBalita) * 100) : 0;
        const lansiaKehadiran = totalLansia > 0 ? Math.round((lansiaVisits / totalLansia) * 100) : 0;

        // Stunting count
        const stuntingCount = monthlyPenimbangans.filter(p => 
          p.status_tb_u && (p.status_tb_u.includes('Pendek') || p.status_tb_u.includes('Sangat Pendek'))
        ).length;

        // Wasting count
        const wastingCount = monthlyPenimbangans.filter(p => 
          p.status_bb_tb && (p.status_bb_tb.includes('Buruk') || p.status_bb_tb.includes('Kurang'))
        ).length;

        // Lansia stats
        let hipertensiCount = 0;
        let diabetesCount = 0;
        let kolesterolCount = 0;
        let asamUratCount = 0;

        monthlyPemeriksaans.forEach(p => {
          const [sis, dias] = (p.tekanan_darah || '0/0').split('/').map(Number);
          const gender = p.lansia?.jenis_kelamin || 'Perempuan';
          const limitAsamUrat = gender === 'Laki-laki' ? 7.0 : 6.0;

          if (sis >= 140 || dias >= 90) hipertensiCount++;
          if (p.gula_darah > 200) diabetesCount++;
          if (p.kolesterol > 200) kolesterolCount++;
          if (p.asam_urat > limitAsamUrat) asamUratCount++;
        });

        setStats({
          totalBalita,
          kehadiran,
          stunting: stuntingCount,
          wasting: wastingCount,
          totalLansia,
          lansiaKehadiran,
          hipertensi: hipertensiCount,
          diabetes: diabetesCount
        });

        // Compute gizi distribution
        let giziBaik = 0;
        let giziKurang = 0;
        let giziBuruk = 0;

        monthlyPenimbangans.forEach(p => {
          const status = p.status_bb_u || '';
          if (status.includes('Normal') || status.includes('Lebih') || status.includes('Baik') || status.includes('N')) {
            giziBaik++;
          } else if (status.includes('Sangat Kurang') || status.includes('Buruk') || status.includes('SK')) {
            giziBuruk++;
          } else if (status.includes('Kurang') || status.includes('K')) {
            giziKurang++;
          } else {
            giziBaik++;
          }
        });

        const totalGizi = giziBaik + giziKurang + giziBuruk || 1;
        setGiziDistribution([
          { name: `Gizi Baik (${((giziBaik/totalGizi)*100).toFixed(1)}%)`, value: giziBaik, color: '#14B8A6' },
          { name: `Gizi Kurang (${((giziKurang/totalGizi)*100).toFixed(1)}%)`, value: giziKurang, color: '#ea580c' },
          { name: `Gizi Buruk (${((giziBuruk/totalGizi)*100).toFixed(1)}%)`, value: giziBuruk, color: '#e11d48' },
        ]);

        // Compute lansia Risk
        setLansiaRisk([
          { name: 'Hipertensi', Lansia: hipertensiCount, color: '#e11d48' },
          { name: 'Kolesterol', Lansia: kolesterolCount, color: '#ea580c' },
          { name: 'Diabetes', Lansia: diabetesCount, color: '#3b82f6' },
          { name: 'Asam Urat', Lansia: asamUratCount, color: '#14B8A6' },
        ]);

        // Compute stunting lines trend (last 12 months)
        const trends: { name: string; stunting: number; year: number; month: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(year, monthNum - 1 - i, 1);
          const mName = d.toLocaleDateString('id-ID', { month: 'short' });
          trends.push({ name: mName, stunting: 0, year: d.getFullYear(), month: d.getMonth() + 1 });
        }
        const trendStartDate = `${trends[0].year}-${String(trends[0].month).padStart(2, '0')}-01`;
        
        const { data: trendData } = await supabase.from('penimbangans')
          .select('tanggal, status_tb_u')
          .in('balita_id', safeBalitaIds)
          .gte('tanggal', trendStartDate)
          .lte('tanggal', endDate);

        (trendData || []).forEach(p => {
          const pDate = new Date(p.tanggal);
          const pYear = pDate.getFullYear();
          const pMonth = pDate.getMonth() + 1;
          const isStunted = p.status_tb_u && (p.status_tb_u.includes('Pendek') || p.status_tb_u.includes('Sangat Pendek'));
          if (isStunted) {
            const match = trends.find(t => t.year === pYear && t.month === pMonth);
            if (match) match.stunting++;
          }
        });

        setStuntingTrend(trends.map(t => ({ name: t.name, stunting: t.stunting })));

        // Compute lansia Tensi lines trend (last 6 months)
        const tensiTrends: { name: string; sistolik: number; diastolik: number; count: number; year: number; month: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(year, monthNum - 1 - i, 1);
          const mName = d.toLocaleDateString('id-ID', { month: 'short' });
          tensiTrends.push({ name: mName, sistolik: 0, diastolik: 0, count: 0, year: d.getFullYear(), month: d.getMonth() + 1 });
        }
        const tensiStartDate = `${tensiTrends[0].year}-${String(tensiTrends[0].month).padStart(2, '0')}-01`;

        const { data: tensiData } = await supabase.from('pemeriksaan_lansias')
          .select('tanggal_periksa, tekanan_darah')
          .in('lansia_id', safeLansiaIds)
          .gte('tanggal_periksa', tensiStartDate)
          .lte('tanggal_periksa', endDate);

        (tensiData || []).forEach(p => {
          const pDate = new Date(p.tanggal_periksa);
          const pYear = pDate.getFullYear();
          const pMonth = pDate.getMonth() + 1;
          const [sis, dias] = (p.tekanan_darah || '0/0').split('/').map(Number);
          if (sis > 0 && dias > 0) {
            const match = tensiTrends.find(t => t.year === pYear && t.month === pMonth);
            if (match) {
              match.sistolik += sis;
              match.diastolik += dias;
              match.count++;
            }
          }
        });

        setLansiaTensiTrend(tensiTrends.map(t => ({
          name: t.name,
          sistolik: t.count > 0 ? Math.round(t.sistolik / t.count) : 120,
          diastolik: t.count > 0 ? Math.round(t.diastolik / t.count) : 80
        })));

        // Group by posyandu_id to calculate submission status
        const posyStatusList = posyanduList
          .filter(p => selectedDesa === 'all' || p.kelurahan === selectedDesa)
          .map(posy => {
            const posyBalitas = activeBalitas.filter(b => b.posyandu_id === posy.id);
            const posyLansias = activeLansias.filter(l => l.posyandu_id === posy.id);
            
            const totalMembers = toggleMode === 'balita' ? posyBalitas.length : posyLansias.length;
            
            let checkedMembers = 0;
            if (toggleMode === 'balita') {
              const posyBalitaIds = new Set(posyBalitas.map(b => b.id));
              checkedMembers = monthlyPenimbangans.filter(p => posyBalitaIds.has(p.balita_id)).length;
            } else {
              const posyLansiaIds = new Set(posyLansias.map(l => l.id));
              checkedMembers = monthlyPemeriksaans.filter(p => posyLansiaIds.has(p.lansia_id)).length;
            }

            const percent = totalMembers > 0 ? Math.round((checkedMembers / totalMembers) * 100) : 0;
            
            let statusBadge = <span className="badge badge-danger">Belum Melapor</span>;
            if (percent === 100 && totalMembers > 0) {
              statusBadge = <span className="badge badge-success">Selesai (100%)</span>;
            } else if (percent > 0) {
              statusBadge = <span className="badge badge-warning">Proses ({percent}%)</span>;
            } else if (totalMembers === 0) {
              statusBadge = <span className="badge badge-success">Selesai (100%)</span>;
            }

            return {
              id: posy.id,
              nama: posy.nama_posyandu,
              desa: posy.kelurahan,
              tipe: posy.tipe_posyandu,
              badge: statusBadge
            };
          });

        setPosyanduStatuses(posyStatusList);

        // Fetch anomalies
        const { data: dbAnomalies } = await supabase
          .from('data_anomali_logs')
          .select('*')
          .order('tanggal_data', { ascending: false });

        if (dbAnomalies) {
          setAnomalies(dbAnomalies);
        }
      } catch (err) {
        console.warn('Could not load stats from DB:', err);
      }
    }
    
    if (mounted && !filtersLoading) {
      fetchRealStats();
    }
  }, [selectedDesa, selectedPosyanduId, selectedMonth, toggleMode, mounted, posyanduList, filtersLoading]);

  if (!mounted) return null;

  return (
    <div>
      {/* 1. FILTER BAR (TOGGLE & REGION SELECTORS) */}
      <div className="filter-bar">
        {/* Toggle Mode */}
        <div className="toggle-switch-container">
          <button 
            className={`toggle-btn ${toggleMode === 'balita' ? 'active' : ''}`}
            onClick={() => setToggleMode('balita')}
          >
            BALITA
          </button>
          <button 
            className={`toggle-btn ${toggleMode === 'lansia' ? 'active' : ''}`}
            onClick={() => setToggleMode('lansia')}
          >
            LANSIA
          </button>
        </div>

        {/* Filters */}
        <div className="filter-left">
          {/* Desa Filter */}
          <select 
            className="header-select"
            value={selectedDesa}
            onChange={(e) => {
              setSelectedDesa(e.target.value);
              setSelectedPosyanduId('all'); // Reset posyandu when desa changes
            }}
          >
            <option value="all">Semua Kalurahan</option>
            {desaList.map(desa => (
              <option key={desa} value={desa}>{desa}</option>
            ))}
            {desaList.length === 0 && (
              <option value="" disabled>Belum ada kalurahan terdaftar</option>
            )}
          </select>

          {/* Posyandu Filter */}
          <select 
            className="header-select"
            value={selectedPosyanduId}
            onChange={(e) => setSelectedPosyanduId(e.target.value)}
          >
            <option value="all">Semua Posyandu</option>
            {posyanduList.map(posy => (
              <option key={posy.id} value={posy.id}>{posy.nama_posyandu}</option>
            ))}
            {posyanduList.length === 0 && (
              <option value="" disabled>Belum ada posyandu terdaftar</option>
            )}
          </select>

          {/* Month selector */}
          <select 
            className="header-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            suppressHydrationWarning={true}
          >
            {monthOptionsList.map(mOpt => (
              <option key={mOpt} value={mOpt} suppressHydrationWarning={true}>{mOpt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. CARD METRICS (BALITA VS LANSIA) */}
      {toggleMode === 'balita' ? (
        <div className="grid-cards-4">
          {/* Card 1: Total Balita */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <Baby size={14} style={{ color: '#14B8A6' }} />
              <span>Total Balita</span>
            </div>
            <div className="metric-card-value">{stats.totalBalita.toLocaleString('id-ID')}</div>
          </div>

          {/* Card 2: Kehadiran */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <Users size={14} style={{ color: '#2563eb' }} />
              <span>Kehadiran Penimbangan</span>
            </div>
            <div className="metric-card-value">{stats.kehadiran}%</div>
          </div>

          {/* Card 3: Stunting */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <AlertTriangle size={14} style={{ color: '#e11d48' }} />
              <span>Balita Terindikasi Stunting</span>
            </div>
            <div className="metric-card-value">{stats.stunting}</div>
          </div>

          {/* Card 4: Wasting */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <Activity size={14} style={{ color: '#ea580c' }} />
              <span>Balita Wasting (Kurus)</span>
            </div>
            <div className="metric-card-value">{stats.wasting}</div>
          </div>
        </div>
      ) : (
        <div className="grid-cards-4">
          {/* Card 1: Total Lansia */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <User size={14} style={{ color: '#14B8A6' }} />
              <span>Total Lansia</span>
            </div>
            <div className="metric-card-value">{stats.totalLansia.toLocaleString('id-ID')}</div>
          </div>

          {/* Card 2: Pemeriksaan */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <Activity size={14} style={{ color: '#2563eb' }} />
              <span>Lansia Diperiksa</span>
            </div>
            <div className="metric-card-value">{stats.lansiaKehadiran}%</div>
          </div>

          {/* Card 3: Hipertensi */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <Heart size={14} style={{ color: '#e11d48' }} />
              <span>Lansia Hipertensi</span>
            </div>
            <div className="metric-card-value">{stats.hipertensi}</div>
          </div>

          {/* Card 4: Diabetes */}
          <div className="card metric-card">
            <div className="metric-card-title">
              <Droplet size={14} style={{ color: '#ea580c' }} />
              <span>Lansia Diabetes</span>
            </div>
            <div className="metric-card-value">{stats.diabetes}</div>
          </div>
        </div>
      )}

      {/* 3. CHARTS GRID */}
      {toggleMode === 'balita' ? (
        <div className="grid-dashboard-main">
          {/* Chart Left: Stunting Trend */}
          <div className="card chart-card">
            <div className="card-header-compact">
              <span className="card-title-compact">Trend Stunting 12 Bulan Terakhir</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Semua Posyandu</span>
            </div>
            <div style={{ width: '100%', height: '220px' }}>
              {stuntingTrend.length > 0 && stuntingTrend.some(t => t.stunting > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stuntingTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="stunting" 
                      stroke="#2563eb" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, strokeWidth: 1, fill: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px' }}>
                  Tidak ada trend stunting dalam 12 bulan terakhir
                </div>
              )}
            </div>
          </div>

          {/* Chart Right: Nutrition doughnut */}
          <div className="card chart-card">
            <div className="card-header-compact">
              <span className="card-title-compact">Sebaran Status Gizi (BB/U)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', height: '220px', justifyContent: 'center' }}>
              {giziDistribution.length > 0 && giziDistribution.some(t => t.value > 0) ? (
                <>
                  <div style={{ height: '120px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={giziDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {giziDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends list */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px' }}>
                    {giziDistribution.map((item) => (
                      <div key={item.name} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                          <span style={{ color: '#64748b' }}>{item.name}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.value.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px', margin: '10px' }}>
                  Tidak ada data status gizi bulan ini
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-dashboard-main">
          {/* Chart Left: Blood Pressure Line Chart */}
          <div className="card chart-card">
            <div className="card-header-compact">
              <span className="card-title-compact">Tren Rata-rata Tekanan Darah Lansia</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Unit mmHg</span>
            </div>
            <div style={{ width: '100%', height: '220px' }}>
              {lansiaTensiTrend.length > 0 && lansiaTensiTrend.some(t => t.sistolik > 120 || t.diastolik > 80) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lansiaTensiTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[60, 160]} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                    <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" name="Sistolik (Atas)" dataKey="sistolik" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" name="Diastolik (Bawah)" dataKey="diastolik" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px' }}>
                  Tidak ada data tren tekanan darah 6 bulan terakhir
                </div>
              )}
            </div>
          </div>

          {/* Chart Right: Degenerative Disease Bar chart */}
          <div className="card chart-card">
            <div className="card-header-compact">
              <span className="card-title-compact">Risiko Penyakit Degeneratif</span>
            </div>
            <div style={{ width: '100%', height: '220px' }}>
              {lansiaRisk.length > 0 && lansiaRisk.some(t => t.Lansia > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lansiaRisk} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Lansia" fill="#14B8A6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px' }}>
                  Tidak ada data risiko penyakit degeneratif bulan ini
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. LOWER CONTAINER (MONTHLY FILLING STATUS & AI ANOMALIES) */}
      <div className="grid-dashboard-main">
        {/* Left: Monthly Submission Table */}
        <div className="card" style={{ minHeight: '220px' }}>
          <div className="card-header-compact">
            <span className="card-title-compact">
              Status Pengisian Data Posyandu - {selectedMonth}
            </span>
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Posyandu</th>
                  <th>Desa/Kelurahan</th>
                  <th>Tipe Layanan</th>
                  <th>Status Input</th>
                </tr>
              </thead>
              <tbody>
                {posyanduStatuses.map((row) => (
                  <tr key={row.id}>
                    <td>{row.nama}</td>
                    <td>{row.desa}</td>
                    <td><span className="badge badge-info">{row.tipe === 'balita' ? 'Balita' : 'Lansia'}</span></td>
                    <td>{row.badge}</td>
                  </tr>
                ))}
                {posyanduStatuses.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', padding: '20px' }}>
                      Tidak ada unit posyandu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AI Anomaly logs */}
        <div className="card" style={{ minHeight: '220px' }}>
          <div className="card-header-compact">
            <span className="card-title-compact" style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} />
              Anomali Terdeteksi oleh AI
            </span>
          </div>

          <div className="anomaly-list">
            {anomalies.length > 0 && anomalies.filter(a => a.tipe_kategori === toggleMode).length > 0 ? (
              anomalies
                .filter(a => a.tipe_kategori === toggleMode)
                .map((a) => (
                  <div 
                    key={a.id} 
                    className="anomaly-item"
                    style={{
                      backgroundColor: a.status_verifikasi === 'valid' ? '#f0fdf4' : a.status_verifikasi === 'perlu_koreksi' ? '#fff7ed' : '#fff1f2',
                      borderLeftColor: a.status_verifikasi === 'valid' ? '#16a34a' : a.status_verifikasi === 'perlu_koreksi' ? '#ea580c' : '#e11d48'
                    }}
                  >
                    <div>
                      <span className="anomaly-title" style={{ color: a.status_verifikasi === 'valid' ? '#166534' : a.status_verifikasi === 'perlu_koreksi' ? '#c2410c' : '#9f1239' }}>
                        {a.nama_subjek} - {a.indikator_anomali}
                      </span>
                      <p className="anomaly-desc" style={{ color: a.status_verifikasi === 'valid' ? '#15803d' : a.status_verifikasi === 'perlu_koreksi' ? '#c2410c' : '#be123c' }}>
                        {a.deskripsi_anomali} (Unit: {a.nama_posyandu})
                      </p>
                      <div className="anomaly-meta">Deteksi AI - Tanggal: {new Date(a.tanggal_data).toLocaleDateString('id-ID')}</div>
                    </div>
                  </div>
                ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '11px', border: '1px dashed #cbd5e1', borderRadius: '12px', margin: '12px' }}>
                Tidak ada anomali terdeteksi untuk periode ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

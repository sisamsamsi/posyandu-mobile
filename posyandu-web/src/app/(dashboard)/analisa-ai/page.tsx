'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFilters } from '@/context/FilterContext';
import { supabase } from '@/lib/supabase';
import AIInsightBox from '@/components/ui/AIInsightBox';

import { 
  BrainCircuit, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  Baby, 
  User, 
  Users, 
  MapPin, 
  ClipboardList, 
  Activity,
  Heart,
  Calendar
} from 'lucide-react';
import { 
  LineChart,
  Line,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell
} from 'recharts';

// Custom Markdown Renderer for Groq AI Response (removes external library dependencies)
const renderMarkdown = (text: string) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('# ')) {
      return (
        <h1 
          key={idx} 
          style={{ 
            fontSize: '18px', 
            fontWeight: 800, 
            color: '#0f766e', 
            margin: '22px 0 12px 0', 
            borderBottom: '2px solid #ccfbf1', 
            paddingBottom: '8px' 
          }}
        >
          {line.replace('# ', '')}
        </h1>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 
          key={idx} 
          style={{ 
            fontSize: '14px', 
            fontWeight: 700, 
            color: '#1e293b', 
            margin: '18px 0 8px 0', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}
        >
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} style={{ fontSize: '12px', fontWeight: 600, color: '#475569', margin: '14px 0 6px 0' }}>
          {line.replace('### ', '')}
        </h3>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const clean = line.replace(/^[\-\*]\s+/, '');
      return (
        <li 
          key={idx} 
          style={{ 
            marginLeft: '20px', 
            fontSize: '12px', 
            color: '#334155', 
            lineHeight: '1.6', 
            marginBottom: '6px',
            listStyleType: 'disc'
          }}
        >
          {parseBold(clean)}
        </li>
      );
    }
    if (line.trim() === '') {
      return <div key={idx} style={{ height: '8px' }} />;
    }
    
    // Check if it looks like a numbered list
    const numListMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      return (
        <li 
          key={idx} 
          style={{ 
            marginLeft: '20px', 
            fontSize: '12px', 
            color: '#334155', 
            lineHeight: '1.6', 
            marginBottom: '6px',
            listStyleType: 'decimal'
          }}
        >
          {parseBold(numListMatch[2])}
        </li>
      );
    }

    return (
      <p key={idx} style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
        {parseBold(line)}
      </p>
    );
  });
};

const parseBold = (text: string) => {
  const parts = text.split('**');
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ fontWeight: 700, color: '#1e293b' }}>{part}</strong> : part);
};

export default function AnalisaAiPage() {
  const { selectedDesa, setSelectedDesa, selectedPosyanduId, setSelectedPosyanduId, desaList, posyanduList, loading: filtersLoading } = useFilters();
  const [toggleMode, setToggleMode] = useState<'balita' | 'lansia'>('balita');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState('');

  // Local Month Filter (matching dashboard logic)
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
  const [selectedMonth, setSelectedMonth] = useState(() => `${monthsIndo[new Date().getMonth()]} ${new Date().getFullYear()}`);

  // Visualizations & Aggregated Data States
  const [totals, setTotals] = useState({ totalActive: 0, checked: 0, stunting: 0, wasting: 0, underweight: 0 });
  const [regionMapData, setRegionMapData] = useState<any[]>([]);
  const [trendChartData, setTrendChartData] = useState<any[]>([]);
  const [bbuPieData, setBbuPieData] = useState<any[]>([]);
  const [tbuPieData, setTbuPieData] = useState<any[]>([]);
  const [bbtbPieData, setBbtbPieData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [immunizationCoverage, setImmunizationCoverage] = useState<any[]>([]);
  const [counselingTopics, setCounselingTopics] = useState<any[]>([]);

  // Fetch and Aggregate stats based on current filters
  const loadStats = async () => {
    try {
      setLoading(true);
      
      const monthMap: Record<string, number> = {
        'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
        'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
      };
      const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      const parts = selectedMonth.split(' ');
      const monthName = parts[0];
      const year = parseInt(parts[1]) || new Date().getFullYear();
      const monthNum = monthMap[monthName] || (new Date().getMonth() + 1);

      // Date range for single-month stats (for totals/pie/etc)
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Date range for full year trend: Jan 1 → last day of selected month
      const yearStart = `${year}-01-01`;

      // Filter Posyandus
      let activePosyandus = posyanduList;
      if (selectedPosyanduId !== 'all') {
        activePosyandus = posyanduList.filter(p => p.id === selectedPosyanduId);
      } else if (selectedDesa !== 'all') {
        activePosyandus = posyanduList.filter(p => p.kelurahan === selectedDesa);
      }
      
      const posyanduIds = activePosyandus.map(p => p.id);
      const safePosyanduIds = posyanduIds.length > 0 ? posyanduIds : ['00000000-0000-0000-0000-000000000000'];

      // Query both balitas and lansias in parallel for target Posyandus
      const [balitasRes, lansiasRes] = await Promise.all([
        supabase.from('balitas').select('id, nama, tanggal_lahir, posyandu_id, posyandu:posyandus(kelurahan, nama_posyandu)').in('posyandu_id', safePosyanduIds),
        supabase.from('lansias').select('id, nama, posyandu_id, posyandu:posyandus(kelurahan, nama_posyandu)').in('posyandu_id', safePosyanduIds)
      ]);

      if (balitasRes.error) throw balitasRes.error;
      if (lansiasRes.error) throw lansiasRes.error;

      const allBalitas = balitasRes.data || [];
      const allLansias = lansiasRes.data || [];

      // Filter out balitas aged >= 60 months on selected period
      const activeBalitas = allBalitas.filter(b => {
        const dob = new Date(b.tanggal_lahir);
        const refDate = new Date(year, monthNum - 1, 1);
        let months = (refDate.getFullYear() - dob.getFullYear()) * 12;
        months -= dob.getMonth();
        months += refDate.getMonth();
        const age = months <= 0 ? 0 : months;
        return age < 60;
      });

      // Calculate region comparison chart dataset (Balita & Lansia)
      let mapChartData: any[] = [];
      if (selectedDesa === 'all') {
        // Compare each Kalurahan in desaList
        mapChartData = desaList.map(desaName => {
          const balitaCount = activeBalitas.filter(b => (b.posyandu as any)?.kelurahan === desaName).length;
          const lansiaCount = allLansias.filter(l => (l.posyandu as any)?.kelurahan === desaName).length;
          return {
            name: desaName,
            'Balita': balitaCount,
            'Lansia': lansiaCount
          };
        });
      } else {
        // Compare each Posyandu unit in the selected Kalurahan
        mapChartData = activePosyandus.map(posy => {
          const balitaCount = activeBalitas.filter(b => b.posyandu_id === posy.id).length;
          const lansiaCount = allLansias.filter(l => l.posyandu_id === posy.id).length;
          return {
            name: posy.nama_posyandu,
            'Balita': balitaCount,
            'Lansia': lansiaCount
          };
        });
      }
      setRegionMapData(mapChartData);

      if (toggleMode === 'balita') {
        // --- BALITA MODE AGGREGATION ---
        const activeBalitaIds = activeBalitas.map(b => b.id);
        const safeBalitaIds = activeBalitaIds.length > 0 ? activeBalitaIds : ['00000000-0000-0000-0000-000000000000'];

        // Query penimbangans (full year for trend), imunisasi, and penyuluhans in parallel
        const [penimbangansAllRes, penimbangansRes, imunisasiRes, penyuluhansRes] = await Promise.all([
          supabase.from('penimbangans').select('tanggal, status_tb_u, status_bb_u, status_bb_tb').in('balita_id', safeBalitaIds).gte('tanggal', yearStart).lte('tanggal', endDate),
          supabase.from('penimbangans').select('*').in('balita_id', safeBalitaIds).gte('tanggal', startDate).lte('tanggal', endDate),
          supabase.from('imunisasi').select('*').in('balita_id', safeBalitaIds),
          supabase.from('penyuluhans').select('*').in('balita_id', safeBalitaIds).gte('tanggal', startDate).lte('tanggal', endDate)
        ]);

        if (penimbangansRes.error) throw penimbangansRes.error;

        // Build per-month trend data from Jan to selected month
        const trendMonths: any[] = [];
        for (let m = 1; m <= monthNum; m++) {
          const mStart = `${year}-${String(m).padStart(2, '0')}-01`;
          const mLast = new Date(year, m, 0).getDate();
          const mEnd = `${year}-${String(m).padStart(2, '0')}-${String(mLast).padStart(2, '0')}`;
          const mData = (penimbangansAllRes.data || []).filter(r => r.tanggal >= mStart && r.tanggal <= mEnd);
          let stunting = 0, wasting = 0, underweight = 0;
          mData.forEach(r => {
            if (r.status_tb_u && (r.status_tb_u.includes('Pendek') || r.status_tb_u.includes('Sangat Pendek'))) stunting++;
            if (r.status_bb_tb && (r.status_bb_tb.includes('Buruk') || r.status_bb_tb.includes('Kurang'))) wasting++;
            if (r.status_bb_u && (r.status_bb_u.includes('Kurang') || r.status_bb_u.includes('Sangat Kurang'))) underweight++;
          });
          trendMonths.push({ bulan: monthShort[m - 1], Stunting: stunting, Wasting: wasting, 'Gizi Kurang': underweight });
        }
        setTrendChartData(trendMonths);

        const measurements = penimbangansRes.data || [];
        const imunisasiData = imunisasiRes.data || [];
        const penyuluhansData = penyuluhansRes.data || [];
        
        let stuntingTotal = 0;
        let wastingTotal = 0;
        let underweightTotal = 0;

        let bbuSangatKurang = 0;
        let bbuKurang = 0;
        let bbuNormal = 0;
        let bbuRisikoLebih = 0;

        let tbuSangatPendek = 0;
        let tbuPendek = 0;
        let tbuNormal = 0;
        let tbuTinggi = 0;

        let bbtbGiziBuruk = 0;
        let bbtbGiziKurang = 0;
        let bbtbGiziBaik = 0;
        let bbtbRisikoGiziLebih = 0;
        let bbtbGiziLebih = 0;
        let bbtbObesitas = 0;

        measurements.forEach(m => {
          const isStunted = m.status_tb_u && (m.status_tb_u.includes('Pendek') || m.status_tb_u.includes('Sangat Pendek'));
          const isWasted = m.status_bb_tb && (m.status_bb_tb.includes('Buruk') || m.status_bb_tb.includes('Kurang'));
          const isUnderweight = m.status_bb_u && (m.status_bb_u.includes('Kurang') || m.status_bb_u.includes('Sangat Kurang'));

          if (isStunted) stuntingTotal++;
          if (isWasted) wastingTotal++;
          if (isUnderweight) underweightTotal++;

          // BB/U
          const sBbu = (m.status_bb_u || '').toLowerCase();
          if (sBbu.includes('sangat kurang') || sBbu.includes('severely underweight') || sBbu === 'sk') {
            bbuSangatKurang++;
          } else if (sBbu.includes('kurang') || sBbu.includes('underweight') || sBbu === 'k') {
            bbuKurang++;
          } else if (sBbu.includes('risiko lebih') || sBbu.includes('risk of overweight')) {
            bbuRisikoLebih++;
          } else if (sBbu.includes('normal') || sBbu === 'n' || sBbu !== '') {
            bbuNormal++;
          }

          // TB/U
          const sTbu = (m.status_tb_u || '').toLowerCase();
          if (sTbu.includes('sangat pendek') || sTbu.includes('severely stunted') || sTbu === 'sp') {
            tbuSangatPendek++;
          } else if (sTbu.includes('pendek') || sTbu.includes('stunted')) {
            tbuPendek++;
          } else if (sTbu.includes('tinggi')) {
            tbuTinggi++;
          } else if (sTbu.includes('normal') || sTbu !== '') {
            tbuNormal++;
          }

          // BB/TB
          const sBbtb = (m.status_bb_tb || '').toLowerCase();
          if (sBbtb.includes('gizi buruk') || sBbtb.includes('severely wasted')) {
            bbtbGiziBuruk++;
          } else if (sBbtb.includes('gizi kurang') || sBbtb.includes('wasted')) {
            bbtbGiziKurang++;
          } else if (sBbtb.includes('risiko gizi lebih') || sBbtb.includes('risk of overweight')) {
            bbtbRisikoGiziLebih++;
          } else if (sBbtb.includes('gizi lebih') || sBbtb.includes('overweight')) {
            bbtbGiziLebih++;
          } else if (sBbtb.includes('obesitas') || sBbtb.includes('obese')) {
            bbtbObesitas++;
          } else if (sBbtb.includes('gizi baik') || sBbtb.includes('normal') || sBbtb !== '') {
            bbtbGiziBaik++;
          }
        });

        setTotals({
          totalActive: activeBalitas.length,
          checked: measurements.length,
          stunting: stuntingTotal,
          wasting: wastingTotal,
          underweight: underweightTotal
        });
        
        const totalBbu = (bbuSangatKurang + bbuKurang + bbuNormal + bbuRisikoLebih) || 1;
        setBbuPieData([
          { name: `Normal (${((bbuNormal/totalBbu)*100).toFixed(1)}%)`, value: bbuNormal, color: '#14B8A6' },
          { name: `Kurang (${((bbuKurang/totalBbu)*100).toFixed(1)}%)`, value: bbuKurang, color: '#ea580c' },
          { name: `Sangat Kurang (${((bbuSangatKurang/totalBbu)*100).toFixed(1)}%)`, value: bbuSangatKurang, color: '#e11d48' },
          { name: `Risiko Lebih (${((bbuRisikoLebih/totalBbu)*100).toFixed(1)}%)`, value: bbuRisikoLebih, color: '#3b82f6' }
        ]);

        const totalTbu = (tbuSangatPendek + tbuPendek + tbuNormal + tbuTinggi) || 1;
        setTbuPieData([
          { name: `Normal (${((tbuNormal/totalTbu)*100).toFixed(1)}%)`, value: tbuNormal, color: '#14B8A6' },
          { name: `Pendek (${((tbuPendek/totalTbu)*100).toFixed(1)}%)`, value: tbuPendek, color: '#ea580c' },
          { name: `Sangat Pendek (${((tbuSangatPendek/totalTbu)*100).toFixed(1)}%)`, value: tbuSangatPendek, color: '#e11d48' },
          { name: `Tinggi (${((tbuTinggi/totalTbu)*100).toFixed(1)}%)`, value: tbuTinggi, color: '#3b82f6' }
        ]);

        const totalBbtb = (bbtbGiziBuruk + bbtbGiziKurang + bbtbGiziBaik + bbtbRisikoGiziLebih + bbtbGiziLebih + bbtbObesitas) || 1;
        setBbtbPieData([
          { name: `Gizi Baik (${((bbtbGiziBaik/totalBbtb)*100).toFixed(1)}%)`, value: bbtbGiziBaik, color: '#14B8A6' },
          { name: `Gizi Kurang (${((bbtbGiziKurang/totalBbtb)*100).toFixed(1)}%)`, value: bbtbGiziKurang, color: '#ea580c' },
          { name: `Gizi Buruk (${((bbtbGiziBuruk/totalBbtb)*100).toFixed(1)}%)`, value: bbtbGiziBuruk, color: '#e11d48' },
          { name: `Risiko Lebih (${((bbtbRisikoGiziLebih/totalBbtb)*100).toFixed(1)}%)`, value: bbtbRisikoGiziLebih, color: '#f59e0b' },
          { name: `Gizi Lebih (${((bbtbGiziLebih/totalBbtb)*100).toFixed(1)}%)`, value: bbtbGiziLebih, color: '#3b82f6' },
          { name: `Obesitas (${((bbtbObesitas/totalBbtb)*100).toFixed(1)}%)`, value: bbtbObesitas, color: '#6366f1' }
        ]);

        // Calculate immunizations (Only count toddlers born in 2023 or later, matching the mobile version)
        const targetImunisasiBalitas = activeBalitas.filter(b => new Date(b.tanggal_lahir).getFullYear() >= 2023);
        const totalBalitaImunisasi = targetImunisasiBalitas.length || 1;
        const targetImunisasiIds = new Set(targetImunisasiBalitas.map(b => b.id));
        let hb0Count = 0;
        let bcgCount = 0;
        let penta1Count = 0;
        let penta2Count = 0;
        let penta3Count = 0;
        let ipv1Count = 0;
        let ipv2Count = 0;
        let ipv3Count = 0;
        let pcv1Count = 0;
        let pcv2Count = 0;
        let pcv3Count = 0;
        let rv1Count = 0;
        let rv2Count = 0;
        let rv3Count = 0;
        let mrCount = 0;
        let jeCount = 0;
        let boosterPentaCount = 0;
        let boosterMrCount = 0;

        imunisasiData.forEach(im => {
          if (!targetImunisasiIds.has(im.balita_id)) return;
          if (im.hb0_date) hb0Count++;
          if (im.bcg_date) bcgCount++;
          if (im.penta_1_date) penta1Count++;
          if (im.penta_2_date) penta2Count++;
          if (im.penta_3_date) penta3Count++;
          if (im.ipv_1_date) ipv1Count++;
          if (im.ipv_2_date) ipv2Count++;
          if (im.ipv_3_date) ipv3Count++;
          if (im.pcv_1_date) pcv1Count++;
          if (im.pcv_2_date) pcv2Count++;
          if (im.pcv_3_date) pcv3Count++;
          if (im.rv_1_date) rv1Count++;
          if (im.rv_2_date) rv2Count++;
          if (im.rv_3_date) rv3Count++;
          if (im.mr_date) mrCount++;
          if (im.je_date) jeCount++;
          if (im.booster_penta_date) boosterPentaCount++;
          if (im.booster_mr_date) boosterMrCount++;
        });

        setImmunizationCoverage([
          { vaccine: 'HB-0 (0-7 hari)', percentage: Math.round((hb0Count / totalBalitaImunisasi) * 100), count: hb0Count, total: totalBalitaImunisasi, color: '#14B8A6' },
          { vaccine: 'BCG (TBC)', percentage: Math.round((bcgCount / totalBalitaImunisasi) * 100), count: bcgCount, total: totalBalitaImunisasi, color: '#3b82f6' },
          { vaccine: 'DPT-HB-Hib 1 (Penta 1)', percentage: Math.round((penta1Count / totalBalitaImunisasi) * 100), count: penta1Count, total: totalBalitaImunisasi, color: '#ea580c' },
          { vaccine: 'DPT-HB-Hib 2 (Penta 2)', percentage: Math.round((penta2Count / totalBalitaImunisasi) * 100), count: penta2Count, total: totalBalitaImunisasi, color: '#f97316' },
          { vaccine: 'DPT-HB-Hib 3 (Penta 3)', percentage: Math.round((penta3Count / totalBalitaImunisasi) * 100), count: penta3Count, total: totalBalitaImunisasi, color: '#e11d48' },
          { vaccine: 'Polio IPV 1', percentage: Math.round((ipv1Count / totalBalitaImunisasi) * 100), count: ipv1Count, total: totalBalitaImunisasi, color: '#6366f1' },
          { vaccine: 'Polio IPV 2', percentage: Math.round((ipv2Count / totalBalitaImunisasi) * 100), count: ipv2Count, total: totalBalitaImunisasi, color: '#818cf8' },
          { vaccine: 'Polio IPV 3', percentage: Math.round((ipv3Count / totalBalitaImunisasi) * 100), count: ipv3Count, total: totalBalitaImunisasi, color: '#4f46e5' },
          { vaccine: 'PCV 1', percentage: Math.round((pcv1Count / totalBalitaImunisasi) * 100), count: pcv1Count, total: totalBalitaImunisasi, color: '#10b981' },
          { vaccine: 'PCV 2', percentage: Math.round((pcv2Count / totalBalitaImunisasi) * 100), count: pcv2Count, total: totalBalitaImunisasi, color: '#34d399' },
          { vaccine: 'PCV 3', percentage: Math.round((pcv3Count / totalBalitaImunisasi) * 100), count: pcv3Count, total: totalBalitaImunisasi, color: '#059669' },
          { vaccine: 'Rotavirus 1', percentage: Math.round((rv1Count / totalBalitaImunisasi) * 100), count: rv1Count, total: totalBalitaImunisasi, color: '#84cc16' },
          { vaccine: 'Rotavirus 2', percentage: Math.round((rv2Count / totalBalitaImunisasi) * 100), count: rv2Count, total: totalBalitaImunisasi, color: '#a3e635' },
          { vaccine: 'Rotavirus 3', percentage: Math.round((rv3Count / totalBalitaImunisasi) * 100), count: rv3Count, total: totalBalitaImunisasi, color: '#65a30d' },
          { vaccine: 'Campak / MR', percentage: Math.round((mrCount / totalBalitaImunisasi) * 100), count: mrCount, total: totalBalitaImunisasi, color: '#f59e0b' },
          { vaccine: 'JE (Japanese Encephalitis)', percentage: Math.round((jeCount / totalBalitaImunisasi) * 100), count: jeCount, total: totalBalitaImunisasi, color: '#8b5cf6' },
          { vaccine: 'Booster DPT-HB-Hib', percentage: Math.round((boosterPentaCount / totalBalitaImunisasi) * 100), count: boosterPentaCount, total: totalBalitaImunisasi, color: '#ec4899' },
          { vaccine: 'Booster Campak / MR', percentage: Math.round((boosterMrCount / totalBalitaImunisasi) * 100), count: boosterMrCount, total: totalBalitaImunisasi, color: '#db2777' }
        ]);

        // Calculate AI counseling topics
        const topicCounts: Record<string, number> = {};
        penyuluhansData.forEach((p: any) => {
          const list = Array.isArray(p.pertanyaan) ? p.pertanyaan : [p.pertanyaan];
          list.forEach((q: any) => {
            if (!q) return;
            const text = q.toLowerCase();
            let topic = 'Lain-lain';
            if (text.includes('makan') || text.includes('gizi') || text.includes('suap') || text.includes('mpasi') || text.includes('nafsu')) {
              topic = 'Nutrisi & MPASI';
            } else if (text.includes('berat') || text.includes('bb') || text.includes('timbang') || text.includes('kurus') || text.includes('gemuk')) {
              topic = 'Pertumbuhan (Berat Badan)';
            } else if (text.includes('tinggi') || text.includes('tb') || text.includes('pendek') || text.includes('stunting')) {
              topic = 'Pertumbuhan (Tinggi/Stunting)';
            } else if (text.includes('imunisasi') || text.includes('vaksin') || text.includes('suntik') || text.includes('demam')) {
              topic = 'Imunisasi & Kejadian Ikutan (KIPI)';
            } else if (text.includes('sakit') || text.includes('diare') || text.includes('batuk') || text.includes('pilek') || text.includes('panas')) {
              topic = 'Kesehatan Anak & Penyakit Umum';
            } else if (text.includes('tidur') || text.includes('aktif') || text.includes('tumbuh kembang') || text.includes('bicara')) {
              topic = 'Perkembangan Motorik & Tidur';
            }
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        });

        const sortedTopics = Object.entries(topicCounts)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count);

        setCounselingTopics(sortedTopics);

      } else {
        // --- LANSIA MODE AGGREGATION ---
        const activeLansiaIds = allLansias.map(l => l.id);
        const safeLansiaIds = activeLansiaIds.length > 0 ? activeLansiaIds : ['00000000-0000-0000-0000-000000000000'];

        // Fetch full-year data for trend chart + selected month data for totals/pie
        const [pemeriksaanAllRes, pemeriksaanRes] = await Promise.all([
          supabase.from('pemeriksaan_lansias').select('tanggal_periksa, tekanan_darah, gula_darah, kolesterol, asam_urat, lansia:lansias(jenis_kelamin)').in('lansia_id', safeLansiaIds).gte('tanggal_periksa', yearStart).lte('tanggal_periksa', endDate),
          supabase.from('pemeriksaan_lansias').select('*, lansia:lansias(jenis_kelamin, posyandu_id)').in('lansia_id', safeLansiaIds).gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate)
        ]);

        if (pemeriksaanRes.error) throw pemeriksaanRes.error;

        // Build per-month trend data from Jan to selected month
        const trendMonths: any[] = [];
        for (let mm = 1; mm <= monthNum; mm++) {
          const mStart = `${year}-${String(mm).padStart(2, '0')}-01`;
          const mLast = new Date(year, mm, 0).getDate();
          const mEnd = `${year}-${String(mm).padStart(2, '0')}-${String(mLast).padStart(2, '0')}`;
          const mData = (pemeriksaanAllRes.data || []).filter((r: any) => r.tanggal_periksa >= mStart && r.tanggal_periksa <= mEnd);
          let hipertensi = 0, diabetes = 0, kolesterol = 0, asamUrat = 0;
          mData.forEach((r: any) => {
            const [sis, dias] = (r.tekanan_darah || '0/0').split('/').map(Number);
            const gender = r.lansia?.jenis_kelamin || 'Perempuan';
            if (sis >= 140 || dias >= 90) hipertensi++;
            if (r.gula_darah > 200) diabetes++;
            if (r.kolesterol > 200) kolesterol++;
            if (r.asam_urat > (gender === 'Laki-laki' ? 7.0 : 6.0)) asamUrat++;
          });
          trendMonths.push({ bulan: monthShort[mm - 1], Hipertensi: hipertensi, Diabetes: diabetes, Kolesterol: kolesterol, 'Asam Urat': asamUrat });
        }
        setTrendChartData(trendMonths);

        const measurements = pemeriksaanRes.data || [];

        let hipertensiTotal = 0;
        let diabetesTotal = 0;
        let kolesterolTotal = 0;
        let asamUratTotal = 0;

        let tensiNormal = 0;
        let tensiPre = 0;
        let tensiHiper = 0;

        measurements.forEach(m => {
          const [sis, dias] = (m.tekanan_darah || '0/0').split('/').map(Number);
          const gender = m.lansia?.jenis_kelamin || 'Perempuan';
          const limitAsamUrat = gender === 'Laki-laki' ? 7.0 : 6.0;

          const isHipertensi = sis >= 140 || dias >= 90;
          const isDiabetes = m.gula_darah > 200;
          const isKolesterol = m.kolesterol > 200;
          const isAsamUrat = m.asam_urat > limitAsamUrat;

          if (isHipertensi) hipertensiTotal++;
          if (isDiabetes) diabetesTotal++;
          if (isKolesterol) kolesterolTotal++;
          if (isAsamUrat) asamUratTotal++;

          // Tensi categorization
          if (sis > 0 && dias > 0) {
            if (sis >= 140 || dias >= 90) {
              tensiHiper++;
            } else if ((sis >= 120 && sis <= 139) || (dias >= 80 && dias <= 89)) {
              tensiPre++;
            } else {
              tensiNormal++;
            }
          }
        });

        setTotals({
          totalActive: allLansias.length,
          checked: measurements.length,
          stunting: hipertensiTotal,  // Reusing stunting slot for Hipertensi
          wasting: diabetesTotal,     // Reusing wasting slot for Diabetes
          underweight: kolesterolTotal // Reusing underweight slot for Kolesterol
        });
        
        const totalTensi = tensiNormal + tensiPre + tensiHiper || 1;
        setPieData([
          { name: `Normal (${((tensiNormal / totalTensi) * 100).toFixed(1)}%)`, value: tensiNormal, color: '#14B8A6' },
          { name: `Pra-Hipertensi (${((tensiPre / totalTensi) * 100).toFixed(1)}%)`, value: tensiPre, color: '#f59e0b' },
          { name: `Hipertensi (${((tensiHiper / totalTensi) * 100).toFixed(1)}%)`, value: tensiHiper, color: '#ef4444' }
        ]);
      }
    } catch (e) {
      console.warn('Error loading stats for analysis dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filtersLoading) {
      loadStats();
    }
  }, [selectedDesa, selectedPosyanduId, selectedMonth, toggleMode, filtersLoading]);

  // Request analysis from Groq AI API
  const handleRunAiAnalysis = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysisText('');

    try {
      let puskesmasName = 'Puskesmas Pondok I';
      const savedProfile = localStorage.getItem('simpul_sehat_puskesmas_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.namaPuskesmas) {
            puskesmasName = parsed.namaPuskesmas;
          }
        } catch (_) {}
      }

      // Compile aggregate data payload to make Groq smart without loading heavy DB
      const dataSummary = {
        total_sasaran: totals.totalActive,
        total_hadir: totals.checked,
        tingkat_partisipasi: totals.totalActive > 0 ? `${Math.round((totals.checked / totals.totalActive) * 100)}%` : '0%',
        prevalensi_kasus: toggleMode === 'balita' ? {
          stunting: totals.stunting,
          wasting: totals.wasting,
          underweight: totals.underweight
        } : {
          hipertensi: totals.stunting, // mapping values
          diabetes: totals.wasting,
          kolesterol: totals.underweight
        },
        tren_bulanan: trendChartData,
        distribusi_proporsi: toggleMode === 'balita' ? {
          bbu: bbuPieData.map(p => ({ label: p.name, jumlah: p.value })),
          tbu: tbuPieData.map(p => ({ label: p.name, jumlah: p.value })),
          bbtb: bbtbPieData.map(p => ({ label: p.name, jumlah: p.value }))
        } : pieData.map(p => ({ label: p.name, jumlah: p.value })),
        cakupan_imunisasi: toggleMode === 'balita' ? immunizationCoverage.map(c => ({
          vaksin: c.vaccine,
          persentase: `${c.percentage}%`,
          diimunisasi: c.count,
          total: c.total
        })) : undefined,
        topik_penyuluhan: toggleMode === 'balita' ? counselingTopics : undefined
      };

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toggleMode,
          selectedDesa,
          selectedPosyanduId,
          selectedMonth,
          dataSummary,
          puskesmasName
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi satelit analisis AI.');
      }

      const resJson = await response.json();
      setAnalysisText(resJson.analysis || 'Gagal merumuskan analisa.');
    } catch (err: any) {
      setAnalysisText('Terjadi gangguan saat memproses ulasan AI: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const insightData = useMemo(() => {
    if (loading) return {};
    return {
      kategori_aktif: toggleMode === 'balita' ? 'Gizi Balita' : 'Penyakit Lansia',
      total_sasaran_wilayah: totals.totalActive,
      total_diperiksa_bulan_ini: totals.checked,
      persentase_partisipasi: totals.totalActive > 0 ? `${Math.round((totals.checked / totals.totalActive) * 100)}%` : '0%',
      kasus_kritis_1: toggleMode === 'balita' ? `Stunting: ${totals.stunting}` : `Hipertensi: ${totals.stunting}`,
      kasus_kritis_2: toggleMode === 'balita' ? `Wasting: ${totals.wasting}` : `Diabetes: ${totals.wasting}`
    };
  }, [totals, toggleMode, loading]);

  return (
    <div>
      {/* 1. FILTER BAR (TOGGLE & SELECTORS) */}
      <div className="filter-bar">
        {/* Toggle Mode */}
        <div className="toggle-switch-container">
          <button 
            className={`toggle-btn ${toggleMode === 'balita' ? 'active' : ''}`}
            onClick={() => { setToggleMode('balita'); setAnalysisText(''); }}
          >
            PEMETAAN GIZI BALITA
          </button>
          <button 
            className={`toggle-btn ${toggleMode === 'lansia' ? 'active' : ''}`}
            onClick={() => { setToggleMode('lansia'); setAnalysisText(''); }}
          >
            PEMETAAN PENYAKIT LANSIA
          </button>
        </div>

        {/* Region Filters */}
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
          </select>

          {/* Month selector */}
          <select 
            className="header-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptionsList.map(mOpt => (
              <option key={mOpt} value={mOpt}>{mOpt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AI INSIGHT BOX */}
      {!loading && (
        <AIInsightBox
          konteks={`Ringkasan Wilayah (${toggleMode === 'balita' ? 'Gizi Balita' : 'Penyakit Lansia'})`}
          bulan={selectedMonth}
          filter={selectedPosyanduId === 'all' ? (selectedDesa === 'all' ? 'Semua Kalurahan' : `Kalurahan ${selectedDesa}`) : `Posyandu Terpilih`}
          data={insightData}
        />
      )}

      {/* 2. CARD METRICS SUMMARY */}
      {toggleMode === 'balita' ? (
        <div className="grid-cards-4" style={{ marginBottom: '20px' }}>
          <div className="card metric-card">
            <div className="metric-card-title">
              <Baby size={14} style={{ color: '#14B8A6' }} />
              <span>Total Sasaran Balita</span>
            </div>
            <div className="metric-card-value">{totals.totalActive}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-card-title">
              <ClipboardList size={14} style={{ color: '#2563eb' }} />
              <span>Timbang Bulan Ini</span>
            </div>
            <div className="metric-card-value">{totals.checked}</div>
          </div>
          <div className="card metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="metric-card-title">
              <AlertTriangle size={14} style={{ color: '#ef4444' }} />
              <span>Kasus Stunting</span>
            </div>
            <div className="metric-card-value" style={{ color: '#ef4444' }}>{totals.stunting}</div>
          </div>
          <div className="card metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="metric-card-title">
              <Activity size={14} style={{ color: '#f59e0b' }} />
              <span>Kasus Wasting</span>
            </div>
            <div className="metric-card-value" style={{ color: '#f59e0b' }}>{totals.wasting}</div>
          </div>
        </div>
      ) : (
        <div className="grid-cards-4" style={{ marginBottom: '20px' }}>
          <div className="card metric-card">
            <div className="metric-card-title">
              <User size={14} style={{ color: '#6366F1' }} />
              <span>Total Sasaran Lansia</span>
            </div>
            <div className="metric-card-value">{totals.totalActive}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-card-title">
              <ClipboardList size={14} style={{ color: '#2563eb' }} />
              <span>Diperiksa Bulan Ini</span>
            </div>
            <div className="metric-card-value">{totals.checked}</div>
          </div>
          <div className="card metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="metric-card-title">
              <Heart size={14} style={{ color: '#ef4444' }} />
              <span>Kasus Hipertensi</span>
            </div>
            <div className="metric-card-value" style={{ color: '#ef4444' }}>{totals.stunting}</div> {/* mapped value */}
          </div>
          <div className="card metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="metric-card-title">
              <Activity size={14} style={{ color: '#f59e0b' }} />
              <span>Kasus Diabetes</span>
            </div>
            <div className="metric-card-value" style={{ color: '#f59e0b' }}>{totals.wasting}</div> {/* mapped value */}
          </div>
        </div>
      )}

      {/* 3. CHARTS GRID SECTION */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', marginBottom: '20px' }}>
          Mengkalkulasi data visualisasi pemetaan Puskesmas...
        </div>
      ) : (
        <div className="grid-dashboard-main" style={{ marginBottom: '20px' }}>
          {/* Chart Pemetaan Distribusi Wilayah (Balita & Lansia) */}
          <div className="card chart-card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header-compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="card-title-compact">
                  {selectedDesa === 'all'
                    ? 'Pemetaan Sebaran Sasaran per Kalurahan'
                    : `Pemetaan Sebaran Sasaran per Posyandu di Kalurahan ${selectedDesa}`}
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#94a3b8' }}>
                  Perbandingan Jumlah Sasaran Balita (&lt;60 Bln) dan Lansia Terdaftar
                </p>
              </div>
            </div>
            <div style={{ width: '100%', height: '280px', marginTop: '14px' }}>
              {regionMapData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionMapData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend verticalAlign="top" height={28} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Balita" fill="#14B8A6" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Lansia" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px' }}>
                  Belum ada data pemetaan wilayah.
                </div>
              )}
            </div>
          </div>

          {/* Chart Left: Line chart showing monthly trend Jan → selected month */}
          <div className="card chart-card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header-compact">
              <span className="card-title-compact">
                {toggleMode === 'balita'
                  ? `Tren Kasus Gizi Balita Jan–${selectedMonth.split(' ')[0]} ${selectedMonth.split(' ')[1]}`
                  : `Tren Penyakit Degeneratif Lansia Jan–${selectedMonth.split(' ')[0]} ${selectedMonth.split(' ')[1]}`}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Data Bulanan Sepanjang Tahun</span>
            </div>
            <div style={{ width: '100%', height: '260px', marginTop: '10px' }}>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="bulan" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend verticalAlign="top" height={28} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    {toggleMode === 'balita' ? (
                      <>
                        <Line type="monotone" dataKey="Stunting" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Wasting" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Gizi Kurang" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                      </>
                    ) : (
                      <>
                        <Line type="monotone" dataKey="Hipertensi" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Diabetes" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Kolesterol" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Asam Urat" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 4, fill: '#14B8A6' }} activeDot={{ r: 6 }} />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px' }}>
                  Belum ada data kasus sepanjang tahun ini.
                </div>
              )}
            </div>
          </div>

          {/* Chart Right: Pie chart showing proportions (Lansia mode only) */}
          {toggleMode === 'lansia' && (
            <div className="card chart-card">
              <div className="card-header-compact">
                <span className="card-title-compact">Proporsi Klasifikasi Tekanan Darah</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', height: '260px', justifyContent: 'center', marginTop: '10px' }}>
                {pieData.length > 0 && pieData.some(p => p.value > 0) ? (
                  <>
                    <div style={{ height: '140px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Custom Legends */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 12px', marginTop: '10px' }}>
                      {pieData.map((item) => (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                            <span style={{ color: '#64748b' }}>{item.name}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.value} orang</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px' }}>
                    Tidak ada proporsi data yang terdeteksi.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Balita Mode: Render 3 PieCharts side-by-side (span 2) */}
          {toggleMode === 'balita' && (
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', margin: '8px 0' }}>
              
              {/* Card 1: BB/U */}
              <div className="card chart-card" style={{ minHeight: '300px' }}>
                <div className="card-header-compact">
                  <span className="card-title-compact">Status BB/U (Berat/Umur)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', height: '230px', justifyContent: 'center' }}>
                  {bbuPieData.some(p => p.value > 0) ? (
                    <>
                      <div style={{ height: '110px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={bbuPieData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={4} dataKey="value">
                              {bbuPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px', marginTop: '10px' }}>
                        {bbuPieData.map(item => (
                          <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }} />
                              <span style={{ color: '#64748b' }}>{item.name}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.value} anak</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px', margin: '10px' }}>
                      Tidak ada data BB/U bulan ini
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: TB/U */}
              <div className="card chart-card" style={{ minHeight: '300px' }}>
                <div className="card-header-compact">
                  <span className="card-title-compact">Status TB/U (Tinggi/Umur)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', height: '230px', justifyContent: 'center' }}>
                  {tbuPieData.some(p => p.value > 0) ? (
                    <>
                      <div style={{ height: '110px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={tbuPieData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={4} dataKey="value">
                              {tbuPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px', marginTop: '10px' }}>
                        {tbuPieData.map(item => (
                          <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }} />
                              <span style={{ color: '#64748b' }}>{item.name}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.value} anak</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px', margin: '10px' }}>
                      Tidak ada data TB/U bulan ini
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: BB/TB */}
              <div className="card chart-card" style={{ minHeight: '300px' }}>
                <div className="card-header-compact">
                  <span className="card-title-compact">Status BB/TB (Tinggi/Berat)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', height: '230px', justifyContent: 'center' }}>
                  {bbtbPieData.some(p => p.value > 0) ? (
                    <>
                      <div style={{ height: '110px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={bbtbPieData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={4} dataKey="value">
                              {bbtbPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', padding: '0 8px', marginTop: '10px' }}>
                        {bbtbPieData.map(item => (
                          <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                              <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>{item.name.split(' ')[0]}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: '#1e293b', flexShrink: 0 }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px', margin: '10px' }}>
                      Tidak ada data BB/TB bulan ini
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Balita Mode: Render Immunization Coverage & Counseling Summary Cards */}
          {toggleMode === 'balita' && (
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '8px 0' }}>
              
              {/* Card 1: Cakupan Imunisasi */}
              <div className="card" style={{ minHeight: '260px' }}>
                <div className="card-header-compact">
                  <span className="card-title-compact">Cakupan Imunisasi Sasaran</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Berdasarkan Balita Aktif</span>
                </div>
                <div className="table-container" style={{ border: 'none', boxShadow: 'none', marginTop: '4px', maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Jenis Vaksin</th>
                        <th>Cakupan (%)</th>
                        <th>Jumlah Anak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {immunizationCoverage.map((row) => (
                        <tr key={row.vaccine}>
                          <td style={{ fontWeight: 600 }}>{row.vaccine}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '6px', borderRadius: '3px', minWidth: '60px' }}>
                                <div style={{ backgroundColor: row.color, width: `${row.percentage}%`, height: '100%', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontWeight: 600 }}>{row.percentage}%</span>
                            </div>
                          </td>
                          <td style={{ color: '#64748b' }}>{row.count} / {row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 2: Topik Penyuluhan AI */}
              <div className="card" style={{ minHeight: '260px' }}>
                <div className="card-header-compact">
                  <span className="card-title-compact">Frekuensi Topik Penyuluhan AI</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Bulan Ini</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', overflowY: 'auto', maxHeight: '200px', paddingRight: '4px' }}>
                  {counselingTopics.length > 0 ? (
                    counselingTopics.map((topic, i) => (
                      <div key={topic.topic} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: i === 0 ? '#14B8A6' : i === 1 ? '#3b82f6' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600 }}>{i + 1}</span>
                          <span style={{ fontWeight: 500, color: '#334155', fontSize: '11px' }}>{topic.topic}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '11px' }}>{topic.count} Pertanyaan</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b', fontSize: '11px', margin: '10px' }}>
                      Tidak ada rekaman penyuluhan bulan ini.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* 4. AI ANALYTICS & INTERVENTION BLUEPRINT CARD */}
      <div className="card" style={{ padding: '24px', borderLeft: '4px solid #14B8A6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', backgroundColor: '#f0fdfa', borderRadius: '12px', color: '#14B8A6' }}>
              <BrainCircuit size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>
                Puskesmas AI Epidemiological Blueprint
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Analisis tren klinis otomatis dan rencana penanggulangan terstruktur berbasis kecerdasan buatan.
              </p>
            </div>
          </div>

          <button 
            onClick={handleRunAiAnalysis}
            disabled={analyzing || loading}
            className="btn btn-primary"
            style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', gap: '6px' }}
          >
            {analyzing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Merumuskan...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Mulai Analisis AI</span>
              </>
            )}
          </button>
        </div>

        {/* AI Response Display Area */}
        <div style={{ minHeight: '120px' }}>
          {analyzing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: '#14B8A6' }} />
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                AI sedang melakukan penelaahan data klinis mendalam & merancang logistik obat...
              </span>
            </div>
          ) : analysisText ? (
            <div 
              style={{ 
                backgroundColor: '#fafbfc', 
                border: '1px solid #eef2f6', 
                borderRadius: '12px', 
                padding: '20px', 
                color: '#334155'
              }}
            >
              {renderMarkdown(analysisText)}
            </div>
          ) : (
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '40px 0', 
                gap: '8px', 
                color: '#94a3b8',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                background: '#f8fafc'
              }}
            >
              <BrainCircuit size={32} style={{ color: '#cbd5e1' }} />
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                Silakan klik tombol "Mulai Analisis AI" untuk menghasilkan Blueprint Intervensi wilayah terpilih.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

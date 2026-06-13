import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { calculateAgeMonths, getKBMValue, calculateGrowthTrend } from '../lib/utils';

export interface SKDNStats {
  s: number; // Semua balita target
  k: number; // Punya KMS
  d: number; // Datang penimbangan bulan ini
  n: number; // Naik berat badan dibanding bulan kemarin
}

export interface ProblematicBalita {
  id: string;
  nama: string;
  nik: string;
  jenis_masalah: string[];
  status_detail: string;
}

export interface WeighingItem {
  nama: string;
  nik?: string;
  tanggal_lahir?: string;
  alamat?: string;
  umur_bulan: number;
  jenis_kelamin: string;
  nama_ortu: string;
  rt: number;
  berat_badan: number | null;
  tinggi_badan: number | null;
  zscore_bb_u?: number | null;
  zscore_tb_u?: number | null;
  zscore_bb_tb?: number | null;
  status_bb_u?: string | null;
  status_tb_u?: string | null;
  status_bb_tb?: string | null;
  status_kehadiran: 'Hadir' | 'Tidak Hadir';
  catatan_penyuluhan?: string | null;
  is_baru?: boolean;
  bb_trend?: 'T' | 'N' | '-';
}

export interface NutritionSummary {
  stunting: number;
  wasting: number;
  underweight: number;
  dua_t: number;
  gizi_buruk: number;
}

export interface LansiaReportItem {
  nama: string;
  umur: number;
  rt: number;
  berat_badan: number | null;
  tinggi_badan: number | null;
  bmi: number | null;
  status_bmi: string | null;
  tekanan_darah: string | null;
  gula_darah: number | null;
  asam_urat: number | null;
  kolesterol: number | null;
  status_pemeriksaan: string[];
}

export class ReportService {
  /**
   * Calculate SKDN indicators for a specific month
   */
  static async getMonthlySKDN(posyanduId: string, month: number, year: number): Promise<SKDNStats> {
    const startDate = new Date(year, month - 1, 1);
    const birthThreshold = subMonths(startDate, 60);
    const birthThresholdStr = format(birthThreshold, 'yyyy-MM-dd');

    // 1. S (Semua) - Active balitas (under 60 months at report month)
    const { count: s, error: sError } = await supabase
      .from('balitas')
      .select('*', { count: 'exact', head: true })
      .eq('posyandu_id', posyanduId)
      .gt('tanggal_lahir', birthThresholdStr);

    if (sError) console.error('SKDN Error (S):', sError);
    console.log(`[ReportService] Total S for ${posyanduId}: ${s}`);

    // 2. K (KMS) - Assume all have KMS
    const k = s || 0;

    const startStr = format(startOfMonth(startDate), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(startDate), 'yyyy-MM-dd');

    // Ambil balitas milik posyandu ini
    const { data: balitas, error: bError } = await supabase
      .from('balitas')
      .select('id, tanggal_lahir, jenis_kelamin')
      .eq('posyandu_id', posyanduId)
      .gt('tanggal_lahir', birthThresholdStr);

    if (bError) console.error('SKDN Error (Balitas):', bError);
    const balitaIds = balitas?.map(b => b.id) || [];
    const safeBalitaIds = balitaIds.length > 0 ? balitaIds : ['00000000-0000-0000-0000-000000000000'];

    // 3. D (Datang) - Unique balitas who visited this month
    const { data: dData, error: dError } = await supabase
      .from('penimbangans')
      .select('balita_id, berat_badan, tanggal')
      .in('balita_id', safeBalitaIds)
      .gte('tanggal', startStr)
      .lte('tanggal', endStr);
    
    if (dError) console.error('SKDN Error (D):', dError);
    console.log(`[ReportService] Total D (Visits) for ${posyanduId}: ${dData?.length || 0}`);
    const filteredD = dData || [];
    const d = new Set(filteredD.map(p => p.balita_id)).size; // Unique visits

    // 4. N (Naik)
    let n = 0;
    const prevStartStr = format(startOfMonth(subMonths(startDate, 1)), 'yyyy-MM-dd');
    const prevEndStr = format(endOfMonth(subMonths(startDate, 1)), 'yyyy-MM-dd');

    // Batch query previous month's weighings to optimize N+1 pattern
    const { data: prevVisitsData, error: prevError } = await supabase
      .from('penimbangans')
      .select('balita_id, berat_badan, tanggal')
      .in('balita_id', safeBalitaIds)
      .gte('tanggal', prevStartStr)
      .lte('tanggal', prevEndStr)
      .order('tanggal', { ascending: false });

    if (prevError) console.error('SKDN Error (PrevVisits):', prevError);

    // Map to get latest visit for each child in the previous month
    const prevVisitsMap = new Map<string, number>();
    (prevVisitsData || []).forEach(pv => {
      if (!prevVisitsMap.has(pv.balita_id)) {
        prevVisitsMap.set(pv.balita_id, pv.berat_badan);
      }
    });

    const balitasMap = new Map((balitas || []).map(b => [b.id, b]));

    for (const p of filteredD) {
      const prevWeight = prevVisitsMap.get(p.balita_id);
      if (prevWeight !== undefined) {
        const balita = balitasMap.get(p.balita_id);
        if (balita && balita.tanggal_lahir) {
          const ageMonths = calculateAgeMonths(balita.tanggal_lahir, p.tanggal);
          const kbm = getKBMValue(ageMonths, balita.jenis_kelamin || 'Perempuan');
          const weightGain = p.berat_badan - prevWeight;
          if (weightGain >= kbm) {
            n++;
          }
        }
      }
    }

    return { s: s || 0, k, d, n };
  }

  /**
   * Identify balitas with issues (Stunting, Wasting, 2T)
   */
  static async getProblematicGroups(posyanduId: string, month: number, year: number): Promise<ProblematicBalita[]> {
    const startDate = new Date(year, month - 1, 1);
    const birthThresholdStr = format(subMonths(startDate, 60), 'yyyy-MM-dd');

    // ── STEP 1: Ambil balitas ──
    const { data: balitas, error: bError } = await supabase
      .from('balitas')
      .select('id, nama, nik, posyandu_id, tanggal_lahir, jenis_kelamin')
      .eq('posyandu_id', posyanduId)
      .gt('tanggal_lahir', birthThresholdStr);
      
    const balitaIds = balitas?.map(b => b.id) || [];
    const safeBalitaIds = balitaIds.length > 0 ? balitaIds : ['00000000-0000-0000-0000-000000000000'];
    const balitaMap = new Map((balitas || []).map(b => [b.id, b]));

    // ── STEP 2: Ambil penimbangans ──
    const { data: visits, error: vError } = await supabase
      .from('penimbangans')
      .select(`
        id,
        balita_id,
        status_bb_u,
        status_tb_u,
        status_bb_tb,
        berat_badan
      `)
      .in('balita_id', safeBalitaIds)
      .gte('tanggal', format(startOfMonth(startDate), 'yyyy-MM-dd'))
      .lte('tanggal', format(endOfMonth(startDate), 'yyyy-MM-dd'));

    if (vError) console.error('ProblematicGroups Error:', vError);

    if (!visits) return [];

    // Batch query history for all toddlers to optimize N+1 query loop
    const { data: allHistory, error: hError } = await supabase
      .from('penimbangans')
      .select('balita_id, berat_badan, tanggal')
      .in('balita_id', safeBalitaIds)
      .lte('tanggal', format(endOfMonth(startDate), 'yyyy-MM-dd'))
      .order('tanggal', { ascending: false });

    if (hError) console.error('ProblematicGroups History Error:', hError);

    // Group history by balita_id (up to 3 latest records)
    const historyMap = new Map<string, { berat_badan: number, tanggal: string }[]>();
    (allHistory || []).forEach(h => {
      const list = historyMap.get(h.balita_id) || [];
      if (list.length < 3) {
        list.push({ berat_badan: h.berat_badan, tanggal: h.tanggal });
        historyMap.set(h.balita_id, list);
      }
    });

    const problematic: ProblematicBalita[] = [];

    for (const v of visits) {
      const issues: string[] = [];
      const balita = balitaMap.get(v.balita_id);
      if (!balita) continue;

      // 1. Check Stunting (TB/U)
      if (v.status_tb_u?.includes('Pendek')) {
        issues.push('Stunting (' + v.status_tb_u + ')');
      }

      // 2. Check Wasting (BB/TB)
      if (v.status_bb_tb?.includes('Wasted') || v.status_bb_tb?.includes('Buruk') || v.status_bb_tb?.includes('Kurang')) {
        issues.push('Wasting (' + v.status_bb_tb + ')');
      }

      // 3. Check Underweight (BB/U)
      if (v.status_bb_u?.includes('Kurang') || v.status_bb_u?.includes('Sangat Kurang')) {
        issues.push('Underweight (' + v.status_bb_u + ')');
      }

      // 4. Check 2T (Tidak Naik 2x berturut-turut)
      const history = historyMap.get(v.balita_id) || [];
      if (history.length >= 2 && balita.tanggal_lahir) {
        const trend = calculateGrowthTrend(history, balita.tanggal_lahir, balita.jenis_kelamin || 'Perempuan');
        if (trend === '2T') {
          issues.push('2T (Tidak Naik 2x)');
        }
      }

      if (issues.length > 0) {
        problematic.push({
          id: v.balita_id,
          nama: balita.nama,
          nik: balita.nik,
          jenis_masalah: issues,
          status_detail: [v.status_bb_u, v.status_tb_u, v.status_bb_tb].filter(Boolean).join(' | ')
        });
      }
    }

    return problematic;
  }

  /**
   * Get full list of weighings for the month
   */
  static async getMonthlyWeighingList(posyanduId: string, month: number, year: number): Promise<WeighingItem[]> {
    const startDate = new Date(year, month - 1, 1);
    const birthThresholdStr = format(subMonths(startDate, 60), 'yyyy-MM-dd');

    // ── STEP 1: Ambil balitas ──
    const { data: balitas, error: bError } = await supabase
      .from('balitas')
      .select('id, nama, nik, tanggal_lahir, jenis_kelamin, nama_ortu, rt, posyandu_id, created_at, alamat')
      .eq('posyandu_id', posyanduId)
      .gt('tanggal_lahir', birthThresholdStr);
      
    if (bError) console.error('WeighingList Balitas Error:', bError);
    const balitaList = balitas || [];
    const balitaIds = balitaList.map(b => b.id);
    const safeBalitaIds = balitaIds.length > 0 ? balitaIds : ['00000000-0000-0000-0000-000000000000'];

    // Batch query previous month's weighings to calculate T/N growth trend
    const prevStartStr = format(startOfMonth(subMonths(startDate, 1)), 'yyyy-MM-dd');
    const prevEndStr = format(endOfMonth(subMonths(startDate, 1)), 'yyyy-MM-dd');

    const { data: prevVisitsData, error: prevError } = await supabase
      .from('penimbangans')
      .select('balita_id, berat_badan')
      .in('balita_id', safeBalitaIds)
      .gte('tanggal', prevStartStr)
      .lte('tanggal', prevEndStr)
      .order('tanggal', { ascending: false });

    if (prevError) console.error('WeighingList PrevVisits Error:', prevError);

    const prevVisitsMap = new Map<string, number>();
    (prevVisitsData || []).forEach(pv => {
      if (!prevVisitsMap.has(pv.balita_id)) {
        prevVisitsMap.set(pv.balita_id, pv.berat_badan);
      }
    });

    // ── STEP 2: Ambil penimbangans ──
    const { data: visits, error: wError } = await supabase
      .from('penimbangans')
      .select(`
        balita_id,
        berat_badan,
        tinggi_badan,
        zscore_bb_u,
        zscore_tb_u,
        zscore_bb_tb,
        status_bb_u,
        status_tb_u,
        status_bb_tb
      `)
      .in('balita_id', safeBalitaIds)
      .gte('tanggal', format(startOfMonth(startDate), 'yyyy-MM-dd'))
      .lte('tanggal', format(endOfMonth(startDate), 'yyyy-MM-dd'))
      .order('tanggal', { ascending: true });

    if (wError) console.error('WeighingList Error:', wError);
    const visitList = visits || [];

    // Map latest visit for each balita
    const latestVisitsMap = new Map<string, any>();
    visitList.forEach(v => {
      latestVisitsMap.set(v.balita_id, v);
    });

    // ── STEP 3: Ambil penyuluhans ──
    const { data: counselings, error: cError } = await supabase
      .from('penyuluhans')
      .select('balita_id, rekomendasi')
      .in('balita_id', safeBalitaIds)
      .gte('tanggal', format(startOfMonth(startDate), 'yyyy-MM-dd'))
      .lte('tanggal', format(endOfMonth(startDate), 'yyyy-MM-dd'));

    if (cError) console.error('WeighingList Counselings Error:', cError);
    const counselingMap = new Map((counselings || []).map(c => [c.balita_id, c.rekomendasi]));

    return balitaList.map((b): WeighingItem => {
      const ageMonths = calculateAgeMonths(b.tanggal_lahir, new Date(year, month - 1, 15));
      const v = latestVisitsMap.get(b.id);
      
      const birth = new Date(b.created_at);
      const isNew = birth.getFullYear() === year && (birth.getMonth() + 1) === month;
      
      if (v) {
        // Child was present / weighed
        const isPoorGrowth = 
          (v.zscore_bb_u !== null && v.zscore_bb_u <= -2) || 
          (v.zscore_tb_u !== null && v.zscore_tb_u <= -2) || 
          (v.zscore_bb_tb !== null && v.zscore_bb_tb <= -2);
        
        let advice = '-';
        if (isPoorGrowth) {
          advice = counselingMap.get(b.id) || 'Perlu asupan gizi seimbang dan pemantauan berkala.';
        } else {
          advice = 'Tumbuh optimal, pertahankan pola makan seimbang.';
        }

        const prevWeight = prevVisitsMap.get(b.id);
        const trend: 'N' | 'T' | '-' = prevWeight !== undefined ? (v.berat_badan > prevWeight ? 'N' : 'T') : '-';

        return {
          nama: b.nama,
          nik: b.nik,
          tanggal_lahir: b.tanggal_lahir,
          alamat: b.alamat || '-',
          umur_bulan: Math.max(0, ageMonths),
          jenis_kelamin: b.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
          nama_ortu: b.nama_ortu,
          rt: b.rt,
          berat_badan: v.berat_badan,
          tinggi_badan: v.tinggi_badan,
          zscore_bb_u: v.zscore_bb_u,
          zscore_tb_u: v.zscore_tb_u,
          zscore_bb_tb: v.zscore_bb_tb,
          status_bb_u: v.status_bb_u,
          status_tb_u: v.status_tb_u,
          status_bb_tb: v.status_bb_tb,
          status_kehadiran: 'Hadir' as const,
          catatan_penyuluhan: advice,
          is_baru: isNew,
          bb_trend: trend
        };
      } else {
        // Child was absent
        return {
          nama: b.nama,
          nik: b.nik,
          tanggal_lahir: b.tanggal_lahir,
          alamat: b.alamat || '-',
          umur_bulan: Math.max(0, ageMonths),
          jenis_kelamin: b.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
          nama_ortu: b.nama_ortu,
          rt: b.rt,
          berat_badan: null,
          tinggi_badan: null,
          zscore_bb_u: null,
          zscore_tb_u: null,
          zscore_bb_tb: null,
          status_bb_u: null,
          status_tb_u: null,
          status_bb_tb: null,
          status_kehadiran: 'Tidak Hadir' as const,
          catatan_penyuluhan: 'Diingatkan Penimbangan Mandiri',
          is_baru: isNew,
          bb_trend: '-'
        };
      }
    }).sort((a, b) => b.umur_bulan - a.umur_bulan);
  }

  /**
   * Get counts for validation summary
   */
  static async getNutritionSummary(posyanduId: string, month: number, year: number): Promise<NutritionSummary> {
    const problems = await this.getProblematicGroups(posyanduId, month, year);
    
    return {
      stunting: problems.filter(p => p.jenis_masalah.some(m => m.includes('Stunting'))).length,
      wasting: problems.filter(p => p.jenis_masalah.some(m => m.includes('Wasting'))).length,
      underweight: problems.filter(p => p.jenis_masalah.some(m => m.includes('Underweight'))).length,
      dua_t: problems.filter(p => p.jenis_masalah.some(m => m.includes('2T'))).length,
      gizi_buruk: problems.filter(p => p.jenis_masalah.some(m => m.toLowerCase().includes('buruk'))).length,
    };
  }

  /**
   * Get Lansia report data
   */
  static async getLansiaReportData(posyanduId: string, month: number, year: number): Promise<LansiaReportItem[]> {
    const startDate = new Date(year, month - 1, 1);
    const startStr = format(startOfMonth(startDate), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(startDate), 'yyyy-MM-dd');

    // Ambil lansias milik posyandu ini
    let { data: lansias, error: lansiaError } = await supabase
      .from('lansias')
      .select('id, nama, tanggal_lahir, rt, jenis_kelamin, posyandu_id')
      .eq('posyandu_id', posyanduId);

    if (lansiaError) console.error('[LansiaReport] Step1 Error:', lansiaError);
    console.log(`[LansiaReport] Step1 (with posyandu_id) → ${lansias?.length ?? 0} lansias ditemukan`);

    if (!lansias || lansias.length === 0) {
      console.log('[LansiaReport] Tidak ada lansia yang ditemukan untuk Posyandu ini.');
      return [];
    }

    const lansiaIds = lansias.map(l => l.id);
    const lansiaMap = new Map(lansias.map(l => [l.id, l]));

    // Ambil pemeriksaan_lansias berdasarkan ID yang ditemukan
    const { data: checks, error: checkError } = await supabase
      .from('pemeriksaan_lansias')
      .select('*')
      .in('lansia_id', lansiaIds)
      .gte('tanggal_periksa', startStr)
      .lte('tanggal_periksa', endStr)
      .order('tanggal_periksa', { ascending: true });

    if (checkError) console.error('[LansiaReport] Step2 Error:', checkError);
    console.log(`[LansiaReport] Step2 — period=${month}/${year} (${startStr} s/d ${endStr}) → ${checks?.length ?? 0} pemeriksaan ditemukan`);

    if (!checks || checks.length === 0) return [];

    return checks.map(c => {
      const l = lansiaMap.get(c.lansia_id);
      if (!l || !l.nama) return null;

      const age = year - new Date(l.tanggal_lahir).getFullYear();

      const bmi = (c.berat_badan && c.tinggi_badan) ? c.berat_badan / Math.pow(c.tinggi_badan / 100, 2) : null;
      let statusBmi = '-';
      if (bmi) {
        if (bmi < 17.0) statusBmi = 'Sangat Kurus';
        else if (bmi < 18.5) statusBmi = 'Kurus';
        else if (bmi < 25.0) statusBmi = 'Normal';
        else if (bmi < 27.0) statusBmi = 'Gemuk';
        else statusBmi = 'Obesitas';
      }

      const gender = l.jenis_kelamin || 'Perempuan';
      const limitAsamUrat = gender === 'Laki-laki' ? 7.0 : 6.0;

      const issues: string[] = [];
      if (c.tekanan_darah && c.tekanan_darah !== '-') {
        const [sys, dia] = c.tekanan_darah.split('/').map(Number);
        if (sys >= 140 || dia >= 90) issues.push('Hipertensi');
      }
      if (Number(c.gula_darah) > 200) issues.push('Gula Darah Tinggi');
      if (Number(c.asam_urat) > limitAsamUrat) issues.push('Asam Urat Tinggi');
      if (Number(c.kolesterol) > 200) issues.push('Kolesterol Tinggi');

      return {
        nama: l.nama,
        umur: age || 0,
        rt: l.rt || '-',
        berat_badan: c.berat_badan || '-',
        tinggi_badan: c.tinggi_badan || '-',
        bmi: bmi ? Math.round(bmi * 10) / 10 : null,
        status_bmi: statusBmi,
        tekanan_darah: c.tekanan_darah || '-',
        gula_darah: c.gula_darah || '-',
        asam_urat: c.asam_urat || '-',
        kolesterol: c.kolesterol || '-',
        status_pemeriksaan: issues
      };
    }).filter(Boolean) as LansiaReportItem[];
  }
}

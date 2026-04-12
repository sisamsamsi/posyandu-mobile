import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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
  umur_bulan: number;
  jenis_kelamin: string;
  nama_ortu: string;
  rt: number;
  berat_badan: number;
  tinggi_badan: number;
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
    const endDate = endOfMonth(startDate);

    // 1. S (Semua) - Active balitas (0-60 months)
    // We filter by posyandu_id. 
    const { count: s } = await supabase
      .from('balitas')
      .select('*', { count: 'exact', head: true })
      .eq('posyandu_id', posyanduId);

    // 2. K (KMS) - Assume all have KMS
    const k = s || 0;

    const startStr = format(startDate, 'yyyy-MM-01');
    const endStr = format(endDate, 'yyyy-MM-dd');

    // 3. D (Datang) - Unique balitas who visited this month in this posyandu
    const { data: dData } = await supabase
      .from('penimbangans')
      .select(`
        balita_id, 
        berat_badan,
        balita!inner(posyandu_id)
      `)
      .eq('balita.posyandu_id', posyanduId)
      .gte('tanggal', startStr)
      .lte('tanggal', endStr);
    
    const filteredD = dData || [];
    const d = filteredD.length;

    // 4. N (Naik)
    let n = 0;
    const prevMonthStart = startOfMonth(subMonths(startDate, 1)).toISOString();
    const prevMonthEnd = endOfMonth(subMonths(startDate, 1)).toISOString();

    for (const p of filteredD) {
      const { data: prevVisit } = await supabase
        .from('penimbangans')
        .select('berat_badan')
        .eq('balita_id', p.balita_id)
        .gte('tanggal', format(startOfMonth(subMonths(startDate, 1)), 'yyyy-MM-dd'))
        .lte('tanggal', format(endOfMonth(subMonths(startDate, 1)), 'yyyy-MM-dd'))
        .order('tanggal', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevVisit && p.berat_badan > prevVisit.berat_badan) {
        n++;
      }
    }

    return { s: s || 0, k, d, n };
  }

  /**
   * Identify balitas with issues (Stunting, Wasting, 2T)
   */
  static async getProblematicGroups(posyanduId: string, month: number, year: number): Promise<ProblematicBalita[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);

    // Fetch penimbangans for the month with balita info
    const { data: visits } = await supabase
      .from('penimbangans')
      .select(`
        id,
        balita_id,
        status_bb_u,
        status_tb_u,
        status_bb_tb,
        berat_badan,
        balita!inner(nama, nik, posyandu_id)
      `)
      .eq('balita.posyandu_id', posyanduId)
      .gte('tanggal', format(startDate, 'yyyy-MM-dd'))
      .lte('tanggal', format(endDate, 'yyyy-MM-dd'));

    if (!visits) return [];

    const problematic: ProblematicBalita[] = [];

    for (const v of visits) {
      const issues: string[] = [];
      const balita = Array.isArray(v.balita) ? v.balita[0] : v.balita;
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
      const { data: history } = await supabase
        .from('penimbangans')
        .select('berat_badan, tanggal')
        .eq('balita_id', v.balita_id)
        .lte('tanggal', format(endDate, 'yyyy-MM-dd'))
        .order('tanggal', { ascending: false })
        .limit(3);

      if (history && history.length >= 3) {
        const [curr, prev, beforePrev] = history;
        if (curr.berat_badan <= prev.berat_badan && prev.berat_badan <= beforePrev.berat_badan) {
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
   * Safe language map for parent sharing
   */
  static getSensitiveStatus(status: string) {
    const s = (status || '').toLowerCase();
    
    if (s.includes('buruk') || s.includes('sangat pendek') || s.includes('sangat kurang') || s.includes('severe')) {
      return { 
        label: 'Memerlukan Perhatian Khusus', 
        advice: 'Segera lakukan konsultasi intensif dengan Bidan atau Puskesmas terdekat untuk mendapatkan pendampingan gizi.' 
      };
    }
    
    if (s.includes('kurang') || s.includes('pendek') || s.includes('waspada')) {
      return { 
        label: 'Perlu Peningkatan Gizi', 
        advice: 'Disarankan menambah porsi protein hewani dan vitamin. Jangan lupa pantau nafsu makan si kecil.' 
      };
    }
    
    if (s.includes('lebih') || s.includes('obesitas')) {
      return { 
        label: 'Kelebihan Gizi', 
        advice: 'Atur kembali pola makan dan kurangi asupan gula atau snacks berlebih. Perbanyak aktivitas fisik.' 
      };
    }

    // Default Good Status
    return { 
      label: 'Kondisi Normal & Baik', 
      advice: 'Pertahankan pola makan bergizi dan pola asuh saat ini. Terus rutin menimbang setiap bulan ya Bunda!' 
    };
  }

  /**
   * Get full list of weighings for the month
   */
  static async getMonthlyWeighingList(posyanduId: string, month: number, year: number): Promise<WeighingItem[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);

    const { data: visits } = await supabase
      .from('penimbangans')
      .select(`
        berat_badan,
        tinggi_badan,
        balita!inner(nama, tanggal_lahir, jenis_kelamin, nama_ortu, rt, posyandu_id)
      `)
      .eq('balita.posyandu_id', posyanduId)
      .gte('tanggal', format(startDate, 'yyyy-MM-dd'))
      .lte('tanggal', format(endDate, 'yyyy-MM-dd'))
      .order('tanggal', { ascending: true });

    if (!visits) return [];

    return visits.map(v => {
      const b = (Array.isArray(v.balita) ? v.balita[0] : v.balita) as any;
      if (!b) return null;
      const ageMonths = (year - new Date(b.tanggal_lahir).getFullYear()) * 12 + (month - 1 - new Date(b.tanggal_lahir).getMonth());
      return {
        nama: b.nama,
        umur_bulan: Math.max(0, ageMonths),
        jenis_kelamin: b.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
        nama_ortu: b.nama_ortu,
        rt: b.rt,
        berat_badan: v.berat_badan,
        tinggi_badan: v.tinggi_badan
      };
    }).filter(Boolean) as WeighingItem[];
  }

  /**
   * Get counts for validation summary
   */
  static async getNutritionSummary(posyanduId: string, month: number, year: number): Promise<NutritionSummary> {
    const problems = await this.getProblematicGroups(posyanduId, month, year);
    
    // Also need Gizi Buruk specifically if not caught by getProblematicGroups
    // Actually getProblematicGroups should catch it in issues list.
    
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
    const endDate = endOfMonth(startDate);

    const { data: checks } = await supabase
      .from('pemeriksaan_lansias')
      .select(`
        berat_badan,
        tinggi_badan,
        tekanan_darah,
        gula_darah,
        asam_urat,
        kolesterol,
        lansia!inner(nama, tanggal_lahir, rt, posyandu_id)
      `)
      .eq('lansia.posyandu_id', posyanduId)
      .gte('tanggal_periksa', format(startDate, 'yyyy-MM-dd'))
      .lte('tanggal_periksa', format(endDate, 'yyyy-MM-dd'))
      .order('tanggal_periksa', { ascending: true });

    if (!checks) return [];

    return checks.map(c => {
      const l = (Array.isArray(c.lansia) ? c.lansia[0] : c.lansia) as any;
      if (!l) return null;
      const age = year - new Date(l.tanggal_lahir).getFullYear();
      
      const bmi = (c.berat_badan && c.tinggi_badan) ? c.berat_badan / Math.pow(c.tinggi_badan / 100, 2) : null;
      let statusBmi = '-';
      if (bmi) {
        if (bmi < 18.5) statusBmi = 'Kurus';
        else if (bmi < 25) statusBmi = 'Normal';
        else if (bmi < 30) statusBmi = 'Overweight';
        else statusBmi = 'Obesitas';
      }

      const issues: string[] = [];
      if (c.tekanan_darah) {
        const [sys, dia] = c.tekanan_darah.split('/').map(Number);
        if (sys >= 140 || dia >= 90) issues.push('Hipertensi');
      }
      if (c.gula_darah && c.gula_darah > 200) issues.push('Gula Darah Tinggi');
      if (c.asam_urat && c.asam_urat > 7) issues.push('Asam Urat Tinggi');
      if (c.kolesterol && c.kolesterol > 200) issues.push('Kolesterol Tinggi');

      return {
        nama: l.nama,
        umur: age,
        rt: l.rt,
        berat_badan: c.berat_badan,
        tinggi_badan: c.tinggi_badan,
        bmi: bmi ? Math.round(bmi * 10) / 10 : null,
        status_bmi: statusBmi,
        tekanan_darah: c.tekanan_darah,
        gula_darah: c.gula_darah,
        asam_urat: c.asam_urat,
        kolesterol: c.kolesterol,
        status_pemeriksaan: issues
      };
    }).filter(Boolean) as LansiaReportItem[];
  }
}

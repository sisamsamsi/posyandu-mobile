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

    // 3. D (Datang) - Unique balitas who visited this month
    const { data: dData } = await supabase
      .from('penimbangans')
      .select('balita_id, berat_badan')
      .gte('tanggal', startDate.toISOString())
      .lte('tanggal', endDate.toISOString());
    
    // Note: If penimbangans table doesn't have posyandu_id, we'd need a join.
    // However, usually we filter by the records found. 
    // Let's assume we need to filter dData by those belonging to this posyandu.
    const { data: balitasInPosyandu } = await supabase
      .from('balitas')
      .select('id')
      .eq('posyandu_id', posyanduId);
    
    const validIds = new Set(balitasInPosyandu?.map(b => b.id) || []);
    const filteredD = dData?.filter(item => validIds.has(item.balita_id)) || [];
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
        .gte('tanggal', prevMonthStart)
        .lte('tanggal', prevMonthEnd)
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
        balitas!inner(nama, nik, posyandu_id)
      `)
      .eq('balitas.posyandu_id', posyanduId)
      .gte('tanggal', startDate.toISOString())
      .lte('tanggal', endDate.toISOString());

    if (!visits) return [];

    const problematic: ProblematicBalita[] = [];

    for (const v of visits) {
      const issues: string[] = [];
      const balita = v.balitas as any;

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
        .lte('tanggal', endDate.toISOString())
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
}

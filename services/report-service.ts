import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface SKDNStats {
  s: number; // Semua balita
  k: number; // Punya KMS
  d: number; // Datang penimbangan
  n: number; // Naik berat badan
}

export interface ProblematicBalita {
  id: string;
  nama: string;
  nik: string;
  jenis_masalah: string[];
}

export class ReportService {
  /**
   * Calculate SKDN indicators for a specific month
   */
  static async getMonthlySKDN(posyanduId: string, month: number, year: number): Promise<SKDNStats> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);

    // 1. S (Semua)
    const { count: s } = await supabase
      .from('balitas')
      .select('*', { count: 'exact', head: true })
      .eq('posyandu_id', posyanduId);

    // 2. K (KMS) - Assume all registered have KMS
    const k = s || 0;

    // 3. D (Datang)
    const { data: dData } = await supabase
      .from('penimbangans')
      .select('balita_id, bb')
      .eq('posyandu_id', posyanduId)
      .gte('tanggal', startDate.toISOString())
      .lte('tanggal', endDate.toISOString());

    const d = dData?.length || 0;

    // 4. N (Naik)
    let n = 0;
    if (dData) {
      for (const p of dData) {
        const { data: prevVisit } = await supabase
          .from('penimbangans')
          .select('bb')
          .eq('balita_id', p.balita_id)
          .lt('tanggal', startDate.toISOString())
          .order('tanggal', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevVisit && p.bb > prevVisit.bb) {
          n++;
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
    const endDate = endOfMonth(startDate);

    // Fetch all penimbangans for the month
    const { data: visits } = await supabase
      .from('penimbangans')
      .select(`
        id,
        balita_id,
        status_gizi,
        bb,
        balitas (nama, nik)
      `)
      .eq('posyandu_id', posyanduId)
      .gte('tanggal', startDate.toISOString())
      .lte('tanggal', endDate.toISOString());

    if (!visits) return [];

    const problematic: ProblematicBalita[] = [];

    for (const v of visits) {
      const issues: string[] = [];
      const balita = v.balitas as any;

      // Check Z-Score Issues (from status_gizi column)
      if (v.status_gizi === 'Gizi Buruk' || v.status_gizi === 'Gizi Kurang') issues.push('Underweight');
      if (v.status_gizi === 'Stunting') issues.push('Stunting'); // Assume we tagged this earlier or check logic
      if (v.status_gizi === 'Wasting') issues.push('Wasting');

      // Check 2T (Tidak Naik 2x berturut-turut)
      const { data: history } = await supabase
        .from('penimbangans')
        .select('bb, tanggal')
        .eq('balita_id', v.balita_id)
        .lte('tanggal', endDate.toISOString())
        .order('tanggal', { ascending: false })
        .limit(3);

      if (history && history.length >= 3) {
        const [curr, prev, beforePrev] = history;
        if (curr.bb <= prev.bb && prev.bb <= beforePrev.bb) {
          issues.push('2T (Tidak Naik 2x)');
        }
      }

      if (issues.length > 0) {
        problematic.push({
          id: v.balita_id,
          nama: balita.nama,
          nik: balita.nik,
          jenis_masalah: issues
        });
      }
    }

    return problematic;
  }

  /**
   * Sensitive status formatter for parents
   */
  static getSensitiveStatus(statusGizi: string): { label: string; color: string; advice: string } {
    const map: Record<string, { label: string; color: string; advice: string }> = {
      'Gizi Baik': { 
        label: 'Tumbuh Kembang Baik', 
        color: '#22C55E', 
        advice: 'Pertahankan pemberian gizi seimbang dan rutin ke Posyandu.' 
      },
      'Gizi Kurang': { 
        label: 'Perlu Perhatian Petugas', 
        color: '#F59E0B', 
        advice: 'Disarankan konsultasi dengan petugas kesehatan terkait pola makan.' 
      },
      'Gizi Buruk': { 
        label: 'Segera Konsultasi Medis', 
        color: '#EF4444', 
        advice: 'Mohon segera hubungi petugas kesehatan untuk pemeriksaan lebih lanjut.' 
      },
      'Gizi Lebih': { 
        label: 'Pertumbuhan Sangat Pesat', 
        color: '#3B82F6', 
        advice: 'Perlu konsultasi terkait pengaturan pola makan anak.' 
      },
      'Obesitas': { 
        label: 'Kondisi Lebih Berat', 
        color: '#A855F7', 
        advice: 'Segera konsultasikan dengan dokter terkait risiko obesitas.' 
      }
    };

    return map[statusGizi] || { 
      label: 'Data Belum Lengkap', 
      color: '#94A3B8', 
      advice: 'Silakan hubungi kader untuk penjelasan lebih lanjut.' 
    };
  }
}

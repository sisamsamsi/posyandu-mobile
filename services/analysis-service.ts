import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface IndicatorStat {
  label: string;
  count: number;
  color: string;
}

export interface BalitaAnalysis {
  totalSasaran: number;
  totalHadir: number;
  stats_bb_u: IndicatorStat[];
  stats_tb_u: IndicatorStat[];
  stats_bb_tb: IndicatorStat[];
}

export interface LansiaAnalysis {
  totalSasaran: number;
  totalHadir: number;
  stats_kondisi: IndicatorStat[];
}

export interface TrendPoint {
  month: string;
  balita: number;
  lansia: number;
}

export class AnalysisService {
  static async getBalitaAnalysis(posyanduId: string, month: number, year: number, rt?: number): Promise<BalitaAnalysis> {
    const date = new Date(year, month - 1, 1);
    const start = startOfMonth(date).toISOString();
    const end = endOfMonth(date).toISOString();

    // 1. Fetch total sasaran (balita < 60 months at that time)
    const limitDate = subMonths(date, 60);
    const limitDateString = format(limitDate, 'yyyy-MM-dd');

    let sasaranQuery = supabase
      .from('balitas')
      .select('*', { count: 'exact' })
      .eq('posyandu_id', posyanduId)
      .gt('tanggal_lahir', limitDateString);
      
    if (rt) sasaranQuery = sasaranQuery.eq('rt', rt);
    const { count: totalSasaran } = await sasaranQuery;

    // 2. Fetch penimbangans in that month, joined with balitas for RT filtering and tenant isolation
    let query = supabase
      .from('penimbangans')
      .select(`
        *,
        balitas!inner(rt, posyandu_id)
      `)
      .eq('balitas.posyandu_id', posyanduId)
      .gte('tanggal', start)
      .lte('tanggal', end);

    if (rt) {
      query = query.eq('balitas.rt', rt);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching balita analysis:', error);
      return this.emptyBalitaResult();
    }

    const totalHadir = records?.length || 0;

    return {
      totalSasaran: totalSasaran || 0,
      totalHadir,
      stats_bb_u: this.aggregate(records, 'status_bb_u'),
      stats_tb_u: this.aggregate(records, 'status_tb_u'),
      stats_bb_tb: this.aggregate(records, 'status_bb_tb'),
    };
  }

  static async getLansiaAnalysis(posyanduId: string, month: number, year: number, rt?: number): Promise<LansiaAnalysis> {
    const date = new Date(year, month - 1, 1);
    const start = startOfMonth(date).toISOString();
    const end = endOfMonth(date).toISOString();

    let sasaranQuery = supabase.from('lansias').select('*', { count: 'exact' }).eq('posyandu_id', posyanduId);
    if (rt) sasaranQuery = sasaranQuery.eq('rt', rt);
    const { count: totalSasaran } = await sasaranQuery;

    let query = supabase
      .from('pemeriksaan_lansias')
      .select(`
        *,
        lansias!inner(rt, jenis_kelamin, posyandu_id)
      `)
      .eq('lansias.posyandu_id', posyanduId)
      .gte('tanggal_periksa', start)
      .lte('tanggal_periksa', end);

    if (rt) query = query.eq('lansias.rt', rt);

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching lansia analysis:', error);
      return this.emptyLansiaResult();
    }

    // Aggregate lansia health conditions
    const conditions = {
      'Hipertensi': 0,
      'Diabetes': 0,
      'Kolesterol Tinggi': 0,
      'Asam Urat Tinggi': 0,
      'Normal': 0
    };

    records?.forEach(p => {
      let atRisk = false;
      const [sis, dias] = (p.tekanan_darah || '0/0').split('/').map(Number);
      const gender = p.lansias?.jenis_kelamin || 'Perempuan';
      const limitAsamUrat = gender === 'Laki-laki' ? 7.0 : 6.0;

      if (sis >= 140 || dias >= 90) { conditions['Hipertensi']++; atRisk = true; }
      if ((p.gula_darah || 0) > 200) { conditions['Diabetes']++; atRisk = true; }
      if ((p.kolesterol || 0) > 200) { conditions['Kolesterol Tinggi']++; atRisk = true; }
      if ((p.asam_urat || 0) > limitAsamUrat) { conditions['Asam Urat Tinggi']++; atRisk = true; }
      
      if (!atRisk) conditions['Normal']++;
    });

    const stats_kondisi = Object.entries(conditions).map(([label, count]) => ({
      label,
      count,
      color: label === 'Normal' ? '#22C55E' : '#EF4444'
    }));

    return {
      totalSasaran: totalSasaran || 0,
      totalHadir: records?.length || 0,
      stats_kondisi
    };
  }

  static async getTrendData(posyanduId: string, limitMonths = 6): Promise<TrendPoint[]> {
    const trends: TrendPoint[] = [];
    const now = new Date();

    for (let i = limitMonths - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d).toISOString();
      const end = endOfMonth(d).toISOString();
      const monthLabel = format(d, 'MMM');

      const [
        { count: bCount },
        { count: lCount }
      ] = await Promise.all([
        supabase.from('penimbangans').select('*, balitas!inner(posyandu_id)', { count: 'exact', head: true }).eq('balitas.posyandu_id', posyanduId).gte('tanggal', start).lte('tanggal', end),
        supabase.from('pemeriksaan_lansias').select('*, lansias!inner(posyandu_id)', { count: 'exact', head: true }).eq('lansias.posyandu_id', posyanduId).gte('tanggal_periksa', start).lte('tanggal_periksa', end)
      ]);

      trends.push({
        month: monthLabel,
        balita: bCount || 0,
        lansia: lCount || 0
      });
    }

    return trends;
  }

  static async getPeopleByStatus(
    type: 'balita' | 'lansia',
    posyanduId: string,
    month: number,
    year: number,
    rt?: number,
    indicator?: string,
    status?: string
  ) {
    const date = new Date(year, month - 1, 1);
    const start = startOfMonth(date).toISOString();
    const end = endOfMonth(date).toISOString();

    if (type === 'balita') {
      if (!indicator || !status) return [];

      let query = supabase
        .from('penimbangans')
        .select(`
          balita_id,
          ${indicator},
          balitas!inner(nama, nik, rt, posyandu_id)
        `)
        .eq('balitas.posyandu_id', posyanduId)
        .gte('tanggal', start)
        .lte('tanggal', end)
        .eq(indicator, status) as any;

      if (rt) query = query.eq('balitas.rt', rt);

      const { data, error } = await query;
      if (error || !data) {
        if (error) console.error('Error fetching people by status:', error);
        return [];
      }

      return (data as any[]).map((d: any) => ({
        id: d.balita_id,
        nama: (d.balitas as any)?.nama || 'Tidak diketahui',
        nik: (d.balitas as any)?.nik || '-',
        rt: (d.balitas as any)?.rt || '-',
        status: (d as any)[indicator]
      }));
    } else {
      // Lansia logic
      let query = supabase
        .from('pemeriksaan_lansias')
        .select(`
          lansia_id,
          tekanan_darah, gula_darah, kolesterol, asam_urat,
          lansias!inner(nama, nik, rt, jenis_kelamin, posyandu_id)
        `)
        .eq('lansias.posyandu_id', posyanduId)
        .gte('tanggal_periksa', start)
        .lte('tanggal_periksa', end);

      if (rt) query = query.eq('lansias.rt', rt);

      const { data, error } = await query;
      if (error || !data) return [];

      const filtered = (data as any[]).filter(p => {
        const gender = p.lansias?.jenis_kelamin || 'Perempuan';
        const limitAsamUrat = gender === 'Laki-laki' ? 7.0 : 6.0;

        if (status === 'Normal') {
          const [sis, dias] = (p.tekanan_darah || '0/0').split('/').map(Number);
          return !(sis >= 140 || dias >= 90 || (p.gula_darah || 0) > 200 || (p.kolesterol || 0) > 200 || (p.asam_urat || 0) > limitAsamUrat);
        }
        if (status === 'Hipertensi') {
          const [sis, dias] = (p.tekanan_darah || '0/0').split('/').map(Number);
          return sis >= 140 || dias >= 90;
        }
        if (status === 'Diabetes') return (p.gula_darah || 0) > 200;
        if (status === 'Kolesterol Tinggi') return (p.kolesterol || 0) > 200;
        if (status === 'Asam Urat Tinggi') return (p.asam_urat || 0) > limitAsamUrat;
        return false;
      });

      return filtered.map(d => ({
        id: d.lansia_id,
        nama: (d.lansias as any)?.nama || 'Tidak diketahui',
        nik: (d.lansias as any)?.nik || '-',
        rt: (d.lansias as any)?.rt || '-',
        status: status
      }));
    }
  }

  private static aggregate(records: any[], field: string): IndicatorStat[] {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const val = r[field];
      if (val) counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      color: this.getIndicatorColor(label)
    }));
  }

  private static getIndicatorColor(label: string): string {
    if (label.includes('Normal') || label.includes('Baik')) return '#22C55E'; // Green
    if (label.includes('Buruk') || label.includes('Sangat')) return '#EF4444'; // Red
    if (label.includes('Kurang') || label.includes('Risiko') || label.includes('Pendek')) return '#F59E0B'; // Orange
    if (label.includes('Lebih') || label.includes('Obesitas')) return '#A855F7'; // Purple
    return '#94A3B8';
  }

  private static emptyBalitaResult(): BalitaAnalysis {
    return { totalSasaran: 0, totalHadir: 0, stats_bb_u: [], stats_tb_u: [], stats_bb_tb: [] };
  }

  private static emptyLansiaResult(): LansiaAnalysis {
    return { totalSasaran: 0, totalHadir: 0, stats_kondisi: [] };
  }
}

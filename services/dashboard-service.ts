// services/dashboard-service.ts
import { supabase } from '../lib/supabase';
import { Posyandu } from '../lib/types';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface LansiaHealthBreakdown {
  hipertensi: number;
  gulaTinggi: number;
  kolesterolTinggi: number;
  asamUratTinggi: number;
}

export interface DashboardStats {
  totalBalita: number;
  totalLansia: number;
  visitsThisMonth: number;
  nutritionStats: { label: string; count: number; color: string }[];
  healthAlertStats: { label: string; count: number; color: string }[];
  balitaVisitsThisMonth: number;
  lansiaVisitsThisMonth: number;
  belumTimbangBalita: number;
  belumPeriksaLansia: number;
  risikoTinggiBalita: number;
  lansiaHealthBreakdown: LansiaHealthBreakdown;
  posyanduInfo: Posyandu | null;
  imunisasiCount?: number;
}

export class DashboardService {
  static async getStats(posyanduId?: string | null): Promise<DashboardStats> {
    if (!posyanduId) {
      return {
        totalBalita: 0,
        totalLansia: 0,
        visitsThisMonth: 0,
        nutritionStats: [],
        healthAlertStats: [],
        balitaVisitsThisMonth: 0,
        lansiaVisitsThisMonth: 0,
        belumTimbangBalita: 0,
        belumPeriksaLansia: 0,
        risikoTinggiBalita: 0,
        lansiaHealthBreakdown: {
          hipertensi: 0,
          gulaTinggi: 0,
          kolesterolTinggi: 0,
          asamUratTinggi: 0
        },
        posyanduInfo: null
      };
    }

    const now = new Date();
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

    const runQuery = async (query: any, name: string) => {
      const { data, count, error } = await query;
      if (error) {
        console.error(`Dashboard Query Error [${name}]:`, error);
      }
      return { data, count };
    };

    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() - 60);
    const limitDateString = format(limitDate, 'yyyy-MM-dd');

    // ── STEP 1: Dapatkan ID Pasien di Posyandu ini ──
    const { data: balitas } = await supabase
      .from('balitas')
      .select('id')
      .eq('posyandu_id', posyanduId)
      .gt('tanggal_lahir', limitDateString);
      
    const { data: lansias } = await supabase.from('lansias').select('id').eq('posyandu_id', posyanduId);
    
    const balitaIds = balitas?.map(b => b.id) || [];
    const lansiaIds = lansias?.map(l => l.id) || [];

    // Jika kosong, cegah error query .in() dengan menaruh dummy id
    const safeBalitaIds = balitaIds.length > 0 ? balitaIds : ['00000000-0000-0000-0000-000000000000'];
    const safeLansiaIds = lansiaIds.length > 0 ? lansiaIds : ['00000000-0000-0000-0000-000000000000'];

    const [
      { count: totalBalita },
      { count: totalLansia },
      { count: balitaVisits },
      { count: lansiaVisits },
      { data: nutritionData },
      { data: lansiaData },
      { data: balitaIdsWithVisit },
      { data: lansiaIdsWithVisit },
      { count: imunisasiCount },
    ] = await Promise.all([
      runQuery(supabase.from('balitas').select('id', { count: 'exact', head: true }).eq('posyandu_id', posyanduId).gt('tanggal_lahir', limitDateString), 'totalBalita'),
      runQuery(supabase.from('lansias').select('id', { count: 'exact', head: true }).eq('posyandu_id', posyanduId), 'totalLansia'),
      runQuery(supabase.from('penimbangans').select('id', { count: 'exact', head: true }).in('balita_id', safeBalitaIds).gte('tanggal', startDate).lte('tanggal', endDate), 'balitaVisits'),
      runQuery(supabase.from('pemeriksaan_lansias').select('id', { count: 'exact', head: true }).in('lansia_id', safeLansiaIds).gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate), 'lansiaVisits'),
      runQuery(supabase.from('penimbangans').select('status_bb_u, status_tb_u, status_bb_tb').in('balita_id', safeBalitaIds).gte('tanggal', startDate).lte('tanggal', endDate), 'nutritionData'),
      runQuery(supabase.from('pemeriksaan_lansias').select('tekanan_darah, gula_darah, kolesterol, asam_urat, lansia:lansias(jenis_kelamin)').in('lansia_id', safeLansiaIds).gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate), 'lansiaData'),
      runQuery(supabase.from('penimbangans').select('balita_id').in('balita_id', safeBalitaIds).gte('tanggal', startDate).lte('tanggal', endDate), 'balitaIdsWithVisit'),
      runQuery(supabase.from('pemeriksaan_lansias').select('lansia_id').in('lansia_id', safeLansiaIds).gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate), 'lansiaIdsWithVisit'),
      runQuery(supabase.from('imunisasi').select('id', { count: 'exact', head: true }).in('balita_id', safeBalitaIds), 'imunisasiCount'),
    ]);

    // Aggregate nutrition stats
    const nutritionCounts: Record<string, number> = {};
    nutritionData?.forEach((p: any) => {
      if (p.status_bb_u) {
        nutritionCounts[p.status_bb_u] = (nutritionCounts[p.status_bb_u] || 0) + 1;
      }
    });

    const nutritionStats = Object.entries(nutritionCounts).map(([label, count]) => ({
      label,
      count,
      color: this.getNutritionColor(label)
    }));

    // Count risiko tinggi balita (stunting atau wasting atau underweight berat)
    let risikoTinggiBalita = 0;
    nutritionData?.forEach((p: any) => {
      const isRisk =
        (p.status_bb_u && (p.status_bb_u.includes('Sangat Kurang') || p.status_bb_u.includes('Kurang'))) ||
        (p.status_tb_u && (p.status_tb_u.includes('Sangat Pendek') || p.status_tb_u.includes('Pendek'))) ||
        (p.status_bb_tb && (p.status_bb_tb.includes('Buruk') || p.status_bb_tb.includes('Kurang')));
      if (isRisk) risikoTinggiBalita++;
    });

    // Lansia health breakdown
    const lansiaHealthBreakdown: LansiaHealthBreakdown = {
      hipertensi: 0,
      gulaTinggi: 0,
      kolesterolTinggi: 0,
      asamUratTinggi: 0,
    };

    let atRiskCount = 0;
    lansiaData?.forEach((p: any) => {
      const { tekanan_darah, gula_darah, kolesterol, asam_urat, lansia } = p;
      const [sis, dias] = (tekanan_darah || '0/0').split('/').map(Number);
      const gender = lansia?.jenis_kelamin || 'Perempuan';
      const limitAsamUrat = gender === 'Laki-laki' ? 7.0 : 6.0;

      if (sis >= 140 || dias >= 90) lansiaHealthBreakdown.hipertensi++;
      if ((gula_darah || 0) > 200) lansiaHealthBreakdown.gulaTinggi++;
      if ((kolesterol || 0) > 200) lansiaHealthBreakdown.kolesterolTinggi++;
      if ((asam_urat || 0) > limitAsamUrat) lansiaHealthBreakdown.asamUratTinggi++;
      
      const isAtRisk = (sis >= 140 || dias >= 90) || (gula_darah || 0) > 200 || (kolesterol || 0) > 200 || (asam_urat || 0) > limitAsamUrat;
      if (isAtRisk) atRiskCount++;
    });

    const healthAlertStats = [
      { label: 'Berisiko', count: atRiskCount, color: '#EF4444' },
      { label: 'Normal', count: (totalLansia || 0) - atRiskCount, color: '#22C55E' }
    ];

    // Belum timbang / periksa
    const balitaVisitIds = new Set((balitaIdsWithVisit || []).map((p: any) => p.balita_id));
    const lansiaVisitIds = new Set((lansiaIdsWithVisit || []).map((p: any) => p.lansia_id));
    const belumTimbangBalita = (totalBalita || 0) - balitaVisitIds.size;
    const belumPeriksaLansia = (totalLansia || 0) - lansiaVisitIds.size;
    const belumPeriksaLansiaSafe = Math.max(0, belumPeriksaLansia);

    // Posyandu info
    let posyanduInfo: Posyandu | null = null;
    if (posyanduId) {
      const { data: posData } = await supabase
        .from('posyandus')
        .select('*')
        .eq('id', posyanduId)
        .single();
      posyanduInfo = posData as Posyandu;
    }


    return {
      totalBalita: totalBalita || 0,
      totalLansia: totalLansia || 0,
      visitsThisMonth: (balitaVisits || 0) + (lansiaVisits || 0),
      nutritionStats,
      healthAlertStats,
      balitaVisitsThisMonth: balitaVisits || 0,
      lansiaVisitsThisMonth: lansiaVisits || 0,
      belumTimbangBalita: Math.max(0, belumTimbangBalita),
      belumPeriksaLansia: belumPeriksaLansiaSafe,
      risikoTinggiBalita,
      lansiaHealthBreakdown,
      posyanduInfo,
      imunisasiCount: imunisasiCount || 0,
    };
  }

  private static getNutritionColor(status: string): string {
    const colors: Record<string, string> = {
      'BB Sangat Kurang (SK)': '#EF4444',
      'BB Kurang (K)': '#F59E0B',
      'BB Normal (N)': '#22C55E',
      'Resiko BB Lebih (RL)': '#3B82F6',
      'Gizi Buruk': '#EF4444',
      'Gizi Kurang': '#F59E0B',
      'Gizi Baik': '#22C55E',
      'Gizi Lebih': '#3B82F6',
      'Obesitas': '#A855F7'
    };
    return colors[status] || '#94A3B8';
  }
}

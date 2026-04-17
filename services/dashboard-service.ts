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
  // NEW
  balitaVisitsThisMonth: number;
  lansiaVisitsThisMonth: number;
  belumTimbangBalita: number;
  belumPeriksaLansia: number;
  risikoTinggiBalita: number;
  lansiaHealthBreakdown: LansiaHealthBreakdown;
  posyanduInfo: Posyandu | null;
}

export class DashboardService {
  static async getStats(posyanduId?: string | null): Promise<DashboardStats> {
    const now = new Date();
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

    const [
      { count: totalBalita },
      { count: totalLansia },
      { count: balitaVisits },
      { count: lansiaVisits },
      { data: nutritionData },
      { data: lansiaData },
      { data: balitaIdsWithVisit },
      { data: lansiaIdsWithVisit },
    ] = await Promise.all([
      supabase.from('balitas').select('*', { count: 'exact', head: true }).eq('posyandu_id', posyanduId || ''),
      supabase.from('lansias').select('*', { count: 'exact', head: true }).eq('posyandu_id', posyanduId || ''),
      supabase.from('penimbangans').select('*, balita:balitas!inner(posyandu_id)', { count: 'exact', head: true }).eq('balita.posyandu_id', posyanduId || '').gte('tanggal', startDate).lte('tanggal', endDate),
      supabase.from('pemeriksaan_lansias').select('*, lansia:lansias!inner(posyandu_id)', { count: 'exact', head: true }).eq('lansia.posyandu_id', posyanduId || '').gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate),
      supabase.from('penimbangans').select('status_bb_u, status_tb_u, status_bb_tb, balita:balitas!inner(posyandu_id)').eq('balita.posyandu_id', posyanduId || '').gte('tanggal', startDate).lte('tanggal', endDate),
      supabase.from('pemeriksaan_lansias').select('tekanan_darah, gula_darah, kolesterol, asam_urat, lansia:lansias!inner(posyandu_id)').eq('lansia.posyandu_id', posyanduId || '').gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate),
      supabase.from('penimbangans').select('balita_id, balita:balitas!inner(posyandu_id)').eq('balita.posyandu_id', posyanduId || '').gte('tanggal', startDate).lte('tanggal', endDate),
      supabase.from('pemeriksaan_lansias').select('lansia_id, lansia:lansias!inner(posyandu_id)').eq('lansia.posyandu_id', posyanduId || '').gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate),
    ]);

    // Aggregate nutrition stats
    const nutritionCounts: Record<string, number> = {};
    nutritionData?.forEach(p => {
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
    nutritionData?.forEach(p => {
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
    lansiaData?.forEach(p => {
      const [sis, dias] = (p.tekanan_darah || '0/0').split('/').map(Number);
      if (sis >= 140 || dias >= 90) lansiaHealthBreakdown.hipertensi++;
      if ((p.gula_darah || 0) > 200) lansiaHealthBreakdown.gulaTinggi++;
      if ((p.kolesterol || 0) > 200) lansiaHealthBreakdown.kolesterolTinggi++;
      if ((p.asam_urat || 0) > 7) lansiaHealthBreakdown.asamUratTinggi++;
      
      const isAtRisk = sis > 140 || (p.gula_darah || 0) > 200 || (p.kolesterol || 0) > 200 || (p.asam_urat || 0) > 7;
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

    // Posyandu info
    let posyanduInfo: Posyandu | null = null;
    if (posyanduId) {
      const { data: posData } = await supabase
        .from('posyandus')
        .select('*')
        .eq('id', posyanduId)
        .single();
      posyanduInfo = posData as Posyandu;
    } else {
      // Fallback to first posyandu
      const { data: posData } = await supabase
        .from('posyandus')
        .select('*')
        .limit(1)
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
      belumPeriksaLansia: Math.max(0, belumPeriksaLansia),
      risikoTinggiBalita,
      lansiaHealthBreakdown,
      posyanduInfo,
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

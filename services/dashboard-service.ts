import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface DashboardStats {
  totalBalita: number;
  totalLansia: number;
  visitsThisMonth: number;
  nutritionStats: { label: string; count: number; color: string }[];
  healthAlertStats: { label: string; count: number; color: string }[];
}

export class DashboardService {
  static async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();

    const [
      { count: totalBalita },
      { count: totalLansia },
      { count: balitaVisits },
      { count: lansiaVisits },
      { data: nutritionData },
      { data: lansiaData }
    ] = await Promise.all([
      supabase.from('balitas').select('*', { count: 'exact', head: true }),
      supabase.from('lansias').select('*', { count: 'exact', head: true }),
      supabase.from('penimbangans').select('*', { count: 'exact', head: true }).gte('tanggal', start).lte('tanggal', end),
      supabase.from('pemeriksaan_lansias').select('*', { count: 'exact', head: true }).gte('tanggal_periksa', start).lte('tanggal_periksa', end),
      supabase.from('penimbangans').select('status_bb_u'),
      supabase.from('pemeriksaan_lansias').select('tekanan_darah, gula_darah, kolesterol, asam_urat')
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

    // Aggregate health alert stats (Simplified: how many have at least one high value)
    let atRiskCount = 0;
    lansiaData?.forEach(p => {
       const [sis, dias] = (p.tekanan_darah || '0/0').split('/').map(Number);
       const isAtRisk = sis > 140 || (p.gula_darah || 0) > 200 || (p.kolesterol || 0) > 200 || (p.asam_urat || 0) > 7;
       if (isAtRisk) atRiskCount++;
    });

    const healthAlertStats = [
      { label: 'Berisiko', count: atRiskCount, color: '#EF4444' },
      { label: 'Normal', count: (totalLansia || 0) - atRiskCount, color: '#22C55E' }
    ];

    return {
      totalBalita: totalBalita || 0,
      totalLansia: totalLansia || 0,
      visitsThisMonth: (balitaVisits || 0) + (lansiaVisits || 0),
      nutritionStats,
      healthAlertStats
    };
  }

  private static getNutritionColor(status: string): string {
    const colors: Record<string, string> = {
      'Gizi Buruk': '#EF4444',
      'Gizi Kurang': '#F59E0B',
      'Gizi Baik': '#22C55E',
      'Gizi Lebih': '#3B82F6',
      'Obesitas': '#A855F7'
    };
    return colors[status] || '#94A3B8';
  }
}

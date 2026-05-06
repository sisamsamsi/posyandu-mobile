// services/imunisasi-service.ts
import { supabase } from '../lib/supabase';
import { Balita, Imunisasi } from '../lib/types';

export class ImunisasiService {
  static async getBalitaByBirthYear(posyanduId: string | null, year: number): Promise<Balita[]> {
    if (!posyanduId) return [];
    
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('balitas')
      .select('*, imunisasi(*)')
      .eq('posyandu_id', posyanduId)
      .gte('tanggal_lahir', startDate)
      .lte('tanggal_lahir', endDate)
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching balita by birth year:', error);
      return [];
    }

    return data as Balita[];
  }

  static async saveImunisasi(imunisasi: Partial<Imunisasi>): Promise<{ data: any; error: any }> {
    // Check if record exists for this balita
    const { data: existing } = await supabase
      .from('imunisasi')
      .select('id')
      .eq('balita_id', imunisasi.balita_id)
      .maybeSingle();

    if (existing) {
      return await supabase
        .from('imunisasi')
        .update(imunisasi)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      return await supabase
        .from('imunisasi')
        .insert(imunisasi)
        .select()
        .single();
    }
  }

  static calculateCompleteness(imunisasi: Imunisasi | null | undefined): number {
    if (!imunisasi) return 0;
    
    const fields = [
      'hb0_date', 'bcg_date', 'penta_1_date', 'penta_2_date', 'penta_3_date',
      'ipv_1_date', 'ipv_2_date', 'ipv_3_date', 'pcv_1_date', 'pcv_2_date',
      'pcv_3_date', 'rv_1_date', 'rv_2_date', 'rv_3_date', 'mr_date', 'je_date',
      'booster_penta_date', 'booster_mr_date'
    ];
    
    const completed = fields.filter(f => !!(imunisasi as any)[f]).length;
    return Math.round((completed / fields.length) * 100);
  }

  static getMissingVaccines(imunisasi: Imunisasi | null | undefined): string[] {
    const labels: Record<string, string> = {
      hb0_date: 'HB0 (24 jam)',
      bcg_date: 'BCG (<2 bln)',
      penta_1_date: 'PENTA 1',
      penta_2_date: 'PENTA 2',
      penta_3_date: 'PENTA 3',
      ipv_1_date: 'IPV 1',
      ipv_2_date: 'IPV 2',
      ipv_3_date: 'IPV 3',
      pcv_1_date: 'PCV 1',
      pcv_2_date: 'PCV 2',
      pcv_3_date: 'PCV 3 (1 th)',
      rv_1_date: 'ROTAVIRUS 1',
      rv_2_date: 'ROTAVIRUS 2',
      rv_3_date: 'ROTAVIRUS 3',
      mr_date: 'MR (9 bln)',
      je_date: 'JE (10 bln)',
      booster_penta_date: 'BOOSTER PENTA (18 bln)',
      booster_mr_date: 'BOOSTER MR (18 bln)'
    };

    if (!imunisasi) return Object.values(labels);

    return Object.keys(labels).filter(key => !(imunisasi as any)[key]).map(key => labels[key]);
  }
}

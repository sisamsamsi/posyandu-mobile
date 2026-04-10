import { supabase } from '../lib/supabase';
import { WHOReferenceRow } from '../lib/types';

export const whoService = {
  /**
   * Fetch standard lines for a specific indicator and sex
   * @param indicator 'bb_u' | 'tb_u' | 'imt_u'
   * @param sex 'Laki-laki' | 'Perempuan'
   */
  async getStandards(indicator: 'bb_u' | 'tb_u' | 'imt_u', sex: 'Laki-laki' | 'Perempuan'): Promise<WHOReferenceRow[]> {
    const tableName = `who_${indicator}_standards`;
    const genderKey = sex === 'Laki-laki' ? 'L' : 'P';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('jenis_kelamin', genderKey)
      .order('usia_bulan', { ascending: true });

    if (error) {
      console.error(`Error fetching ${tableName}:`, error.message);
      return [];
    }

    // Map database columns to interface
    return data.map(r => ({
      sex: r.jenis_kelamin as 'L' | 'P',
      measurement: r.usia_bulan,
      median: r.median,
      minus_3sd: r.sd_minus_3,
      minus_2sd: r.sd_minus_2,
      minus_1sd: r.sd_minus_1,
      plus_1sd: r.sd_plus_1,
      plus_2sd: r.sd_plus_2,
      plus_3sd: r.sd_plus_3,
      indicator: indicator.toUpperCase(),
    }));
  }
};

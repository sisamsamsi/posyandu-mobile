import { supabase } from '../lib/supabase';

export interface AuditLogPayload {
  tabel_sumber: 'balitas' | 'penimbangans';
  entitas_tipe: 'Identitas Balita' | 'Pengukuran Balita';
  aksi: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  balita_id?: string;
  nama_balita?: string;
  nik_balita?: string;
  posyandu_id?: string;
  nama_posyandu?: string;
  platform?: 'mobile' | 'web';
  data_lama?: any;
  data_baru?: any;
  perubahan?: Array<{ field: string; label: string; old: any; new: any }>;
  ringkasan_perubahan?: string;
}

export class AuditService {
  /**
   * Log an audit event manually (fallback/extra metadata if DB triggers don't capture custom fields)
   */
  static async logEvent(payload: AuditLogPayload) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      const record = {
        ...payload,
        user_id: user?.id || null,
        user_email: user?.email || null,
        role_pelaku: 'kader',
        platform: payload.platform || 'mobile',
        created_at: new Date().toISOString()
      };

      await supabase.from('riwayat_perubahan_logs').insert(record);
    } catch (err) {
      console.warn('AuditService logEvent error (ignored to not break primary flow):', err);
    }
  }
}

// services/settings-service.ts
import { supabase } from '../lib/supabase';
import { Posyandu } from '../lib/types';

export interface PosyanduSettingsUpdate {
  nama_posyandu?: string;
  alamat_lengkap?: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  jadwal_balita_tanggal?: number | null;
  jadwal_balita_jam?: string;
  jadwal_lansia_tanggal?: number | null;
  jadwal_lansia_jam?: string;
  logo_url?: string;
}

export class SettingsService {
  /**
   * Get posyandu settings by ID
   */
  static async getPosyanduSettings(id: string): Promise<Posyandu | null> {
    const { data, error } = await supabase
      .from('posyandus')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching posyandu settings:', error);
      return null;
    }
    return data as Posyandu;
  }

  /**
   * Update posyandu settings
   */
  static async updatePosyanduSettings(
    id: string,
    updates: PosyanduSettingsUpdate
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('posyandus')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating posyandu settings:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  /**
   * Normalisasi nomor HP ke format internasional (628xxx)
   * - 08xxx → 628xxx
   * - +628xxx → 628xxx
   * - 628xxx → 628xxx (as is)
   */
  static normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    if (cleaned.startsWith('08')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('+62')) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  }

  /**
   * Validasi format nomor HP WA
   * Harus dimulai dengan 62 dan minimal 10 digit
   */
  static isValidWhatsAppNumber(phone: string): boolean {
    const normalized = this.normalizePhoneNumber(phone);
    return /^62\d{9,13}$/.test(normalized);
  }
}

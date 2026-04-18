import { supabase } from '../lib/supabase';

export class OnboardingService {
  /**
   * Generates a random 6-character alphanumeric invite code.
   */
  static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Creates a new posyandu and automatically links the current user as an admin/ketua.
   */
  static async createPosyandu(namaPosyandu: string, alamat: string, userId: string, fokusLayanan: 'semua') {
    try {
      const inviteCode = this.generateInviteCode();

      // 1. Create the Posyandu
      const { data: posyandu, error: pError } = await supabase
        .from('posyandus')
        .insert({
          nama_posyandu: namaPosyandu,
          alamat_lengkap: alamat,
          invite_code: inviteCode
        })
        .select('id')
        .single();

      if (pError) throw pError;

      // 2. Link the user as 'ketua'
      const { error: kError } = await supabase
        .from('kader_posyandu')
        .insert({
          user_id: userId,
          posyandu_id: posyandu.id,
          role: 'ketua',
          fokus_layanan: fokusLayanan
        });

      if (kError) throw kError;

      return { success: true, posyanduId: posyandu.id };
    } catch (error: any) {
      console.error('Failed to create Posyandu:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Joins an existing posyandu using an invite code.
   */
  static async joinPosyandu(inviteCode: string, userId: string, fokusLayanan: 'balita' | 'lansia') {
    try {
      // 1. Verify invite code
      const { data: posyandu, error: pError } = await supabase
        .from('posyandus')
        .select('id, nama_posyandu')
        .eq('invite_code', inviteCode.toUpperCase())
        .maybeSingle();

      if (pError) throw pError;
      if (!posyandu) throw new Error('Kode undangan tidak valid atau Posyandu tidak ditemukan.');

      // 2. Check if already joined
      const { data: existing, error: checkErr } = await supabase
        .from('kader_posyandu')
        .select('id')
        .eq('user_id', userId)
        .eq('posyandu_id', posyandu.id)
        .maybeSingle();

      if (existing) {
          throw new Error(`Anda sudah tergabung di ${posyandu.nama_posyandu}.`);
      }

      // 3. Link as 'anggota'
      const { error: kError } = await supabase
        .from('kader_posyandu')
        .insert({
          user_id: userId,
          posyandu_id: posyandu.id,
          role: 'anggota',
          fokus_layanan: fokusLayanan
        });

      if (kError) throw kError;

      return { success: true, posyanduId: posyandu.id, namaPosyandu: posyandu.nama_posyandu };
    } catch (error: any) {
      console.error('Failed to join Posyandu:', error);
      return { success: false, error: error.message };
    }
  }
}

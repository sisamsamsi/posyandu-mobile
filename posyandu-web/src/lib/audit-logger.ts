import { supabase } from './supabase';

export interface ChangedField {
  field: string;
  label: string;
  old: any;
  new: any;
}

export interface AuditLogRecord {
  id: string;
  tabel_sumber: 'balitas' | 'penimbangans';
  entitas_tipe: 'Identitas Balita' | 'Pengukuran Balita';
  aksi: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  balita_id?: string | null;
  nama_balita?: string | null;
  nik_balita?: string | null;
  posyandu_id?: string | null;
  nama_posyandu?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  role_pelaku: string;
  platform: 'mobile' | 'web' | 'import';
  data_lama?: Record<string, any> | null;
  data_baru?: Record<string, any> | null;
  perubahan?: ChangedField[] | null;
  ringkasan_perubahan?: string | null;
  created_at: string;
}

export const FIELD_LABELS: Record<string, string> = {
  // Identitas Balita
  nama: 'Nama Balita',
  nik: 'NIK Balita',
  tanggal_lahir: 'Tanggal Lahir',
  jenis_kelamin: 'Jenis Kelamin',
  no_kk: 'Nomor KK',
  nama_ortu: 'Nama Orang Tua',
  nama_ibu: 'Nama Ibu',
  nama_ayah: 'Nama Ayah',
  nik_ortu: 'NIK Orang Tua',
  no_hp_ortu: 'No HP Orang Tua',
  alamat: 'Alamat Domisili',
  rt: 'RT',
  rw: 'RW',
  anak_ke: 'Anak Ke',
  bb_lahir: 'Berat Lahir (kg)',
  tb_lahir: 'Tinggi Lahir (cm)',
  lk_lahir: 'Lingkar Kepala Lahir (cm)',
  usia_kehamilan_lahir: 'Usia Kehamilan (Minggu)',
  buku_kia: 'Buku KIA',
  buku_kia_bayi_kecil: 'Buku KIA Bayi Kecil',
  imd: 'Inisiasi Menyusu Dini (IMD)',
  posyandu_id: 'Unit Posyandu',
  
  // Pengukuran Balita
  tanggal: 'Tanggal Pengukuran',
  berat_badan: 'Berat Badan (kg)',
  tinggi_badan: 'Tinggi Badan (cm)',
  lingkar_lengan: 'Lingkar Lengan / LILA (cm)',
  lingkar_kepala: 'Lingkar Kepala (cm)',
  status_bb_u: 'Status BB/U',
  status_tb_u: 'Status TB/U',
  status_bb_tb: 'Status BB/TB',
  status_imt_u: 'Status IMT/U',
  zscore_bb_u: 'Z-Score BB/U',
  zscore_tb_u: 'Z-Score TB/U',
  zscore_bb_tb: 'Z-Score BB/TB',
  catatan: 'Catatan Kader'
};

export function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  if (key === 'tanggal' || key === 'tanggal_lahir') {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch (_) {}
  }
  return String(val);
}

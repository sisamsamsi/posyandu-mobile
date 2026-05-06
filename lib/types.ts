// lib/types.ts

export interface Posyandu {
  id: string;
  nama_posyandu: string;
  lokasi: string | null;
  keterangan: string | null;
  // Alamat lengkap
  alamat_lengkap: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  // Jadwal posyandu (tanggal per bulan)
  jadwal_balita_tanggal: number | null;
  jadwal_balita_jam: string | null;
  jadwal_lansia_tanggal: number | null;
  jadwal_lansia_jam: string | null;
  // Logo
  logo_url: string | null;
  invite_code?: string; // New field
  created_at: string;
}

export interface Balita {
  id: string;
  posyandu_id: string | null;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  anak_ke?: number | null;
  nama_ortu: string;
  alamat: string;
  rt: number;
  tempat_lahir?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  penyakit_bawaan?: string[];
  bb_lahir?: number | null;
  tb_lahir?: number | null;
  no_hp_ortu?: string | null; // Format: 628xxxxxxxxxx
  created_at:string;
  posyandu?: Posyandu;
  penimbangans?: Penimbangan[];
  imunisasi?: Imunisasi;
}

export interface Imunisasi {
  id: string;
  balita_id: string;
  hb0_date: string | null;
  bcg_date: string | null;
  penta_1_date: string | null;
  penta_2_date: string | null;
  penta_3_date: string | null;
  ipv_1_date: string | null;
  ipv_2_date: string | null;
  ipv_3_date: string | null;
  pcv_1_date: string | null;
  pcv_2_date: string | null;
  pcv_3_date: string | null;
  rv_1_date: string | null;
  rv_2_date: string | null;
  rv_3_date: string | null;
  mr_date: string | null;
  je_date: string | null;
  booster_penta_date: string | null;
  booster_mr_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Penimbangan {
  id: string;
  balita_id: string;
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;
  bmi: number | null;
  zscore_imt_u: number | null;
  status_gizi_imt_u: string | null;
  zscore_tb_u: number | null;
  status_tb_u: string | null;
  zscore_bb_u: number | null;
  status_bb_u: string | null;
  zscore_bb_tb: number | null;
  status_bb_tb: string | null;
  catatan: string | null;
  created_at: string;
  balita?: Balita;
}

export interface Lansia {
  id: string;
  posyandu_id: string | null;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  alamat: string | null;
  rt: number | null;
  penyuluhan_lansia?: string;
  penyakit_bawaan?: string[];
  created_at: string;
  posyandu?: Posyandu;
  pemeriksaan_lansias?: PemeriksaanLansia[];
}

export interface PemeriksaanLansia {
  id: string;
  lansia_id: string;
  tanggal_periksa: string;
  keluhan: string | null;
  tekanan_darah: string | null;
  tinggi_badan: number | null;
  berat_badan: number | null;
  lingkar_perut: number | null;
  lingkar_lengan: number | null;
  kolesterol: number | null;
  gula_darah: number | null;
  asam_urat: number | null;
  trigliserida: number | null;
  catatan_tambahan: string | null;
  created_at: string;
  lansia?: Lansia;
}

// --- Nutrition & Risk Types ---

export type NutritionStatus = 
  | 'Gizi Buruk' 
  | 'Gizi Kurang' 
  | 'Gizi Baik' 
  | 'Gizi Lebih' 
  | 'Obesitas'
  | 'Sangat Pendek (SP)'
  | 'Pendek (P)'
  | 'Normal (N)'
  | 'Tinggi (T)'
  | 'BB Sangat Kurang (SK)'
  | 'BB Kurang (K)'
  | 'BB Normal (N)'
  | 'Resiko BB Lebih (RL)'
  | 'Gizi Buruk (Severely Wasted)'
  | 'Gizi Kurang (Wasted)'
  | 'Berisiko Gizi Lebih'
  | 'Gizi Lebih (Overweight)'
  | 'Tidak dapat ditentukan';

export type RiskLevel = 'Risiko Sangat Rendah' | 'Risiko Rendah' | 'Risiko Sedang' | 'Risiko Tinggi' | 'Tidak ada data';
export type RiskColor = 'green' | 'yellow' | 'orange' | 'red' | 'gray';

export interface ZScoreResult {
  zscore: number;
  status: NutritionStatus;
  indicator: 'IMT/U' | 'TB/U' | 'BB/U' | 'BB/TB';
}

export interface RiskBreakdownItem {
  label: string;
  score: number;
  status: string;
  zscore?: number;
  weight: string;
}

export interface RiskCalculationResult {
  overall_score: number | null;
  risk_level: RiskLevel;
  risk_color: RiskColor;
  breakdown: {
    stunting: RiskBreakdownItem;
    wasting: RiskBreakdownItem;
    underweight: RiskBreakdownItem;
    trend: RiskBreakdownItem;
  };
  recommendations: string[];
  usia_bulan: number;
  date?: string;
  id?: string;
}

export interface WHOReferenceRow {
  sex: 'L' | 'P';
  measurement: number;
  median: number;
  minus_3sd: number;
  minus_2sd: number;
  minus_1sd: number;
  plus_1sd: number;
  plus_2sd: number;
  plus_3sd: number;
  indicator?: string;
  measure_type?: string;
}

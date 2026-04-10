// lib/types.ts

export interface Posyandu {
  id: string;
  nama_posyandu: string;
  lokasi: string | null;
  keterangan: string | null;
  created_at: string;
}

export interface Balita {
  id: string;
  posyandu_id: string | null;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  anak_ke: number | null;
  nama_ortu: string;
  alamat: string;
  rt: number;
  bb_lahir: number | null;
  tb_lahir: number | null;
  created_at: string;
  posyandu?: Posyandu;
  penimbangans?: Penimbangan[];
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
  penyakit_bawaan: string[];
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
  lingkar_kepala: number | null;
  kolesterol: number | null;
  gula_darah: number | null;
  asam_urat: number | null;
  catatan_tambahan: string | null;
  created_at: string;
  lansia?: Lansia;
}

export interface WhoReference {
  sd_minus_3: number;
  sd_minus_2: number;
  sd_minus_1: number;
  median: number;
  sd_plus_1: number;
  sd_plus_2: number;
  sd_plus_3: number;
}

export interface ZScoreResult {
  zscore: number;
  status: string;
  bmi?: number;
}

export interface RiskPrediction {
  overall_score: number | null;
  risk_level: string;
  risk_color: string;
  breakdown: {
    stunting: { label: string; score: number; status: string; zscore: number | null; weight: string };
    wasting: { label: string; score: number; status: string; zscore: number | null; weight: string };
    underweight: { label: string; score: number; status: string; zscore: number | null; weight: string };
    trend: { label: string; score: number; status: string; weight: string };
  };
  recommendations: string[];
  usia_bulan: number;
  last_measurement_date: string;
}

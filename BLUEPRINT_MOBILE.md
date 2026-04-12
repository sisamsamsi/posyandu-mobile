# 📱 BLUEPRINT: Sistem Informasi Posyandu Mobile

> **Dokumen ini adalah panduan LENGKAP dan MANDIRI untuk membangun aplikasi mobile Posyandu.**
> Junior developer (AI) harus bisa membangun seluruh aplikasi hanya dengan membaca dokumen ini.
> Tidak perlu akses ke codebase web — semua spesifikasi sudah dicantumkan di sini.

---

## 📋 DAFTAR ISI

1. [Overview & Tech Stack](#1-overview--tech-stack)
2. [Database Schema](#2-database-schema)
3. [Business Logic & Algoritma](#3-business-logic--algoritma)
4. [Navigasi & Struktur Screen](#4-navigasi--struktur-screen)
5. [Spesifikasi Screen Detail](#5-spesifikasi-screen-detail)
6. [Supabase Configuration](#6-supabase-configuration)
7. [Pembagian Sprint](#7-pembagian-sprint)
8. [Data Migration](#8-data-migration)
9. [Konvensi & Standar Kode](#9-konvensi--standar-kode)
10. [Referensi Visual](#10-referensi-visual)

---

## 1. Overview & Tech Stack

### 1.1 Tentang Aplikasi

**Sistem Informasi Posyandu** adalah aplikasi mobile untuk kader posyandu yang mengelola:
- **Data Balita** (usia 0-60 bulan): penimbangan, status gizi, grafik pertumbuhan WHO
- **Data Lansia**: pemeriksaan kesehatan (tekanan darah, gula darah, kolesterol, asam urat)
- **Dashboard & Analisis**: statistik, grafik, dan alert otomatis
- **Laporan**: cetak PDF untuk pelaporan ke Dinas Kesehatan

### 1.2 Target Pengguna

| Pengguna | Peran |
|----------|-------|
| Kader Posyandu | Input data penimbangan/pemeriksaan saat pelayanan |
| Bidan Desa | Melihat analisis dan laporan |
| Admin | Kelola data master (balita, lansia, posyandu) |

### 1.3 Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Framework** | React Native + Expo | SDK 54+ |
| **Router** | Expo Router (file-based) | v4+ |
| **Language** | TypeScript | 5.x |
| **Backend/DB** | Supabase (PostgreSQL) | Free Tier |
| **Auth** | Supabase Auth | Built-in |
| **State** | Zustand | 5.x |
| **Charts** | react-native-chart-kit ATAU victory-native | Latest |
| **PDF** | expo-print + expo-sharing | Latest |
| **UI Components** | Custom + React Native Paper (opsional) | Latest |
| **Date** | date-fns | Latest |
| **Build** | EAS Build | Free Tier |

### 1.4 Arsitektur

```
┌──────────────────────────────────────────┐
│           React Native + Expo             │
│                                           │
│  ┌────────────┐  ┌─────────────────────┐ │
│  │  Screens   │  │  Services (local)   │ │
│  │  (UI/UX)   │  │  ┌───────────────┐  │ │
│  │            │  │  │ ZScoreEngine  │  │ │
│  │            │  │  │ (TypeScript)  │  │ │
│  │            │  │  ├───────────────┤  │ │
│  │            │  │  │ RiskPredict   │  │ │
│  │            │  │  ├───────────────┤  │ │
│  │            │  │  │ BmiCalc       │  │ │
│  │            │  │  └───────────────┘  │ │
│  └──────┬─────┘  └─────────────────────┘ │
│         │                                 │
│  ┌──────▼──────────────────────────────┐ │
│  │     Supabase Client (API calls)      │ │
│  └──────┬──────────────────────────────┘ │
└─────────┼────────────────────────────────┘
          │ HTTPS
┌─────────▼────────────────────────────────┐
│            Supabase Cloud                  │
│  ┌────────────────┐  ┌────────────────┐  │
│  │  PostgreSQL DB  │  │  Auth Service  │  │
│  │  (8 tables)     │  │  (JWT tokens)  │  │
│  └────────────────┘  └────────────────┘  │
└───────────────────────────────────────────┘
```

### 1.5 Folder Structure

```
posyandu-mobile/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Dashboard
│   │   ├── service-desk.tsx      # Service Desk hub
│   │   ├── data.tsx              # Data Master hub
│   │   ├── analisis.tsx          # Analisis hub
│   │   ├── laporan.tsx           # Laporan hub
│   │   └── settings.tsx          # Setting Posyandu
│   ├── service-desk/
│   │   ├── balita.tsx            # Service Desk Balita
│   │   └── lansia.tsx            # Service Desk Lansia
│   ├── balita/
│   │   ├── index.tsx             # List Balita
│   │   ├── [id].tsx              # Detail Balita
│   │   ├── create.tsx            # Tambah Balita
│   │   └── [id]/edit.tsx         # Edit Balita
│   ├── lansia/
│   │   ├── index.tsx             # List Lansia
│   │   ├── [id].tsx              # Detail Lansia
│   │   ├── create.tsx            # Tambah Lansia
│   │   └── [id]/edit.tsx         # Edit Lansia
│   ├── penimbangan/
│   │   └── index.tsx             # Riwayat Penimbangan
│   ├── pemeriksaan/
│   │   └── index.tsx             # Riwayat Pemeriksaan
│   ├── monitoring/
│   │   ├── balita.tsx            # Monitoring Balita
│   │   └── lansia.tsx            # Monitoring Lansia
│   ├── analisis/
│   │   ├── balita.tsx            # Analisis Balita
│   │   ├── lansia.tsx            # Analisis Lansia
│   │   ├── detail-balita/[id].tsx
│   │   └── detail-lansia/[id].tsx
│   ├── laporan/
│   │   ├── index.tsx             # Menu Laporan
│   │   └── preview.tsx           # Preview PDF
│   ├── _layout.tsx               # Root layout
│   └── login.tsx                 # Login screen
├── components/                    # Reusable components
│   ├── ui/                       # Generic UI components
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── SearchBar.tsx
│   │   ├── StatCard.tsx
│   │   ├── FilterBar.tsx
│   │   └── EmptyState.tsx
│   ├── charts/                   # Chart components
│   │   ├── GrowthChart.tsx
│   │   ├── StatusDistributionChart.tsx
│   │   └── TrendChart.tsx
│   └── forms/                    # Form components
│       ├── BalitaForm.tsx
│       ├── LansiaForm.tsx
│       ├── PenimbanganForm.tsx
│       └── PemeriksaanForm.tsx
├── services/                      # Business logic
│   ├── zscore-engine.ts           # Z-Score calculator (ported from Python)
│   ├── risk-prediction.ts         # Risk prediction service
│   ├── bmi-calculator.ts          # BMI calculator
│   ├── alert-service.ts           # Alert/notification service
│   └── report-generator.ts        # PDF report generator
├── lib/                           # Utilities
│   ├── supabase.ts               # Supabase client init
│   ├── constants.ts              # WHO reference data, color constants
│   ├── types.ts                  # TypeScript type definitions
│   ├── utils.ts                  # Helper functions
│   └── who-data/                 # WHO reference tables (JSON)
│       ├── imt-u-boys.json
│       ├── imt-u-girls.json
│       ├── tb-u-boys.json
│       ├── tb-u-girls.json
│       ├── bb-u-boys.json
│       └── bb-u-girls.json
├── stores/                        # Zustand stores
│   ├── auth-store.ts
│   └── app-store.ts
├── hooks/                         # Custom hooks
│   ├── useBalita.ts
│   ├── useLansia.ts
│   ├── usePenimbangan.ts
│   ├── useDashboard.ts
│   ├── usePemeriksaan.ts
│   └── usePosyandu.ts
└── assets/                        # Static assets
    └── images/
```

---

## 2. Database Schema

### 2.1 Entity Relationship

```
POSYANDU  ──1:N──  BALITA  ──1:N──  PENIMBANGAN
POSYANDU  ──1:N──  LANSIA  ──1:N──  PEMERIKSAAN_LANSIA
```

### 2.2 SQL Schema (Supabase / PostgreSQL)

> **PENTING**: Jalankan SQL ini di Supabase SQL Editor saat setup awal.

```sql
-- ============================================
-- TABEL 1: POSYANDU (unit posyandu)
-- ============================================
CREATE TABLE posyandus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_posyandu TEXT NOT NULL,
    lokasi TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABEL 2: BALITA (data anak 0-60 bulan)
-- ============================================
CREATE TABLE balitas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    posyandu_id UUID REFERENCES posyandus(id) ON DELETE SET NULL,
    nik TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    anak_ke INTEGER,
    nama_ortu TEXT NOT NULL,
    alamat TEXT NOT NULL,
    rt INTEGER NOT NULL CHECK (rt >= 1 AND rt <= 10),
    bb_lahir REAL,
    tb_lahir REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABEL 3: PENIMBANGAN (data penimbangan balita)
-- ============================================
CREATE TABLE penimbangans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    balita_id UUID NOT NULL REFERENCES balitas(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    berat_badan REAL NOT NULL,
    tinggi_badan REAL NOT NULL,
    lingkar_kepala REAL,
    lingkar_lengan REAL,
    bmi REAL,
    zscore_imt_u REAL,
    status_gizi_imt_u TEXT,
    zscore_tb_u REAL,
    status_tb_u TEXT,
    zscore_bb_u REAL,
    status_bb_u TEXT,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABEL 4: LANSIA (data lansia)
-- ============================================
CREATE TABLE lansias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    posyandu_id UUID REFERENCES posyandus(id) ON DELETE SET NULL,
    nik TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    alamat TEXT,
    rt INTEGER CHECK (rt >= 1 AND rt <= 10),
    penyakit_bawaan JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABEL 5: PEMERIKSAAN LANSIA
-- ============================================
CREATE TABLE pemeriksaan_lansias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lansia_id UUID NOT NULL REFERENCES lansias(id) ON DELETE CASCADE,
    tanggal_periksa DATE NOT NULL,
    keluhan TEXT,
    tekanan_darah TEXT,
    tinggi_badan REAL,
    berat_badan REAL,
    lingkar_perut REAL,
    lingkar_kepala REAL,
    kolesterol REAL,
    gula_darah REAL,
    asam_urat REAL,
    catatan_tambahan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABEL 6-8: WHO REFERENCE STANDARDS
-- ============================================
CREATE TABLE who_imt_standards (
    id SERIAL PRIMARY KEY,
    jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    usia_bulan INTEGER NOT NULL CHECK (usia_bulan >= 0 AND usia_bulan <= 60),
    sd_minus_3 REAL NOT NULL,
    sd_minus_2 REAL NOT NULL,
    sd_minus_1 REAL NOT NULL,
    median REAL NOT NULL,
    sd_plus_1 REAL NOT NULL,
    sd_plus_2 REAL NOT NULL,
    sd_plus_3 REAL NOT NULL,
    UNIQUE(jenis_kelamin, usia_bulan)
);

CREATE TABLE who_tb_u_standards (
    id SERIAL PRIMARY KEY,
    jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    usia_bulan INTEGER NOT NULL CHECK (usia_bulan >= 0 AND usia_bulan <= 60),
    sd_minus_3 REAL NOT NULL,
    sd_minus_2 REAL NOT NULL,
    sd_minus_1 REAL NOT NULL,
    median REAL NOT NULL,
    sd_plus_1 REAL NOT NULL,
    sd_plus_2 REAL NOT NULL,
    sd_plus_3 REAL NOT NULL,
    UNIQUE(jenis_kelamin, usia_bulan)
);

CREATE TABLE who_bb_u_standards (
    id SERIAL PRIMARY KEY,
    jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    usia_bulan INTEGER NOT NULL CHECK (usia_bulan >= 0 AND usia_bulan <= 60),
    sd_minus_3 REAL NOT NULL,
    sd_minus_2 REAL NOT NULL,
    sd_minus_1 REAL NOT NULL,
    median REAL NOT NULL,
    sd_plus_1 REAL NOT NULL,
    sd_plus_2 REAL NOT NULL,
    sd_plus_3 REAL NOT NULL,
    UNIQUE(jenis_kelamin, usia_bulan)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE posyandus ENABLE ROW LEVEL SECURITY;
ALTER TABLE balitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE penimbangans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lansias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemeriksaan_lansias ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_penimbangans_balita_id ON penimbangans(balita_id);
CREATE INDEX idx_penimbangans_tanggal ON penimbangans(tanggal);
CREATE INDEX idx_pemeriksaan_lansia_id ON pemeriksaan_lansias(lansia_id);
CREATE INDEX idx_pemeriksaan_tanggal ON pemeriksaan_lansias(tanggal_periksa);

-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================
-- RLS disesuaikan dengan Role (Admin/Bidan/Kader). Contoh sederhana:
CREATE POLICY "Allow access for authenticated users (Needs RBAC Refinement)" ON posyandus FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow access for authenticated users (Needs RBAC Refinement)" ON balitas FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow access for authenticated users (Needs RBAC Refinement)" ON penimbangans FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow access for authenticated users (Needs RBAC Refinement)" ON lansias FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow access for authenticated users (Needs RBAC Refinement)" ON pemeriksaan_lansias FOR ALL TO authenticated USING (true);

CREATE POLICY "Read only for authenticated" ON who_imt_standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read only for authenticated" ON who_tb_u_standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read only for authenticated" ON who_bb_u_standards FOR SELECT TO authenticated USING (true);
```

### 2.3 TypeScript Types

```typescript
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
```

---

## 3. Business Logic & Algoritma

### 3.1 BMI Calculator

```typescript
// services/bmi-calculator.ts

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function calculateBmiRounded(weightKg: number, heightCm: number, decimals = 2): number | null {
  const bmi = calculateBmi(weightKg, heightCm);
  if (bmi === null) return null;
  return Math.round(bmi * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
```

### 3.2 Z-Score Engine (PORT DARI PYTHON)

> **INI ADALAH KOMPONEN PALING KRITIS.**
> Di sistem web, ini berjalan via Python subprocess yang query ke database MySQL.
> Di mobile, ini harus jalan 100% di TypeScript dengan data WHO yang di-bundle sebagai JSON.

#### 3.2.1 Algoritma Perhitungan Z-Score (Metode WHO)

```typescript
// services/zscore-engine.ts

/**
 * Algoritma WHO untuk perhitungan Z-Score
 * Menggunakan interpolasi linear antara garis SD
 *
 * Cara kerja:
 * 1. Ambil nilai referensi WHO untuk usia & jenis kelamin
 *    (sd_minus_3, sd_minus_2, sd_minus_1, median, sd_plus_1, sd_plus_2, sd_plus_3)
 * 2. Tentukan posisi nilai anak di antara garis SD
 * 3. Interpolasi linear untuk mendapatkan Z-score presisi
 */
function calculateZScore(value: number, ref: WhoReference): number {
  const { sd_minus_3, sd_minus_2, sd_minus_1, median, sd_plus_1, sd_plus_2, sd_plus_3 } = ref;

  if (value <= sd_minus_3) {
    return sd_minus_2 !== sd_minus_3
      ? -3.0 + (value - sd_minus_3) / (sd_minus_2 - sd_minus_3)
      : -3.0;
  } else if (value <= sd_minus_2) {
    return sd_minus_1 !== sd_minus_2
      ? -2.0 + (value - sd_minus_2) / (sd_minus_1 - sd_minus_2)
      : -2.0;
  } else if (value <= sd_minus_1) {
    return median !== sd_minus_1
      ? -1.0 + (value - sd_minus_1) / (median - sd_minus_1)
      : -1.0;
  } else if (value <= median) {
    return sd_plus_1 !== median
      ? 0.0 + (value - median) / (sd_plus_1 - median)
      : 0.0;
  } else if (value <= sd_plus_1) {
    return sd_plus_2 !== sd_plus_1
      ? 1.0 + (value - sd_plus_1) / (sd_plus_2 - sd_plus_1)
      : 1.0;
  } else if (value <= sd_plus_2) {
    return sd_plus_3 !== sd_plus_2
      ? 2.0 + (value - sd_plus_2) / (sd_plus_3 - sd_plus_2)
      : 2.0;
  } else {
    return sd_plus_3 !== sd_plus_2
      ? 3.0 + (value - sd_plus_3) / (sd_plus_3 - sd_plus_2)
      : 3.0;
  }
}
```

#### 3.2.2 Klasifikasi Status Gizi

```typescript
// IMT/U (BMI-for-Age) — Indikator Wasting
function getStatusImtU(zscore: number): string {
  if (zscore <= -3.0) return 'Gizi Buruk';
  if (zscore <= -2.0) return 'Gizi Kurang';
  if (zscore <= 1.0)  return 'Gizi Baik';
  if (zscore <= 2.0)  return 'Gizi Lebih';
  return 'Obesitas';
}

// TB/U (Height-for-Age) — Indikator Stunting
function getStatusTbU(zscore: number): string {
  if (zscore <= -3.0) return 'Sangat Pendek (SP)';
  if (zscore <= -2.0) return 'Pendek (P)';
  if (zscore <= 3.0)  return 'Normal (N)';
  return 'Tinggi (T)';
}

// BB/U (Weight-for-Age) — Indikator Underweight
function getStatusBbU(zscore: number): string {
  if (zscore <= -3.0) return 'BB Sangat Kurang (SK)';
  if (zscore <= -2.0) return 'BB Kurang (K)';
  if (zscore <= 1.0)  return 'BB Normal (N)';
  return 'Resiko BB Lebih (RL)';
}
```

#### 3.2.3 Fungsi Utama Z-Score

```typescript
/**
 * Hitung semua Z-Score untuk satu penimbangan
 *
 * @param weight - Berat badan (kg)
 * @param height - Tinggi badan (cm)
 * @param ageMonths - Usia dalam bulan (0-60)
 * @param sex - 'L' untuk Laki-laki, 'P' untuk Perempuan
 * @param whoData - Object berisi semua tabel referensi WHO (dari JSON)
 */
export function calculateAllZScores(
  weight: number,
  height: number,
  ageMonths: number,
  sex: 'L' | 'P',
  whoData: WhoDataStore
): {
  imtU: ZScoreResult | null;
  tbU: ZScoreResult | null;
  bbU: ZScoreResult | null;
} {
  if (weight <= 0 || height <= 0) return { imtU: null, tbU: null, bbU: null };
  if (ageMonths < 0) ageMonths = Math.abs(ageMonths);
  ageMonths = Math.min(Math.max(0, ageMonths), 60);

  // 1. IMT/U: hitung BMI dulu lalu lookup tabel WHO IMT
  let imtU: ZScoreResult | null = null;
  const imtRef = whoData.imtU[sex]?.[ageMonths];
  if (imtRef) {
    const bmi = calculateBmi(weight, height)!;
    const zscore = calculateZScore(bmi, imtRef);
    imtU = {
      zscore: Math.round(zscore * 100) / 100,
      status: getStatusImtU(zscore),
      bmi: Math.round(bmi * 100) / 100,
    };
  }

  // 2. TB/U: tinggi badan langsung lookup tabel WHO TB/U
  let tbU: ZScoreResult | null = null;
  const tbRef = whoData.tbU[sex]?.[ageMonths];
  if (tbRef) {
    const zscore = calculateZScore(height, tbRef);
    tbU = {
      zscore: Math.round(zscore * 100) / 100,
      status: getStatusTbU(zscore),
    };
  }

  // 3. BB/U: berat badan langsung lookup tabel WHO BB/U
  let bbU: ZScoreResult | null = null;
  const bbRef = whoData.bbU[sex]?.[ageMonths];
  if (bbRef) {
    const zscore = calculateZScore(weight, bbRef);
    bbU = {
      zscore: Math.round(zscore * 100) / 100,
      status: getStatusBbU(zscore),
    };
  }

  return { imtU, tbU, bbU };
}
```

#### 3.2.4 Format Data WHO (JSON)

WHO data di-bundle sebagai JSON files. Format per file:

```json
// lib/who-data/imt-u-boys.json
// Array, index = usia bulan (0-60), total 61 entries
[
  { "sd_minus_3": 10.2, "sd_minus_2": 11.1, "sd_minus_1": 12.2, "median": 13.4, "sd_plus_1": 14.8, "sd_plus_2": 16.3, "sd_plus_3": 18.1 },
  ...61 entries total
]
```

> **CARA MENDAPATKAN DATA WHO**: Export dari database MySQL web.
> Query: `SELECT sd_minus_3, sd_minus_2, sd_minus_1, median, sd_plus_1, sd_plus_2, sd_plus_3 FROM who_imt_standards WHERE jenis_kelamin='L' ORDER BY usia_bulan ASC`
> Lakukan untuk setiap kombinasi tabel × jenis kelamin (6 file total).

> **WHO DATA CACHING**: Agar tidak *lagging* atau boros memori saat perhitungan z-score yang banyak, JSON WHO Data (6 file) harus di-load **satu kali** saat aplikasi berjalan (misalnya ke dalam `app-store.ts` memakai Zustand) dan disimpan stasenya. Tidak boleh di-load ulang setiap menghitung z-score.

### 3.3 Risk Prediction Service

```typescript
// services/risk-prediction.ts

/**
 * Perhitungan Skor Risiko Komprehensif
 * Skor 0-100 dimana semakin tinggi = semakin berisiko
 *
 * Bobot:
 * - Stunting (TB/U):    35%
 * - Wasting (IMT/U):    25%
 * - Underweight (BB/U): 25%
 * - Growth Trend:       15%
 */

function zscoreToRiskPercentage(zscore: number): number {
  if (zscore < -3) return 100;
  if (zscore < -2) return 70 + ((-2 - zscore) / 1) * 30;
  if (zscore < -1) return 30 + ((-1 - zscore) / 1) * 40;
  if (zscore < 0)  return 10 + ((0 - zscore) / 1) * 20;
  if (zscore < 1)  return 5 + ((1 - zscore) / 1) * 5;
  return 5;
}

function getRiskLevel(score: number): string {
  if (score >= 70) return 'Risiko Tinggi';
  if (score >= 40) return 'Risiko Sedang';
  if (score >= 20) return 'Risiko Rendah';
  return 'Risiko Sangat Rendah';
}

function getRiskColor(score: number): string {
  if (score >= 70) return 'red';
  if (score >= 40) return 'orange';
  if (score >= 20) return 'yellow';
  return 'green';
}

// Tren pertumbuhan dari 3 penimbangan terakhir (sudah di-sort DESC)
function calculateTrendRisk(measurements: Penimbangan[]): { score: number; status: string } {
  if (measurements.length < 2) return { score: 30, status: 'Data tidak cukup' };

  const weights = measurements.map(m => m.berat_badan);
  let decreasingCount = 0;

  for (let i = 0; i < weights.length - 1; i++) {
    if (weights[i] < weights[i + 1]) decreasingCount++;
  }

  if (decreasingCount >= 2) return { score: 80, status: 'Berat badan menurun' };
  if (decreasingCount === 1) return { score: 50, status: 'Pertumbuhan tidak konsisten' };

  let allIncreasing = true;
  for (let i = 0; i < weights.length - 1; i++) {
    if (weights[i] <= weights[i + 1]) { allIncreasing = false; break; }
  }

  if (allIncreasing) return { score: 10, status: 'Pertumbuhan baik' };
  return { score: 20, status: 'Pertumbuhan stabil' };
}

function generateRecommendations(
  stunting: { score: number },
  wasting: { score: number },
  underweight: { score: number },
  trend: { score: number }
): string[] {
  const recs: string[] = [];

  if (stunting.score >= 70) recs.push('⚠️ PRIORITAS: Risiko stunting tinggi. Segera konsultasi ke Puskesmas.');
  else if (stunting.score >= 40) recs.push('Perhatikan asupan protein dan kalsium untuk pertumbuhan tinggi badan.');

  if (wasting.score >= 70) recs.push('⚠️ PRIORITAS: Risiko wasting tinggi. Perlu penanganan gizi segera.');
  else if (wasting.score >= 40) recs.push('Tingkatkan frekuensi makan dengan porsi lebih banyak.');

  if (underweight.score >= 70) recs.push('⚠️ PRIORITAS: Berat badan kurang. Konsultasi ke tenaga kesehatan.');
  else if (underweight.score >= 40) recs.push('Pastikan anak makan 3x sehari dengan 2x snack bergizi.');

  if (trend.score >= 70) recs.push('⚠️ Berat badan cenderung menurun. Perlu evaluasi penyebab.');

  if (recs.length === 0) {
    recs.push('✅ Pertumbuhan anak baik. Pertahankan pola makan dan pola asuh.');
    recs.push('Lanjutkan penimbangan rutin setiap bulan di Posyandu.');
  }

  return recs;
}
```

### 3.4 Analisis Kesehatan Lansia

```typescript
// Threshold Kondisi Kesehatan Lansia

// Hipertensi: sistole >= 140 ATAU diastole >= 90
function isHypertension(tekananDarah: string): boolean {
  if (!tekananDarah || !tekananDarah.includes('/')) return false;
  const [sistole, diastole] = tekananDarah.split('/').map(Number);
  return sistole >= 140 || diastole >= 90;
}

// Gula darah tinggi: > 200 mg/dL
function isDiabetesRisk(gulaDarah: number | null): boolean {
  return gulaDarah != null && gulaDarah > 200;
}

// Kolesterol tinggi: > 200 mg/dL
function isHighCholesterol(kolesterol: number | null): boolean {
  return kolesterol != null && kolesterol > 200;
}

// Asam urat tinggi: > 7 mg/dL
function isHighUricAcid(asamUrat: number | null): boolean {
  return asamUrat != null && asamUrat > 7;
}

// High risk = salah satu kondisi di atas TRUE
function isLansiaHighRisk(pemeriksaan: PemeriksaanLansia): boolean {
  return isHypertension(pemeriksaan.tekanan_darah ?? '') ||
         isDiabetesRisk(pemeriksaan.gula_darah) ||
         isHighCholesterol(pemeriksaan.kolesterol) ||
         isHighUricAcid(pemeriksaan.asam_urat);
}
```

### 3.5 Perhitungan SKDN (Laporan Dinas)

```
S = Total balita sasaran (usia 0-59 bulan)
K = Yang punya KMS (diasumsikan = S)
D = Yang datang ditimbang bulan ini (unique by balita_id)
N = Yang NAIK berat badannya dibanding bulan lalu
T = Yang TIDAK naik BB
2T = Yang turun BB 2 bulan berturut-turut
O = Yang TIDAK datang = S - D

Partisipasi = (D / S) × 100%
```

### 3.6 Perhitungan Usia

```typescript
function getUsiaBulan(tanggalLahir: string, tanggalUkur?: string): number {
  const lahir = new Date(tanggalLahir);
  const ukur = tanggalUkur ? new Date(tanggalUkur) : new Date();

  const years = ukur.getFullYear() - lahir.getFullYear();
  const months = ukur.getMonth() - lahir.getMonth();
  const days = ukur.getDate() - lahir.getDate();

  let totalMonths = years * 12 + months;
  if (days < 0) totalMonths--;

  return Math.max(0, totalMonths);
}

// Balita aktif = usia <= 60 bulan
function isBalitaAktif(tanggalLahir: string): boolean {
  return getUsiaBulan(tanggalLahir) <= 60;
}
```

---

## 4. Navigasi & Struktur Screen

### 4.1 Bottom Tab Navigation

```
┌─────────┬──────┬──────┬─────────┬───────────┐
│ Beranda │ Meja │ Data │ Analisis│  Laporan  │
│   🏠    │  🩺  │  📋  │   📊   │    📄    │
└─────────┴──────┴──────┴─────────┴───────────┘
```

| Tab | Icon | Nama | Fungsi Utama |
|-----|------|------|-------------|
| 1 | 🏠 | Beranda | Dashboard statistik |
| 2 | 🩺 | Pelayanan | Service Desk (Balita & Lansia) |
| 3 | 📋 | Data | Master Data + Riwayat + Monitoring |
| 4 | 📊 | Analisis | Analisis gizi & kesehatan |
| 5 | 📄 | Laporan | Generate & preview laporan |

### 4.2 Screen Map Lengkap

```
Login
  └── Main App (Tabs)
        ├── Tab 1: Beranda (Dashboard)
        │     ├── Filter bulan/tahun
        │     ├── Statistik Balita (cards + chart)
        │     ├── Statistik Lansia (cards + chart)
        │     ├── Tren Kehadiran (chart 6 bulan)
        │     ├── Tabel Balita Berisiko
        │     ├── Tabel Lansia Berisiko
        │     └── Alert (belum ditimbang, 2x tidak hadir)
        │
        ├── Tab 2: Pelayanan
        │     ├── Hub: Pilih Balita / Lansia
        │     ├── Service Desk Balita
        │     │     ├── Step 1: Cari balita
        │     │     ├── Step 2: Input BB, TB, LK, LL
        │     │     └── Step 3: Hasil Z-Score + Risk Prediction
        │     └── Service Desk Lansia
        │           ├── Step 1: Cari lansia
        │           ├── Step 2: Input TD, BB, TB, GD, Kol, AU
        │           └── Step 3: Hasil + Alert kondisi
        │
        ├── Tab 3: Data
        │     ├── Sub-menu: Balita / Lansia / Posyandu / Riwayat / Monitoring
        │     ├── List Balita (search + filter RT/Posyandu)
        │     │     ├── Detail Balita (info + grafik KMS + riwayat + risk)
        │     │     ├── Tambah Balita (form)
        │     │     └── Edit Balita (form)
        │     ├── List Lansia
        │     │     ├── Detail Lansia
        │     │     ├── Tambah Lansia
        │     │     └── Edit Lansia
        │     ├── Riwayat Penimbangan (filter bulan)
        │     ├── Riwayat Pemeriksaan Lansia (filter bulan)
        │     ├── Monitoring Balita (hadir/belum)
        │     └── Monitoring Lansia (hadir/belum)
        │
        ├── Tab 4: Analisis
        │     ├── Analisis Balita
        │     │     ├── Summary cards
        │     │     ├── Chart distribusi status gizi
        │     │     ├── Chart distribusi usia
        │     │     ├── Chart tren 6 bulan
        │     │     ├── Tabel data (filter: tahun, bulan, RT, status, usia, JK)
        │     │     └── Detail per balita → grafik longitudinal
        │     └── Analisis Lansia
        │           ├── Summary cards
        │           ├── Chart kondisi kesehatan
        │           ├── Multi-condition chart
        │           ├── Tabel data (filter: tahun, bulan, RT, kondisi, usia, JK)
        │           └── Detail per lansia → tren kesehatan
        │
        └── Tab 5: Laporan
              ├── Laporan Penimbangan Bulanan
              ├── Laporan Hasil Penimbangan (N/D)
              ├── Laporan Dinas Bulanan (SKDN)
              ├── Laporan Pemeriksaan Lansia
              ├── Rapor Anak (per individu)
              └── Rapor Lansia (per individu)
```

---

## 5. Spesifikasi Screen Detail

### 5.1 Dashboard (Beranda)

**Bagian Balita:**
- Card: Total Balita Aktif (usia ≤ 60 bulan)
- Card: Hadir Bulan Ini (D) + persentase partisipasi
- Card: Stunting Rate (zscore_tb_u < -2)
- Chart Donut: Distribusi status (Normal, Gizi Kurang, Gizi Buruk, Pendek, Sangat Pendek, BB Kurang)
- Alert Box: Jumlah balita belum ditimbang bulan ini
- Alert Box: Jumlah balita tidak hadir 2 bulan berturut

**Bagian Lansia:**
- Card: Total Lansia
- Card: Hadir Bulan Ini
- Card: High Risk Count
- Card: Persentase Hipertensi, Diabetes, Kolesterol, Asam Urat

**Shared:**
- Line Chart: Tren kehadiran 6 bulan (Balita + Lansia)
- Tab switch: Balita ↔ Lansia
- Filter: Bulan & Tahun (dropdown)

### 5.2 Service Desk Balita (3-Step Wizard)

**Step 1 — Cari Balita:**
- Input: Search bar (nama / NIK / nama ortu)
- Output: List hasil pencarian (max 10)
- Action: Tap untuk pilih → lanjut ke Step 2

**Step 2 — Input Data Penimbangan:**
- Header: Info balita terpilih (nama, usia)
- Fields:
  - Tanggal kegiatan (date picker, default: hari ini)
  - Berat Badan* (kg) — required, numeric, min:1, max:50
  - Tinggi Badan* (cm) — required, numeric, min:30, max:150
  - Lingkar Kepala (cm) — optional, numeric, min:20, max:60
  - Lingkar Lengan (cm) — optional, numeric, min:5, max:30
- Tombol: "Simpan & Hitung Z-Score"

**Step 3 — Hasil:**
- Cards Z-Score: BB/U, TB/U, IMT/U (zscore + status + color badge)
- Risk Prediction: Skor 0-100% + level + breakdown chart
- Rekomendasi: List text
- Warning: Jika BB/TB di luar rentang normal untuk usia
- Tombol: "Lanjut Balita Berikutnya" → reset ke Step 1

**Validasi Warning Ranges (warning saja, tidak block simpan):**
```typescript
const bbMin = Math.max(1, ageMonths * 0.3);
const bbMax = Math.min(50, 3 + (ageMonths * 0.5));
const tbMin = Math.max(30, 45 + (ageMonths * 0.8));
const tbMax = Math.min(150, 55 + (ageMonths * 1.5));
```

**Flow lengkap:**
```
User ketik nama → list muncul → tap balita →
  Form input muncul (BB, TB, LK, LL) →
  Tap "Simpan" →
  Hitung Z-Score lokal (rutin baca dari data WHO yang sudah di-cache saat app start) →
  Hitung Risk Prediction lokal →
  Simpan/Upload ke Supabase SATU KALI dengan data lengkap (BB, TB, z-score, dsb) →
  Tampilkan hasil lengkap →
  Tap "Lanjut" → kembali ke search
```

### 5.3 Service Desk Lansia (3-Step Wizard)

**Step 1:** Search bar (nama / NIK), List max 10

**Step 2 — Input Pemeriksaan:**
- Tekanan Darah* (text, format "120/80")
- Berat Badan* (kg) — min:20
- Tinggi Badan* (cm) — min:100
- Lingkar Perut (cm) — optional
- Gula Darah (mg/dL) — optional
- Kolesterol (mg/dL) — optional
- Asam Urat (mg/dL) — optional
- Keluhan (text area) — optional

**Step 3 — Hasil:**
- Alert badges: Hipertensi, Gula Tinggi, Kolesterol Tinggi, Asam Urat Tinggi
- Color: Merah jika ada alert, hijau jika normal

### 5.4 Detail Balita

- Info: Nama, NIK, Tanggal Lahir, Usia, JK, Nama Ortu, RT, Posyandu
- Tab 1: Grafik Pertumbuhan (BB/TB vs garis WHO -3SD s/d +3SD)
- Tab 2: Riwayat Penimbangan (tabel)
- Tab 3: Risk Prediction (skor + breakdown + rekomendasi)
- Actions: Edit, Hapus, Ke Service Desk

### 5.5 Validasi Form Balita

| Field | Rule |
|-------|------|
| posyandu_id | required |
| nik | required, exactly 16 digits, unique |
| nama | required, max 255 |
| tanggal_lahir | required, valid date |
| jenis_kelamin | required, `Laki-laki` or `Perempuan` |
| nama_ortu | required, max 255 |
| alamat | required |
| rt | required, integer, 1-10 |
| bb_lahir | optional, numeric, 0-10 |
| tb_lahir | optional, numeric, 0-70 |
| anak_ke | optional, integer, min 1 |

---

## 6. Supabase Configuration

### 6.1 Setup

1. Buat akun di https://supabase.com
2. Create new project (region: Southeast Asia - Singapore)
3. Jalankan SQL schema dari Section 2.2 di SQL Editor
4. Catat: `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari Settings → API

### 6.2 Client Init

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 6.3 Auth Flow

- Login: email + password (Supabase Auth)
- Buat user pertama via Supabase Dashboard → Authentication → Users → Add User
- Session persist di device via AsyncStorage

---

## 7. Pembagian Sprint

### SPRINT 1: Project Foundation & Database Setup

**Durasi**: 1 minggu

**Tasks:**
- [x] Init Expo project: `npx create-expo-app@latest ./`
- [x] Install dependencies: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-router`, `date-fns`, `zustand`
- [x] Buat `lib/supabase.ts`
- [x] Buat `lib/types.ts` (semua interfaces dari Section 2.3)
- [x] Buat `.env` dengan `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [x] Setup Supabase project → jalankan SQL schema dari Section 2.2
- [x] Buat `app/_layout.tsx` (root layout + auth check)
- [x] Buat `app/login.tsx`
- [x] Buat `app/(tabs)/_layout.tsx` (bottom tab 5 tabs)
- [x] Buat placeholder screen untuk setiap tab
- [x] Test login → masuk ke tab view

**Files:**
```
app/_layout.tsx, app/login.tsx
app/(tabs)/_layout.tsx, app/(tabs)/index.tsx, app/(tabs)/service-desk.tsx
app/(tabs)/data.tsx, app/(tabs)/analisis.tsx, app/(tabs)/laporan.tsx
lib/supabase.ts, lib/types.ts, lib/constants.ts
stores/auth-store.ts
```

**Done when:** App bisa dibuka, login berhasil, 5 tab tampil, session persist.

---

### SPRINT 2: Z-Score Engine (TypeScript)

**Durasi**: 1-2 minggu

**Tasks:**
- [x] Export data WHO dari MySQL web ke 6 file JSON
- [x] Buat `assets/data/` folder + JSON files
- [x] Buat `services/bmi-calculator.ts`
- [x] Buat `services/zscore-engine.ts` (semua fungsi dari Section 3.2)
- [x] Buat `services/risk-prediction.ts` (dari Section 3.3)
- [x] Test: hitung Z-Score dengan nilai yang sudah diketahui hasilnya

**Files:**
```
services/bmi-calculator.ts, services/zscore-engine.ts, services/risk-prediction.ts
lib/who-data/imt-u-boys.json, lib/who-data/imt-u-girls.json
lib/who-data/tb-u-boys.json, lib/who-data/tb-u-girls.json
lib/who-data/bb-u-boys.json, lib/who-data/bb-u-girls.json
```

**Done when:** Z-Score dihitung benar, Risk Prediction menghasilkan skor 0-100.

---

### SPRINT 3: Data Master — CRUD Balita & Lansia

**Durasi**: 1-2 minggu

**Tasks:**
- [x] Buat hooks/useBalita.ts, hooks/useLansia.ts, hooks/usePosyandu.ts
- [x] Buat komponen UI: SearchBar, Card, Badge, EmptyState
- [x] Buat CRUD screens: app/balita/index.tsx, create.tsx, [id].tsx, [id]/edit.tsx
- [x] Buat CRUD screens: app/lansia/index.tsx, create.tsx, [id].tsx, [id]/edit.tsx
- [x] Update app/(tabs)/data.tsx — hub menu

**Done when:** CRUD Balita & Lansia berfungsi penuh, search & filter bekerja, NIK validasi 16 digit.

---

### SPRINT 4: Service Desk Balita

**Durasi**: 1-2 minggu

**Tasks:**
- [x] Buat `app/service-desk/balita.tsx` — 3-step wizard (Search → Input → Hasil)
- [x] Integrasi Z-Score Engine di Step 3
- [x] Integrasi Risk Prediction
- [x] Buat `components/forms/PenimbanganForm.tsx`, `components/ui/StatCard.tsx`
- [x] Implementasi warning ranges
- [x] Update `app/(tabs)/service-desk.tsx` — hub pilih Balita/Lansia

**Done when:** Input penimbangan tersimpan, Z-Score 3 indikator tampil, Risk Prediction tampil, flow smooth.

---

### SPRINT 5: Service Desk Lansia

**Durasi**: 1 minggu

**Tasks:**
- [x] Buat `app/service-desk/lansia.tsx` — 3-step wizard
- [x] Implementasi health check alerts (hipertensi, gula, kolesterol, asam urat)
- [x] Simpan ke `pemeriksaan_lansias`
- [x] **Bonus**: Fitur Import Excel Balita & Lansia

**Done when:** Input pemeriksaan tersimpan, alert kondisi ditampilkan otomatis.

---

### SPRINT 6: Dashboard

**Durasi**: 1-2 minggu

**Tasks:**
- [x] Install chart library
- [x] Buat `hooks/useDashboard.ts`
- [x] Buat chart components: `StatusDistributionChart`, `TrendChart`
- [x] Buat `services/alert-service.ts`
- [x] Update `app/(tabs)/index.tsx` — dashboard penuh (balita + lansia tabs, cards, charts, alerts, tabel berisiko, filter)

**Done when:** Statistik akurat, charts render, alerts tampil, filter bulan/tahun berfungsi.

---

### SPRINT 7: Riwayat & Monitoring

**Durasi**: 1 minggu

**Tasks:**
- [x] Buat `app/penimbangan/index.tsx` — riwayat penimbangan (filter bulan)
- [x] Buat `app/pemeriksaan/index.tsx` — riwayat pemeriksaan lansia
- [x] Buat `app/monitoring/balita.tsx` — sudah vs belum ditimbang
- [x] Buat `app/monitoring/lansia.tsx` — sudah vs belum diperiksa

**Done when:** Riwayat tampil terfilter, monitoring menunjukkan status kehadiran.

---

### SPRINT 8: Analisis Balita & Lansia

**Durasi**: 1-2 minggu

**Tasks:**
- [/] Buat `app/analisis/balita.tsx` — summary cards, charts, tabel + filter, tap → detail
- [/] Buat `app/analisis/lansia.tsx` — summary cards, charts, multi-condition, tabel + filter
- [x] Buat `app/analisis/detail-balita/[id].tsx` — grafik tren longitudinal
- [x] Buat `app/analisis/detail-lansia/[id].tsx` — tren TD, gula, kolesterol, asam urat
- [x] Buat `components/charts/GrowthChart.tsx`

**Done when:** Summary cards akurat, charts render, filter multi-kombinasi berfungsi, detail tren tampil.

---

### SPRINT 9: Laporan (PDF)

**Durasi**: 1-2 minggu

**Tasks:**
- [x] Install `expo-print`, `expo-sharing`
- [x] Buat `services/report-generator.ts` — HTML templates untuk setiap laporan
- [x] Buat `app/laporan/index.tsx` — menu pilih jenis + filter (Sekarang di `app/admin/reports.tsx`)
- [x] Buat `app/laporan/preview.tsx` — preview + share
- [x] Implementasi laporan: Penimbangan Bulanan, SKDN

**Cara generate PDF:**
```typescript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function generateAndShare(html: string, filename: string) {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename });
}
```

**Done when:** PDF di-generate dan bisa di-share via WhatsApp.

---

### SPRINT 10: Polish, Testing & Data Migration

**Durasi**: 1-2 minggu

**Tasks:**
- [ ] UI polish: konsistensi warna, spacing, loading states
- [ ] Error handling: semua API call punya try-catch + user-friendly message
- [ ] Empty states: semua list punya pesan jika kosong
- [ ] Pull-to-refresh di semua list screens
- [ ] Migrasi data historis dari MySQL → Supabase (export CSV, import via Dashboard)
- [ ] Build APK: `eas build --platform android --profile preview`
- [ ] Test di HP fisik
- [ ] Fix bugs

**Done when:** App lancar di HP fisik, data historis termigrasi, APK siap distribusi.

---

## 8. Data Migration

### 8.1 Export dari MySQL Web

```sql
SELECT * FROM posyandus INTO OUTFILE '/tmp/posyandus.csv'
  FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';

SELECT * FROM balitas INTO OUTFILE '/tmp/balitas.csv'
  FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
-- sama untuk tabel lainnya
```

### 8.2 Import ke Supabase

Gunakan Supabase Dashboard → Table Editor → Import CSV.

> **PENTING**: ID di MySQL = auto-increment integer, di Supabase = UUID.
> Perlu mapping ID lama → UUID baru dan update semua foreign keys. Sangat disarankan untuk menulis **Script Migrasi (Node.js/Python)** yang memproses ID remapping secara otomatis dan validasi pasca-migrasi, tidak disarankan memakai Import CSV manual.

---

## 9. Konvensi & Standar Kode

### 9.1 Naming

| Jenis | Convention | Contoh |
|-------|-----------|--------|
| File component | PascalCase | `StatCard.tsx` |
| File service | kebab-case | `zscore-engine.ts` |
| File hook | camelCase prefix `use` | `useBalita.ts` |
| Variable | camelCase | `totalBalita` |
| Type/Interface | PascalCase | `Penimbangan` |
| Constant | UPPER_SNAKE | `MAX_AGE_MONTHS` |

### 9.2 Warna Status Gizi

```typescript
export const STATUS_COLORS: Record<string, string> = {
  'Gizi Buruk': '#ef4444',
  'Gizi Kurang': '#f97316',
  'Gizi Baik': '#22c55e',
  'Gizi Lebih': '#0ea5e9',
  'Obesitas': '#a855f7',
  'Sangat Pendek (SP)': '#ec4899',
  'Pendek (P)': '#8b5cf6',
  'Normal (N)': '#22c55e',
  'Tinggi (T)': '#06b6d4',
  'BB Sangat Kurang (SK)': '#ef4444',
  'BB Kurang (K)': '#f97316',
  'BB Normal (N)': '#22c55e',
  'Resiko BB Lebih (RL)': '#0ea5e9',
};

export const RISK_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  gray: '#6b7280',
};
```

### 9.3 Bahasa

- **UI**: Bahasa Indonesia
- **Kode**: Bahasa Inggris (variable, function names)
- **Komentar**: Bahasa Indonesia OK

---

## 10. Referensi Visual

### 10.1 Design System

- **Primary Color**: Biru teal (#0d9488)
- **Background**: White (#ffffff) / Slate-50 (#f8fafc)
- **Text**: Slate-900 (#0f172a)
- **Card Shadow**: Soft shadow (elevation: 2)
- **Border Radius**: 12px (cards), 8px (buttons), 999px (badges)
- **Font**: System default

### 10.2 Alur Referensi dari Sistem Web

**Service Desk Balita:**
```
[Search Box] → [List Hasil] → [Tap Pilih] →
[Form: BB, TB, LK, LL, Tanggal] → [Simpan] →
[Hasil: 3 Cards Z-Score + Risk Meter + Rekomendasi] →
[Tombol "Lanjut Berikutnya"]
```

**Dashboard:**
```
[Row 1: 3-4 Summary Cards]
[Row 2: Donut Chart + Bar Chart]
[Row 3: Line Chart (tren 6 bulan)]
[Row 4: Tabel Berisiko]
[Tab Switch: Balita ↔ Lansia]
```

---

> **CATATAN AKHIR UNTUK DEVELOPER:**
>
> 1. Selalu test dengan data nyata — buat minimal 5 balita dan 5 lansia dummy
> 2. Z-Score engine harus ditest dengan nilai yang sudah diketahui hasilnya
> 3. Prioritaskan fitur Service Desk karena ini yang paling sering dipakai
> 4. Jangan lupa loading states dan error handling di setiap API call
> 5. Build APK di setiap akhir sprint untuk validasi di HP fisik

---

## 11. Kelengkapan Spesifikasi Tambahan

### 11.1 Detail Lansia
- **Info**: Nama, NIK, Tanggal Lahir, Usia, JK, Alamat, Penyakit Bawaan.
- **Tab 1: Status Terakhir**: Alert badges untuk kondisi kesehatan terkini (Hipertensi, dsb).
- **Tab 2: Riwayat Pemeriksaan**: Tabel riwayat kunjungan lansia.
- **Tab 3: Grafik Kesehatan**: Chart linier menunjukkan tren Tekanan Darah (Sistole/Diastole), Gula Darah, Kolesterol, dan Asam Urat. 
- **Actions**: Edit, Hapus, Pindah ke Service Desk.

### 11.2 Analisis Balita & Lansia
- **Analisis Balita**:
  - Filter: Tahun, Bulan, RT, Posyandu, Jenis Kelamin.
  - Komponen: Bar chart sebaran status gizi (Normal/Buruk/dsb), Line chart pertumbuhan kolektif, card summary (Stunting rate, total sasaran).
- **Analisis Lansia**:
  - Filter: Tahun, Bulan, RT, Posyandu, Kondisi (Hipertensi/Asam Urat/dsb).
  - Komponen: Donut chart prevalensi penyakit lansia, Tabel agregat untuk follow up rujukan.

### 11.3 GrowthChart (Kurva WHO)
- Rendering menggunakan library yang menunjang multi-line (seperti `victory-native` atau `react-native-chart-kit` varian line).
- **Format Data**: Chart menampilkan 5 garis referensi statis (-3SD, -2SD, Median/0, +2SD, +3SD) berdasarkan dari raw JSON `who-data` yang dicocokkan dengan jenis kelamin anak. Garis ke-6 adalah plot berat/tinggi aktual balita seiring bertambahnya usia/bulan.

### 11.4 Spesifikasi Tab Laporan (PDF) & HTML Template
- Menggunakan skema desain kop surat standar dinas, font Arial/Times New Roman.
- Tabulasi agregat (Data SKDN dsb) yang di-render dalam HTML `<table>` dengan helper CSS khusus media `@print`.
- **Preview & Ekspor**: Setelah HTML diformat, file langsung dikonversi menjadi temporary `.pdf` (via `expo-print`) dan dibuka via antarmuka Android default sharing actions (via `expo-sharing` seperti ke WhatsApp dll).

### 11.5 Setting Posyandu
- Form untuk mengkonfigurasi pengaturan dasar aplikasi: Nama Posyandu default, Alamat, dan fitur penunjang lainnya.
- Data ini disimpan di `AsyncStorage` agar auto-fill form saat registrasi lansia/balita.

---

## 12. Strategi Offline & Konektivitas

Karena konektivitas seluler/WiFi di layanan operasional posyandu mungkin tidak stabil, arsitekturnya diatur sebagai berikut:
1. **Cache Read-only Data (Zustand + AsyncStorage)**: Data master referensi seperti file JSON parameter WHO dan List Data Baseline Balita/Lansia harus *ter-cache* ketika sedang *online*.
2. **Offline Queue Mechanism**: Saat menyimpan Form Penimbangan atau Pemeriksaan dalam kondisi *offline*, status form di-save di mode Queue local (disebut "Draft" atau "Waiting Sync"). 
3. **Background/Foreground Sync**: Jika aplikasi mendeteksi sinyal pulih (lewat event listener konektivitas seperti pckg `NetInfo`), antrean mutasi ini terupload secara massal ke backend Supabase.
4. **Resiliency Mode**: Menyediakan tombol *manual* "Sync Now" agar Kader/Operator bisa mensinkronkan data sesampainya di titik yang memadai koneksinya.

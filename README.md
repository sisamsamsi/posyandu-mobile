# AYOMI (Rawat Tumbuhnya, Jaga Tuanya) 🌱
### *Platform B2B SaaS Manajemen Posyandu Terintegrasi & Cerdas Berbasis Multi-Tenant*

[![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-v0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-Llama_3.3_70b-orange?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 📌 Sekilas Tentang AYOMI

**AYOMI** adalah sistem manajemen posyandu digital modern berskala nasional yang mengusung konsep *Software-as-a-Service* (SaaS). Dirancang khusus untuk kader posyandu di Indonesia, AYOMI mendukung dual-workspace untuk memantau tumbuh kembang **Balita** dan kesehatan metabolik **Lansia** secara terpisah dalam satu aplikasi tunggal yang aman, cepat, dan responsif.

Aplikasi ini beroperasi dengan tingkat kemandirian penuh, dapat dideploy tanpa ketergantungan server pusat yang rumit, dan diisolasi dengan keamanan data multi-tenant tingkat tinggi untuk mencegah kebocoran data antar-wilayah posyandu.

---

## 🛠️ Pilar Utama Keunggulan Sistem

### 🔒 1. Isolasi Data Multi-Tenant (B2B SaaS Workspace)
AYOMI mengamankan data warga menggunakan sistem **Multi-Tenant Workspace** yang terisolasi ketat di tingkat *Row Level Security* (RLS) database Supabase:
* **Kode Invite 6-Digit:** Setiap ketua posyandu (Pionir) dapat mendaftarkan posyandunya dan membagikan Kode Invite unik (misalnya: `AX92BZ`) kepada para kader.
* **Isolasi Lintas Wilayah:** Kader dari Posyandu Kelurahan A sama sekali tidak dapat melihat, menyunting, atau membocorkan data warga dari Posyandu Kelurahan B.

### 🧠 2. Asisten AI Penyuluhan Gizi (Meja 4 & Meja 5 Terpadu)
Integrasi **Groq API** menggunakan model tercanggih `llama-3.3-70b-versatile` merombak layanan penyuluhan posyandu konvensional menjadi cerdas dan presisi:
* **Sensor Sosial-Ekonomi Mikro:** AI dilatih secara etis untuk menggali faktor eksternal gizi anak (seperti akses air bersih, ketersediaan protein lokal di pasar terdekat, pola asuh harian) tanpa menanyakan privasi sensitif (nominal pendapatan, kepemilikan aset, atau kekayaan orang tua).
* **Ingatan Sesi Bulanan (Evolving Memory):** Sistem secara otomatis membaca sesi konseling bulan sebelumnya dari database Supabase untuk merumuskan pertanyaan kelanjutan yang berkembang setiap bulannya (mencegah *Cold Start*).
* **Antrean Dual-Mode & Timbangan Cepat:** Kader dapat menggunakan mode antrean penimbangan hari ini, pencarian bebas, serta modul **"Input Timbangan Cepat"** untuk memasukkan data berat/tinggi secara langsung apabila petugas Meja 3 terlambat menginput atau berhalangan hadir.

### 📈 3. Logika Medis Akurat (Standar WHO & Kemenkes RI)
* **Koreksi Z-Score WHO:** Algoritma interpolasi linier asimetris yang disesuaikan dengan kurva deviasi standar negatif WHO untuk menghasilkan analisis status gizi (`BB/U`, `TB/U`, `BB/TB`) yang 100% akurat.
* **Tren Pertumbuhan KMS:** Logika deteksi tren tumbuh kembang balita sesuai kaidah Buku KIA Kemenkes, di mana penimbangan dengan kenaikan 0 kg didiagnosis secara klinis sebagai **"Pertumbuhan Stagnan (T)"**.
* **Validasi Skrining Lansia:** Penanganan input tekanan darah tangguh dengan verifikasi pola ekspresi reguler (`^\d+\/\d+$`) untuk mencegah anomali data medis "Normal NaN/NaN mmHg".

### 🚀 4. Pembaruan OTA (Over-the-Air) & UI Premium
* **EAS Update Integration:** Kader posyandu tidak perlu melakukan instalasi ulang berkas APK secara manual setiap ada pembaruan fitur. Aplikasi akan memeriksa rilis baru secara *real-time* saat dibuka dan memasangnya secara instan melalui sistem OTA.
* **Tabs Navigasi & Pengaturan Mandiri:** Pemisahan menu pengaturan posyandu ke dalam rute mandiri (`/settings`) guna menghilangkan tab bar bawah saat kader menyunting profil. Menu tabs didesain melengkung (*rounded 30*) dengan indikator focal-dot active state premium.

---

## 📁 Peta Struktur Direktori Utama

```text
posyandu-mobile-quality-audit/
├── app/                        # Direktori Halaman Utama (Expo Router)
│   ├── (tabs)/                 # Navigasi Tab Bar Bawah (Rounded 30)
│   │   ├── _layout.tsx         # Konfigurasi Efek Aktif Focal Dot & Hide Keyboard
│   │   ├── index.tsx           # Dashboard Utama (Statistik SKDN & Dialog OTA Update)
│   │   ├── service-desk.tsx    # Layanan Terpadu (Hub Utama Akses Penyuluhan AI)
│   │   ├── data.tsx            # Manajemen Data Warga (Balita & Lansia)
│   │   ├── analisis.tsx        # Analisis Kurva KMS Kemenkes
│   │   └── laporan.tsx         # Ekspor Cetak Laporan Puskesmas
│   ├── counseling/             # FITUR BARU: Penyuluhan Gizi Cerdas AI
│   │   ├── queue.tsx           # Antrean Hari Ini & Input Timbangan Cepat Meja 4/5
│   │   └── session.tsx         # Sesi Wawancara AI & Integrasi Supabase Memory
│   ├── settings.tsx            # Rute Mandiri Pengaturan Akun & Profil Posyandu
│   └── _layout.tsx             # Pengatur Navigasi Utama Aplikasi
├── components/                 # Komponen Antarmuka Pengguna (UI Kit)
│   └── ui/                     # Kartu, Badge, Switcher, dan Filter Dinamis
├── hooks/                      # Hooks Kustom React (Otentikasi, Multi-Tenant)
├── lib/                        # Konfigurasi Klien & Konstanta Global
│   ├── supabase.ts             # Klien Supabase Terenkripsi RLS
│   └── types.ts                # Deklarasi Tipe Data Strict TypeScript
├── services/                   # Pusat Logika Layanan (Service Layer)
│   ├── groq-service.ts         # Layanan Integrasi LLM Groq (API Prompt & JSON Response)
│   ├── whatsapp-service.ts     # Format Pesan WhatsApp Terpadu (Unified Report)
│   ├── zscore-engine.ts        # Algoritma Interpolasi Z-Score WHO
│   ├── health-analyzer.ts      # Skrining & Validasi Tekanan Darah Lansia
│   └── risk-prediction.ts      # Prediksi Tren Tumbuh Kembang KIA Kemenkes
└── stores/                     # State Management Global (Zustand)
```

---

## 💾 Skema Tabel Supabase (SQL DDL)

Untuk mengaktifkan fitur memori asisten AI gizi, jalankan kode DDL SQL berikut di **Supabase SQL Editor**:

```sql
-- Membuat tabel penyuluhan gizi berbasis AI
CREATE TABLE penyuluhans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    balita_id UUID NOT NULL REFERENCES balitas(id) ON DELETE CASCADE,
    penimbangan_id UUID REFERENCES penimbangans(id) ON DELETE SET NULL,
    kader_id UUID,
    tanggal DATE NOT NULL,
    pertanyaan TEXT[] NOT NULL,
    jawaban TEXT[] NOT NULL,
    rekomendasi TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE penyuluhans ENABLE ROW LEVEL SECURITY;

-- Membuat policy akses data untuk pengguna terautentikasi (Kader)
CREATE POLICY "Allow access for authenticated users" ON penyuluhans 
    FOR ALL TO authenticated USING (true);

-- Membuat indeks pencarian performa tinggi
CREATE INDEX idx_penyuluhans_balita_id ON penyuluhans(balita_id);
CREATE INDEX idx_penyuluhans_tanggal ON penyuluhans(tanggal);
```

---

## 📱 Format Laporan Terpadu WhatsApp (Unified Report)

Ketika sesi konseling selesai, kader dapat mengirimkan laporan terpadu ke nomor WhatsApp wali murid dalam satu format rapi berikut:

```text
📊 LAPORAN TERPADU POSYANDU & PENYULUHAN AI 🏥
_Posyandu Melati Indah_
📅 21 Mei 2026

Assalamualaikum Wr. Wb. Ibu/Bapak dari ananda Muhammad Arfan.
Berikut adalah hasil pencatatan tumbuh kembang dan penyuluhan gizi ananda hari ini:

📌 DATA ANANDA:
• Usia: 14 bulan
• Berat Badan: 9.8 kg
• Tinggi Badan: 78 cm
• Lingkar Kepala: 46 cm
• Lingkar Lengan (LiLA): 13.5 cm

📊 ANALISIS STATUS GIZI (WHO Z-Score):
• BB berdasarkan Umur (BB/U): Normal
• TB berdasarkan Umur (TB/U): Normal
• BB berdasarkan TB (BB/TB): Normal

💡 PANDUAN GIZI & STIMULASI AI (Meja 4/5):
1. Pertahankan pemberian telur rebus atau ikan kembung harian sebagai sumber protein lokal yang terjangkau untuk menunjang tumbuh kembang optimalnya.
2. Ananda sedang aktif bereksplorasi secara motorik kasar, berikan stimulasi berupa permainan menyusun balok dan ajak berjalan tanpa alas kaki di permukaan aman.
3. Pastikan kebersihan air minum ananda terjaga dengan memasaknya hingga mendidih sempurna.

Tetap rutin membawa ananda ke Posyandu setiap bulan untuk memantau tumbuh kembang optimalnya. Terima kasih. 🙏
_Layanan Posyandu Digital - AYOMI_
```

---

## 🚀 Panduan Pemasangan Lokal

### 1. Kloning Proyek & Pasang Dependensi
```bash
git clone https://github.com/sisamsamsi/posyandu-mobile.git
cd posyandu-mobile
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Buat berkas `.env` di akar direktori dan lengkapi variabel berikut:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GROQ_API_KEY=gsk_your-groq-api-key
```

### 3. Jalankan Proyek
```bash
# Menjalankan di Expo Go atau Emulator
npm run dev
```

---

## ⚖️ Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Anda bebas menggunakan, menyunting, dan mendistribusikan aplikasi ini untuk kemajuan kesehatan masyarakat di seluruh wilayah Indonesia.

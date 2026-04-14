-- ============================================
-- MIGRASI: Pengaturan Posyandu & No HP Ortu
-- Jalankan di Supabase SQL Editor
-- Tanggal: 2026-04-12
-- ============================================

-- ============================================
-- 1. EXTEND TABEL POSYANDUS
--    Tambah field profil & jadwal terpisah
--    (tanpa kontak kader/bidan)
-- ============================================

-- Alamat lengkap posyandu
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS alamat_lengkap TEXT;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS kelurahan TEXT;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS kecamatan TEXT;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS kabupaten TEXT;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS provinsi TEXT DEFAULT 'Jawa Barat';

-- Jadwal Posyandu BALITA (tanggal pelaksanaan per bulan)
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS jadwal_balita_tanggal INTEGER CHECK (jadwal_balita_tanggal >= 1 AND jadwal_balita_tanggal <= 31);
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS jadwal_balita_jam TEXT DEFAULT '08:00';

-- Jadwal Posyandu LANSIA (tanggal pelaksanaan per bulan, bisa berbeda)
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS jadwal_lansia_tanggal INTEGER CHECK (jadwal_lansia_tanggal >= 1 AND jadwal_lansia_tanggal <= 31);
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS jadwal_lansia_jam TEXT DEFAULT '08:00';

-- Logo posyandu (opsional, URL)
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================
-- 2. TAMBAH NO HP ORANG TUA DI BALITAS
--    Diisi bertahap secara manual oleh kader
--    Format: 628xxxxxxxxxx (tanpa +, tanpa 0 di depan)
--    Contoh: 6281234567890
-- ============================================

ALTER TABLE balitas ADD COLUMN IF NOT EXISTS no_hp_ortu TEXT;

-- ============================================
-- CATATAN FORMAT NOMOR WHATSAPP:
-- ============================================
-- Simpan dalam format INTERNASIONAL tanpa tanda +
-- Contoh:
--   0812-3456-7890  → simpan sebagai: 6281234567890
--   +62 857-1234-5678 → simpan sebagai: 6285712345678
--
-- Aplikasi akan otomatis konversi format saat input:
--   - Jika diawali "08" → ganti "0" dengan "62"
--   - Jika diawali "+62" → hapus "+"
--   - Jika sudah "62" → simpan apa adanya
-- ============================================

-- ====================================================================
-- MIGRASI: Pemisahan Nama & Alamat Posyandu (Balita & Lansia)
-- Jalankan skrip ini di SQL Editor Supabase Anda untuk menambahkan kolom baru.
-- ====================================================================

-- Kolom khusus untuk profil layanan Balita
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS nama_posyandu_balita TEXT;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS alamat_posyandu_balita TEXT;

-- Kolom khusus untuk profil layanan Lansia
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS nama_posyandu_lansia TEXT;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS alamat_posyandu_lansia TEXT;

-- ====================================================================
-- KETERANGAN:
-- Jika kolom-kolom ini bernilai NULL, aplikasi akan otomatis menggunakan 
-- kolom utama (nama_posyandu dan alamat_lengkap) sebagai cadangan.
-- ====================================================================

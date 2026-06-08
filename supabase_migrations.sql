-- =========================================================================
-- SIMPUL SEHAT WEB PORTAL DATABASE MIGRATION SCRIPT
-- Jalankan skrip ini di SQL Editor pada Dashboard Supabase Anda.
-- Skrip ini dirancang agar kompatibel dengan aplikasi mobile (tidak merusak data).
-- =========================================================================

-- 1. Tambah Kolom ke Tabel 'posyandus' (Semua bersifat NULLABLE atau DEFAULT)
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS tipe_posyandu VARCHAR(10) DEFAULT 'balita';
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS kode_ketua VARCHAR(8) UNIQUE;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS alamat_posyandu_lansia TEXT;
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS nama_posyandu_lansia VARCHAR(255);

-- 2. Buat Tabel 'user_roles' untuk membedakan role login Puskesmas Admin & Kader
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('puskesmas_admin', 'kader')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_role UNIQUE (user_id)
);

-- Aktifkan RLS untuk user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Buat Kebijakan RLS untuk user_roles
CREATE POLICY "Admin dapat melihat semua role"
ON user_roles FOR SELECT
TO authenticated
USING (
    exists (
        select 1 from user_roles
        where user_roles.user_id = auth.uid() and user_roles.role = 'puskesmas_admin'
    )
);

CREATE POLICY "Setiap user dapat membaca role-nya sendiri"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin dapat mengelola role"
ON user_roles FOR ALL
TO authenticated
USING (
    exists (
        select 1 from user_roles
        where user_roles.user_id = auth.uid() and user_roles.role = 'puskesmas_admin'
    )
);

-- 3. Buat Tabel 'data_anomali_logs' untuk Dashboard Utama Web Puskesmas
CREATE TABLE IF NOT EXISTS data_anomali_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipe_kategori VARCHAR(10) NOT NULL CHECK (tipe_kategori IN ('balita', 'lansia')),
    referensi_id UUID NOT NULL, -- FK ke penimbangans / pemeriksaan_lansias
    nama_subjek VARCHAR(255) NOT NULL,
    nama_posyandu VARCHAR(255) NOT NULL,
    tanggal_data DATE NOT NULL,
    indikator_anomali VARCHAR(100) NOT NULL,
    deskripsi_anomali TEXT NOT NULL,
    status_verifikasi VARCHAR(15) DEFAULT 'belum_diperiksa' CHECK (status_verifikasi IN ('belum_diperiksa', 'valid', 'perlu_koreksi')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan RLS untuk data_anomali_logs
ALTER TABLE data_anomali_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk data_anomali_logs (Hanya Admin Puskesmas yang bisa akses)
CREATE POLICY "Admin Puskesmas memiliki akses penuh ke data anomali"
ON data_anomali_logs FOR ALL
TO authenticated
USING (
    exists (
        select 1 from user_roles
        where user_roles.user_id = auth.uid() and user_roles.role = 'puskesmas_admin'
    )
);

-- 4. Indeks untuk optimasi pencarian data skala besar
CREATE INDEX IF NOT EXISTS idx_posyandus_tipe ON posyandus(tipe_posyandu);
CREATE INDEX IF NOT EXISTS idx_user_roles_uid ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_anomali_tgl ON data_anomali_logs(tanggal_data);

-- ========================================================
-- PERBAIKAN SECURITY & ROW LEVEL SECURITY (RLS)
-- Untuk Tabel user_roles, data_anomali_logs, dan imunisasi
-- Jalankan skrip ini di SQL Editor Supabase Anda
-- ========================================================

-- 1. Buat Helper Function dengan SECURITY DEFINER untuk Bypassing RLS Recursion
CREATE OR REPLACE FUNCTION public.is_puskesmas_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'puskesmas_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Perbarui Kebijakan RLS untuk user_roles (Menghilangkan Rekursi)
DROP POLICY IF EXISTS "Admin dapat melihat semua role" ON user_roles;
DROP POLICY IF EXISTS "Setiap user dapat membaca role-nya sendiri" ON user_roles;
DROP POLICY IF EXISTS "Admin dapat mengelola role" ON user_roles;

CREATE POLICY "Admin dapat melihat semua role"
ON user_roles FOR SELECT
TO authenticated
USING (public.is_puskesmas_admin());

CREATE POLICY "Setiap user dapat membaca role-nya sendiri"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin dapat mengelola role"
ON user_roles FOR ALL
TO authenticated
USING (public.is_puskesmas_admin())
WITH CHECK (public.is_puskesmas_admin());


-- 3. Perbarui Kebijakan RLS untuk data_anomali_logs
DROP POLICY IF EXISTS "Admin Puskesmas memiliki akses penuh ke data anomali" ON data_anomali_logs;

CREATE POLICY "Admin Puskesmas memiliki akses penuh ke data anomali"
ON data_anomali_logs FOR ALL
TO authenticated
USING (public.is_puskesmas_admin())
WITH CHECK (public.is_puskesmas_admin());


-- 4. Perbarui Kebijakan RLS untuk imunisasi
ALTER TABLE imunisasi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON imunisasi;
DROP POLICY IF EXISTS "policy_imunisasi" ON imunisasi;
DROP POLICY IF EXISTS "policy_kader_imunisasi" ON imunisasi;
DROP POLICY IF EXISTS "policy_admin_imunisasi" ON imunisasi;

-- Kader: Dapat mengelola data imunisasi jika balita berada di posyandu wilayah tugasnya
CREATE POLICY policy_kader_imunisasi ON imunisasi
  FOR ALL
  TO authenticated
  USING (
    balita_id IN (
      SELECT id FROM balitas WHERE posyandu_id IN (
        SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    balita_id IN (
      SELECT id FROM balitas WHERE posyandu_id IN (
        SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
      )
    )
  );

-- Admin Puskesmas: Dapat mengelola semua data imunisasi
CREATE POLICY policy_admin_imunisasi ON imunisasi
  FOR ALL
  TO authenticated
  USING (public.is_puskesmas_admin())
  WITH CHECK (public.is_puskesmas_admin());

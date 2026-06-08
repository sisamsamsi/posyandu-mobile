-- ========================================================
-- AYOMI SECURITY & PERFORMANCE OPTIMIZATIONS
-- Jalankan skrip ini di SQL Editor Supabase Anda
-- ========================================================

-- ── 1. AKTIFKAN EXTENSION TRiGRAM UNTUK PENCARIAN CEPAT ──
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Pasang GIN Trigram index pada kolom pencarian nama & NIK
CREATE INDEX IF NOT EXISTS idx_balitas_nama_trgm ON balitas USING gin (nama gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_balitas_nik_trgm ON balitas USING gin (nik gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lansias_nama_trgm ON lansias USING gin (nama gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lansias_nik_trgm ON lansias USING gin (nik gin_trgm_ops);


-- ── 2. AKTIFKAN ROW LEVEL SECURITY (RLS) PADA SEMUA TABEL UTAMA ──
ALTER TABLE posyandus ENABLE ROW LEVEL SECURITY;
ALTER TABLE kader_posyandu ENABLE ROW LEVEL SECURITY;
ALTER TABLE balitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE penimbangans ENABLE ROW LEVEL SECURITY;
ALTER TABLE penyuluhans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lansias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pemeriksaan_lansias ENABLE ROW LEVEL SECURITY;

-- Aktifkan RLS untuk Tabel WHO Standards (Read-Only Publik)
ALTER TABLE who_bb_u_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE who_tb_u_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE who_imt_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE who_bb_tb_standards ENABLE ROW LEVEL SECURITY;


-- ── 3. KEBIJAKAN (POLICIES) UNTUK TABEL STANDAR WHO (READ-ONLY PUBLIK) ──
DROP POLICY IF EXISTS select_public_bb_u ON who_bb_u_standards;
DROP POLICY IF EXISTS select_public_tb_u ON who_tb_u_standards;
DROP POLICY IF EXISTS select_public_imt ON who_imt_standards;
DROP POLICY IF EXISTS select_public_bb_tb ON who_bb_tb_standards;

CREATE POLICY select_public_bb_u ON who_bb_u_standards FOR SELECT USING (true);
CREATE POLICY select_public_tb_u ON who_tb_u_standards FOR SELECT USING (true);
CREATE POLICY select_public_imt ON who_imt_standards FOR SELECT USING (true);
CREATE POLICY select_public_bb_tb ON who_bb_tb_standards FOR SELECT USING (true);


-- ── 4. BERSIHKAN KEBIJAKAN LAMA / KONFLIK (SUPABASE DEFAULT POLICIES) ──
-- Hapus kebijakan bawaan/permissive yang mungkin mengizinkan akses tanpa batas
DROP POLICY IF EXISTS "Enable read access for all users" ON kader_posyandu;
DROP POLICY IF EXISTS "Enable read access for all users" ON posyandus;
DROP POLICY IF EXISTS "Enable read access for all users" ON balitas;
DROP POLICY IF EXISTS "Enable read access for all users" ON penimbangans;
DROP POLICY IF EXISTS "Enable read access for all users" ON penyuluhans;
DROP POLICY IF EXISTS "Enable read access for all users" ON lansias;
DROP POLICY IF EXISTS "Enable read access for all users" ON pemeriksaan_lansias;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON kader_posyandu;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON posyandus;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON balitas;

DROP POLICY IF EXISTS "policy_kader_posyandu" ON kader_posyandu;
DROP POLICY IF EXISTS "policy_posyandus" ON posyandus;
DROP POLICY IF EXISTS "policy_balitas" ON balitas;
DROP POLICY IF EXISTS "policy_penimbangans" ON penimbangans;
DROP POLICY IF EXISTS "policy_penyuluhans" ON penyuluhans;
DROP POLICY IF EXISTS "policy_lansias" ON lansias;
DROP POLICY IF EXISTS "policy_pemeriksaan_lansias" ON pemeriksaan_lansias;


-- ── 5. KEBIJAKAN UTAMA UNTUK RELASI DAN WILAYAH TUGAS ──

-- A. kader_posyandu: Kader hanya bisa melihat/mengelola hubungan tugas mereka sendiri
CREATE POLICY policy_kader_posyandu ON kader_posyandu
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- B. posyandus: Kader bisa melihat data posyandu apa saja (untuk pendaftaran/validasi kode undangan)
-- tetapi hanya bisa melakukan update/delete jika mereka adalah 'ketua' dari posyandu tersebut
CREATE POLICY policy_select_posyandus ON posyandus
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_posyandus ON posyandus
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY policy_update_posyandus ON posyandus
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT posyandu_id FROM kader_posyandu 
      WHERE user_id = auth.uid() AND role = 'ketua'
    )
  );


-- ── 6. KEBIJAKAN ISOLASI DATA (MULTI-TENANCY POSYANDU ISOLATION) ──

-- C. balitas: Kader hanya bisa mengelola Balita di Posyandu tempat dia terdaftar
CREATE POLICY policy_balitas ON balitas
  FOR ALL
  TO authenticated
  USING (
    posyandu_id IN (
      SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    posyandu_id IN (
      SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
    )
  );

-- D. penimbangans: Kader hanya bisa mengelola timbangan Balita milik Posyandunya
CREATE POLICY policy_penimbangans ON penimbangans
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

-- E. penyuluhans: Kader hanya bisa mengelola data counseling Balita milik Posyandunya
CREATE POLICY policy_penyuluhans ON penyuluhans
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

-- F. lansias: Kader hanya bisa mengelola Lansia di Posyandu tempat dia terdaftar
CREATE POLICY policy_lansias ON lansias
  FOR ALL
  TO authenticated
  USING (
    posyandu_id IN (
      SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    posyandu_id IN (
      SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
    )
  );

-- G. pemeriksaan_lansias: Kader hanya bisa mengelola pemeriksaan Lansia milik Posyandunya
CREATE POLICY policy_pemeriksaan_lansias ON pemeriksaan_lansias
  FOR ALL
  TO authenticated
  USING (
    lansia_id IN (
      SELECT id FROM lansias WHERE posyandu_id IN (
        SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    lansia_id IN (
      SELECT id FROM lansias WHERE posyandu_id IN (
        SELECT posyandu_id FROM kader_posyandu WHERE user_id = auth.uid()
      )
    )
  );

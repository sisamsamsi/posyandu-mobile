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

-- 5. Tambah kolom alasan_tidak_imunisasi di tabel imunisasi untuk menandai yang tidak imunisasi sama sekali
ALTER TABLE imunisasi ADD COLUMN IF NOT EXISTS alasan_tidak_imunisasi TEXT;

-- 6. Tambah Kolom Integrasi SATUSEHAT / e-PPGBM (Non-Destruktif)
ALTER TABLE posyandus ADD COLUMN IF NOT EXISTS satusehat_org_id VARCHAR(100);
ALTER TABLE balitas ADD COLUMN IF NOT EXISTS satusehat_patient_id VARCHAR(100);
ALTER TABLE balitas ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE balitas ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE penimbangans ADD COLUMN IF NOT EXISTS satusehat_encounter_id VARCHAR(100);
ALTER TABLE penimbangans ADD COLUMN IF NOT EXISTS satusehat_observation_id VARCHAR(100);
ALTER TABLE penimbangans ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE penimbangans ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE penimbangans ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_balitas_satusehat_id ON balitas(satusehat_patient_id);
CREATE INDEX IF NOT EXISTS idx_penimbangans_is_synced ON penimbangans(is_synced);

-- 7. Buat Tabel 'riwayat_perubahan_logs' & Trigger Otomatis Audit Trail
CREATE TABLE IF NOT EXISTS riwayat_perubahan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabel_sumber VARCHAR(50) NOT NULL, -- 'balitas' atau 'penimbangans'
    entitas_tipe VARCHAR(50) NOT NULL, -- 'Identitas Balita' atau 'Pengukuran Balita'
    aksi VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    record_id UUID NOT NULL, -- ID record balita / penimbangan
    balita_id UUID, -- ID balita terkait
    nama_balita VARCHAR(255),
    nik_balita VARCHAR(30),
    posyandu_id UUID REFERENCES posyandus(id) ON DELETE SET NULL,
    nama_posyandu VARCHAR(255),
    user_id UUID,
    user_email VARCHAR(255),
    role_pelaku VARCHAR(50) DEFAULT 'kader', -- 'kader', 'puskesmas_admin', 'sistem'
    platform VARCHAR(30) DEFAULT 'mobile', -- 'mobile', 'web', 'import'
    data_lama JSONB, -- Snapshot data sebelum diubah (NULL jika INSERT)
    data_baru JSONB, -- Snapshot data sesudah diubah (NULL jika DELETE)
    perubahan JSONB, -- Array field yang berubah
    ringkasan_perubahan TEXT, -- Deskripsi ringkas perubahan dalam Bahasa Indonesia
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeks untuk Query Cepat & Pelacakan
CREATE INDEX IF NOT EXISTS idx_log_perubahan_created_at ON riwayat_perubahan_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_perubahan_posyandu ON riwayat_perubahan_logs(posyandu_id);
CREATE INDEX IF NOT EXISTS idx_log_perubahan_balita ON riwayat_perubahan_logs(balita_id);
CREATE INDEX IF NOT EXISTS idx_log_perubahan_tabel ON riwayat_perubahan_logs(tabel_sumber);
CREATE INDEX IF NOT EXISTS idx_log_perubahan_aksi ON riwayat_perubahan_logs(aksi);
CREATE INDEX IF NOT EXISTS idx_log_perubahan_nik ON riwayat_perubahan_logs(nik_balita);

-- Aktifkan RLS
ALTER TABLE riwayat_perubahan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User terautentikasi dapat membaca log riwayat"
ON riwayat_perubahan_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "User terautentikasi dapat membuat log riwayat"
ON riwayat_perubahan_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admin Puskesmas memiliki akses penuh ke riwayat perubahan"
ON riwayat_perubahan_logs FOR ALL
TO authenticated
USING (
    exists (
        select 1 from user_roles
        where user_roles.user_id = auth.uid() and user_roles.role = 'puskesmas_admin'
    )
);

-- Trigger: Perubahan Identitas Balita (balitas)
CREATE OR REPLACE FUNCTION fn_log_perubahan_balitas()
RETURNS TRIGGER AS $$
DECLARE
    v_posyandu_name VARCHAR(255) := '';
    v_user_email VARCHAR(255) := '';
    v_user_id UUID := auth.uid();
    v_role VARCHAR(50) := 'kader';
    v_perubahan JSONB := '[]'::JSONB;
    v_ringkasan TEXT := '';
    v_changes_count INT := 0;
    v_old_json JSONB;
    v_new_json JSONB;
    v_field TEXT;
    v_old_val TEXT;
    v_new_val TEXT;
    v_label TEXT;
BEGIN
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
        SELECT role INTO v_role FROM user_roles WHERE user_id = v_user_id;
        IF v_role IS NULL THEN v_role := 'kader'; END IF;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        IF NEW.posyandu_id IS NOT NULL THEN
            SELECT COALESCE(nama_posyandu_balita, nama_posyandu, 'Posyandu') 
            INTO v_posyandu_name FROM posyandus WHERE id = NEW.posyandu_id;
        END IF;

        v_new_json := to_jsonb(NEW);
        v_ringkasan := 'Mendaftarkan sasaran balita baru: ' || COALESCE(NEW.nama, 'Tanpa Nama') || ' (NIK: ' || COALESCE(NEW.nik, '-') || ')';

        INSERT INTO riwayat_perubahan_logs (
            tabel_sumber, entitas_tipe, aksi, record_id, balita_id,
            nama_balita, nik_balita, posyandu_id, nama_posyandu,
            user_id, user_email, role_pelaku, platform,
            data_lama, data_baru, perubahan, ringkasan_perubahan
        ) VALUES (
            'balitas', 'Identitas Balita', 'INSERT', NEW.id, NEW.id,
            NEW.nama, NEW.nik, NEW.posyandu_id, v_posyandu_name,
            v_user_id, v_user_email, v_role, 'mobile',
            NULL, v_new_json, '[]'::JSONB, v_ringkasan
        );
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW.posyandu_id IS NOT NULL THEN
            SELECT COALESCE(nama_posyandu_balita, nama_posyandu, 'Posyandu') 
            INTO v_posyandu_name FROM posyandus WHERE id = NEW.posyandu_id;
        END IF;

        v_old_json := to_jsonb(OLD);
        v_new_json := to_jsonb(NEW);

        FOR v_field, v_label IN VALUES 
            ('nama', 'Nama Balita'),
            ('nik', 'NIK Balita'),
            ('tanggal_lahir', 'Tanggal Lahir'),
            ('jenis_kelamin', 'Jenis Kelamin'),
            ('no_kk', 'Nomor KK'),
            ('nama_ortu', 'Nama Orang Tua'),
            ('nik_ortu', 'NIK Orang Tua'),
            ('no_hp_ortu', 'No HP Orang Tua'),
            ('alamat', 'Alamat Domisili'),
            ('rt', 'RT'),
            ('rw', 'RW'),
            ('anak_ke', 'Anak Ke'),
            ('bb_lahir', 'Berat Lahir (kg)'),
            ('tb_lahir', 'Tinggi Lahir (cm)'),
            ('lk_lahir', 'Lingkar Kepala Lahir (cm)'),
            ('usia_kehamilan_lahir', 'Usia Kehamilan Lahir'),
            ('buku_kia', 'Buku KIA'),
            ('buku_kia_bayi_kecil', 'Buku KIA Bayi Kecil'),
            ('imd', 'Inisiasi Menyusu Dini (IMD)'),
            ('posyandu_id', 'Unit Posyandu')
        LOOP
            v_old_val := COALESCE(v_old_json->>v_field, '');
            v_new_val := COALESCE(v_new_json->>v_field, '');

            IF (v_old_val IS DISTINCT FROM v_new_val) THEN
                v_perubahan := v_perubahan || jsonb_build_object(
                    'field', v_field,
                    'label', v_label,
                    'old', v_old_val,
                    'new', v_new_val
                );
                IF v_changes_count > 0 THEN
                    v_ringkasan := v_ringkasan || ', ';
                END IF;
                v_ringkasan := v_ringkasan || v_label || ' (' || COALESCE(NULLIF(v_old_val, ''), '-') || ' → ' || COALESCE(NULLIF(v_new_val, ''), '-') || ')';
                v_changes_count := v_changes_count + 1;
            END IF;
        END LOOP;

        IF v_changes_count > 0 THEN
            v_ringkasan := 'Mengubah identitas ' || COALESCE(NEW.nama, OLD.nama) || ': ' || v_ringkasan;
            INSERT INTO riwayat_perubahan_logs (
                tabel_sumber, entitas_tipe, aksi, record_id, balita_id,
                nama_balita, nik_balita, posyandu_id, nama_posyandu,
                user_id, user_email, role_pelaku, platform,
                data_lama, data_baru, perubahan, ringkasan_perubahan
            ) VALUES (
                'balitas', 'Identitas Balita', 'UPDATE', NEW.id, NEW.id,
                NEW.nama, NEW.nik, NEW.posyandu_id, v_posyandu_name,
                v_user_id, v_user_email, v_role, 'mobile',
                v_old_json, v_new_json, v_perubahan, v_ringkasan
            );
        END IF;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.posyandu_id IS NOT NULL THEN
            SELECT COALESCE(nama_posyandu_balita, nama_posyandu, 'Posyandu') 
            INTO v_posyandu_name FROM posyandus WHERE id = OLD.posyandu_id;
        END IF;

        v_old_json := to_jsonb(OLD);
        v_ringkasan := 'Menghapus sasaran balita: ' || COALESCE(OLD.nama, 'Tanpa Nama') || ' (NIK: ' || COALESCE(OLD.nik, '-') || ')';

        INSERT INTO riwayat_perubahan_logs (
            tabel_sumber, entitas_tipe, aksi, record_id, balita_id,
            nama_balita, nik_balita, posyandu_id, nama_posyandu,
            user_id, user_email, role_pelaku, platform,
            data_lama, data_baru, perubahan, ringkasan_perubahan
        ) VALUES (
            'balitas', 'Identitas Balita', 'DELETE', OLD.id, OLD.id,
            OLD.nama, OLD.nik, OLD.posyandu_id, v_posyandu_name,
            v_user_id, v_user_email, v_role, 'mobile',
            v_old_json, NULL, '[]'::JSONB, v_ringkasan
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_perubahan_balitas ON balitas;
CREATE TRIGGER trg_log_perubahan_balitas
AFTER INSERT OR UPDATE OR DELETE ON balitas
FOR EACH ROW EXECUTE FUNCTION fn_log_perubahan_balitas();

-- Trigger: Perubahan Pengukuran Balita (penimbangans)
CREATE OR REPLACE FUNCTION fn_log_perubahan_penimbangans()
RETURNS TRIGGER AS $$
DECLARE
    v_posyandu_id UUID;
    v_posyandu_name VARCHAR(255) := '';
    v_nama_balita VARCHAR(255) := '';
    v_nik_balita VARCHAR(30) := '';
    v_user_email VARCHAR(255) := '';
    v_user_id UUID := auth.uid();
    v_role VARCHAR(50) := 'kader';
    v_perubahan JSONB := '[]'::JSONB;
    v_ringkasan TEXT := '';
    v_changes_count INT := 0;
    v_old_json JSONB;
    v_new_json JSONB;
    v_field TEXT;
    v_old_val TEXT;
    v_new_val TEXT;
    v_label TEXT;
    v_target_balita_id UUID;
BEGIN
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
        SELECT role INTO v_role FROM user_roles WHERE user_id = v_user_id;
        IF v_role IS NULL THEN v_role := 'kader'; END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        v_target_balita_id := OLD.balita_id;
    ELSE
        v_target_balita_id := NEW.balita_id;
    END IF;

    IF v_target_balita_id IS NOT NULL THEN
        SELECT b.nama, b.nik, b.posyandu_id, COALESCE(p.nama_posyandu_balita, p.nama_posyandu, 'Posyandu')
        INTO v_nama_balita, v_nik_balita, v_posyandu_id, v_posyandu_name
        FROM balitas b
        LEFT JOIN posyandus p ON p.id = b.posyandu_id
        WHERE b.id = v_target_balita_id;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        v_new_json := to_jsonb(NEW);
        v_ringkasan := 'Mencatat penimbangan baru untuk ' || COALESCE(v_nama_balita, 'Balita') || 
                       ' pada tgl ' || TO_CHAR(NEW.tanggal, 'DD/MM/YYYY') || 
                       ' (BB: ' || COALESCE(NEW.berat_badan::TEXT, '-') || ' kg, TB: ' || COALESCE(NEW.tinggi_badan::TEXT, '-') || ' cm)';

        INSERT INTO riwayat_perubahan_logs (
            tabel_sumber, entitas_tipe, aksi, record_id, balita_id,
            nama_balita, nik_balita, posyandu_id, nama_posyandu,
            user_id, user_email, role_pelaku, platform,
            data_lama, data_baru, perubahan, ringkasan_perubahan
        ) VALUES (
            'penimbangans', 'Pengukuran Balita', 'INSERT', NEW.id, NEW.balita_id,
            v_nama_balita, v_nik_balita, v_posyandu_id, v_posyandu_name,
            v_user_id, v_user_email, v_role, 'mobile',
            NULL, v_new_json, '[]'::JSONB, v_ringkasan
        );
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_json := to_jsonb(OLD);
        v_new_json := to_jsonb(NEW);

        FOR v_field, v_label IN VALUES 
            ('tanggal', 'Tanggal Pengukuran'),
            ('berat_badan', 'Berat Badan (kg)'),
            ('tinggi_badan', 'Tinggi Badan (cm)'),
            ('lingkar_lengan', 'Lingkar Lengan (cm)'),
            ('lingkar_kepala', 'Lingkar Kepala (cm)'),
            ('status_bb_u', 'Status BB/U'),
            ('status_tb_u', 'Status TB/U'),
            ('status_bb_tb', 'Status BB/TB'),
            ('status_imt_u', 'Status IMT/U'),
            ('zscore_bb_u', 'Z-Score BB/U'),
            ('zscore_tb_u', 'Z-Score TB/U'),
            ('zscore_bb_tb', 'Z-Score BB/TB'),
            ('catatan', 'Catatan Kader')
        LOOP
            v_old_val := COALESCE(v_old_json->>v_field, '');
            v_new_val := COALESCE(v_new_json->>v_field, '');

            IF (v_old_val IS DISTINCT FROM v_new_val) THEN
                v_perubahan := v_perubahan || jsonb_build_object(
                    'field', v_field,
                    'label', v_label,
                    'old', v_old_val,
                    'new', v_new_val
                );
                IF v_changes_count > 0 THEN
                    v_ringkasan := v_ringkasan || ', ';
                END IF;
                v_ringkasan := v_ringkasan || v_label || ' (' || COALESCE(NULLIF(v_old_val, ''), '-') || ' → ' || COALESCE(NULLIF(v_new_val, ''), '-') || ')';
                v_changes_count := v_changes_count + 1;
            END IF;
        END LOOP;

        IF v_changes_count > 0 THEN
            v_ringkasan := 'Mengubah data pengukuran ' || COALESCE(v_nama_balita, 'Balita') || ' (Tgl ' || TO_CHAR(NEW.tanggal, 'DD/MM/YYYY') || '): ' || v_ringkasan;
            INSERT INTO riwayat_perubahan_logs (
                tabel_sumber, entitas_tipe, aksi, record_id, balita_id,
                nama_balita, nik_balita, posyandu_id, nama_posyandu,
                user_id, user_email, role_pelaku, platform,
                data_lama, data_baru, perubahan, ringkasan_perubahan
            ) VALUES (
                'penimbangans', 'Pengukuran Balita', 'UPDATE', NEW.id, NEW.balita_id,
                v_nama_balita, v_nik_balita, v_posyandu_id, v_posyandu_name,
                v_user_id, v_user_email, v_role, 'mobile',
                v_old_json, v_new_json, v_perubahan, v_ringkasan
            );
        END IF;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        v_old_json := to_jsonb(OLD);
        v_ringkasan := 'Menghapus data pengukuran ' || COALESCE(v_nama_balita, 'Balita') || 
                       ' pada tgl ' || TO_CHAR(OLD.tanggal, 'DD/MM/YYYY') || 
                       ' (BB: ' || COALESCE(OLD.berat_badan::TEXT, '-') || ' kg, TB: ' || COALESCE(OLD.tinggi_badan::TEXT, '-') || ' cm)';

        INSERT INTO riwayat_perubahan_logs (
            tabel_sumber, entitas_tipe, aksi, record_id, balita_id,
            nama_balita, nik_balita, posyandu_id, nama_posyandu,
            user_id, user_email, role_pelaku, platform,
            data_lama, data_baru, perubahan, ringkasan_perubahan
        ) VALUES (
            'penimbangans', 'Pengukuran Balita', 'DELETE', OLD.id, OLD.balita_id,
            v_nama_balita, v_nik_balita, v_posyandu_id, v_posyandu_name,
            v_user_id, v_user_email, v_role, 'mobile',
            v_old_json, NULL, '[]'::JSONB, v_ringkasan
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_perubahan_penimbangans ON penimbangans;
CREATE TRIGGER trg_log_perubahan_penimbangans
AFTER INSERT OR UPDATE OR DELETE ON penimbangans
FOR EACH ROW EXECUTE FUNCTION fn_log_perubahan_penimbangans();



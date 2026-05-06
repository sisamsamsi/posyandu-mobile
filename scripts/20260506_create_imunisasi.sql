-- Migration: Add Imunisasi Table
CREATE TABLE IF NOT EXISTS imunisasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balita_id UUID REFERENCES balitas(id) ON DELETE CASCADE UNIQUE NOT NULL,
  hb0_date DATE,
  bcg_date DATE,
  penta_1_date DATE,
  penta_2_date DATE,
  penta_3_date DATE,
  ipv_1_date DATE,
  ipv_2_date DATE,
  ipv_3_date DATE,
  pcv_1_date DATE,
  pcv_2_date DATE,
  pcv_3_date DATE, -- PCV (1 th)
  rv_1_date DATE,
  rv_2_date DATE,
  rv_3_date DATE,
  mr_date DATE,
  je_date DATE,
  booster_penta_date DATE,
  booster_mr_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE imunisasi ENABLE ROW LEVEL SECURITY;

-- Simple policy for now (matching existing tables if any, usually authenticated users)
CREATE POLICY "Enable all for authenticated users" ON imunisasi
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_imunisasi_updated_at') THEN
    CREATE TRIGGER update_imunisasi_updated_at
    BEFORE UPDATE ON imunisasi
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END $$;

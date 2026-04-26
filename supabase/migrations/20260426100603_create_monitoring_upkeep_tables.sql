/*
  # Monitoring Upkeep - Initial Schema

  ## Tables Created

  ### 1. master_kegiatan
  Stores master activity types (kegiatan/pekerjaan)
  - id: UUID primary key
  - name: Activity name (unique)
  - created_at: Timestamp

  ### 2. master_bahan
  Stores master materials/chemicals used in activities
  - id: UUID primary key
  - name: Material name (unique)
  - created_at: Timestamp

  ### 3. reports
  Main work reports (both Planning and Hasil/Actual)
  - id: UUID primary key
  - tgl: Date string (YYYY-MM-DD)
  - type: 'Planning' or 'Hasil'
  - kegiatan: Activity name
  - paddocks: JSONB array [{name, luas}]
  - bahans: JSONB array [{name, dosis, satuan, total}]
  - hk: Labor hours (HK)
  - unit: Equipment/unit description
  - jln: Ready equipment count
  - rsk: Breakdown equipment count
  - std: Standby equipment count
  - ket: Additional notes
  - created_at: Timestamp
  - updated_at: Timestamp

  ## Security
  - RLS enabled on all tables
  - Anonymous users have full read/write access (single-tenant field app)
    using anon role policies (no auth required for this ops tool)
*/

-- Master Kegiatan table
CREATE TABLE IF NOT EXISTS master_kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE master_kegiatan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read master_kegiatan"
  ON master_kegiatan FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert master_kegiatan"
  ON master_kegiatan FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update master_kegiatan"
  ON master_kegiatan FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete master_kegiatan"
  ON master_kegiatan FOR DELETE
  TO anon
  USING (true);

-- Master Bahan table
CREATE TABLE IF NOT EXISTS master_bahan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE master_bahan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read master_bahan"
  ON master_bahan FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert master_bahan"
  ON master_bahan FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update master_bahan"
  ON master_bahan FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete master_bahan"
  ON master_bahan FOR DELETE
  TO anon
  USING (true);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tgl text NOT NULL,
  type text NOT NULL CHECK (type IN ('Planning', 'Hasil')),
  kegiatan text NOT NULL,
  paddocks jsonb DEFAULT '[]'::jsonb,
  bahans jsonb DEFAULT '[]'::jsonb,
  hk integer DEFAULT 0,
  unit text DEFAULT '',
  jln integer DEFAULT 0,
  rsk integer DEFAULT 0,
  std integer DEFAULT 0,
  ket text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read reports"
  ON reports FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert reports"
  ON reports FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update reports"
  ON reports FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete reports"
  ON reports FOR DELETE
  TO anon
  USING (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_reports_tgl ON reports(tgl);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_tgl_type ON reports(tgl, type);


-- Create client_acquisition table
CREATE TABLE IF NOT EXISTS client_acquisition (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  client_name TEXT NOT NULL,
  country TEXT,
  inquiry_source TEXT,
  assigned_bde UUID REFERENCES profiles(id),
  acquisition_date DATE DEFAULT CURRENT_DATE,
  product_interested TEXT,
  deal_value NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'Lead Generated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_acquisition ENABLE ROW LEVEL SECURITY;

-- Add policies
DROP POLICY IF EXISTS "Allow authenticated read" ON client_acquisition;
CREATE POLICY "Allow authenticated read" ON client_acquisition FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON client_acquisition;
CREATE POLICY "Allow authenticated insert" ON client_acquisition FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update" ON client_acquisition;
CREATE POLICY "Allow authenticated update" ON client_acquisition FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete" ON client_acquisition;
CREATE POLICY "Allow authenticated delete" ON client_acquisition FOR DELETE TO authenticated USING (false);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE client_acquisition;

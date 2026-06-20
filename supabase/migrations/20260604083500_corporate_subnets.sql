-- Create corporate_subnets table
CREATE TABLE corporate_subnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ip_cidr TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE corporate_subnets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view subnets of their company" ON corporate_subnets
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage subnets of their company" ON corporate_subnets
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

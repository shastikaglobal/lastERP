import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROJECT_REF = 'sxebygxpjzntogzpjnga';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// The SQL to apply
const sql = `
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_number text NOT NULL,
  vehicle_type text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  license_number text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipment_dispatches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES public.vehicles(id),
  driver_id uuid REFERENCES public.drivers(id),
  schedule_start timestamp with time zone,
  schedule_end timestamp with time zone,
  status text DEFAULT 'pending',
  gate_pass_token text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_dispatches ENABLE ROW LEVEL SECURITY;

-- Grant access policies
CREATE POLICY IF NOT EXISTS "Allow authenticated read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow authenticated read drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow authenticated read dispatches" ON public.shipment_dispatches FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow authenticated insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow authenticated insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow authenticated insert dispatches" ON public.shipment_dispatches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow authenticated update dispatches" ON public.shipment_dispatches FOR UPDATE TO authenticated USING (true);

-- Seed vehicles
INSERT INTO public.vehicles (vehicle_number, vehicle_type) VALUES
('TN 01 AB 1234', 'Lorry'),
('TN 02 CD 5678', 'Mini Truck'),
('TN 03 EF 9012', 'Container'),
('TN 04 GH 3456', 'Tempo')
ON CONFLICT DO NOTHING;

-- Seed drivers
INSERT INTO public.drivers (name, license_number) VALUES
('Ravi Kumar', 'TN1234567'),
('Murugan S', 'TN2345678'),
('Selvam K', 'TN3456789'),
('Prakash R', 'TN4567890')
ON CONFLICT DO NOTHING;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
`;

async function applyViaManagementAPI() {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  console.log('Trying Supabase Management API...');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
  return res.ok;
}

async function applyViaRPC() {
  console.log('\nTrying RPC execute_sql...');
  const res = await fetch(`https://sxebygxpjzntogzpjnga.supabase.co/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
  return res.ok;
}

(async () => {
  const ok1 = await applyViaManagementAPI();
  if (!ok1) {
    await applyViaRPC();
  }
})();

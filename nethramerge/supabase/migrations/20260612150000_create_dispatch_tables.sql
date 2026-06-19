CREATE TABLE IF NOT EXISTS vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_number text NOT NULL,
  vehicle_type text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  license_number text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_dispatches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES public.vehicles(id),
  driver_id uuid REFERENCES public.drivers(id),
  schedule_start timestamp with time zone,
  schedule_end timestamp with time zone,
  status text DEFAULT 'pending',
  gate_pass_token text,
  created_at timestamp with time zone DEFAULT now()
);

INSERT INTO vehicles (vehicle_number, vehicle_type) VALUES
('TN 01 AB 1234', 'Lorry'),
('TN 02 CD 5678', 'Mini Truck'),
('TN 03 EF 9012', 'Container'),
('TN 04 GH 3456', 'Tempo')
ON CONFLICT DO NOTHING;

INSERT INTO drivers (name, license_number) VALUES
('Ravi Kumar', 'TN1234567'),
('Murugan S', 'TN2345678'),
('Selvam K', 'TN3456789'),
('Prakash R', 'TN4567890')
ON CONFLICT DO NOTHING;

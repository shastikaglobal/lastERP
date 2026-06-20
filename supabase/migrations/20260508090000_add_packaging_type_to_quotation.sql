-- Add packaging_type to quotations and create a standard packaging_types table
CREATE TABLE IF NOT EXISTS public.packaging_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

ALTER TABLE public.packaging_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on packaging_types" ON public.packaging_types;
CREATE POLICY "Allow all operations on packaging_types" ON public.packaging_types FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.packaging_types (name, description) VALUES 
('Box', 'Standard box'), 
('Carton Box', 'Corrugated carton box'), 
('Plastic Bag', 'Standard plastic bag'),
('Pallet', 'Wooden or plastic pallet')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS packaging_type TEXT;

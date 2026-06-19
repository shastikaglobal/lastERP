CREATE TABLE IF NOT EXISTS public.shipping_carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT
);

CREATE TABLE IF NOT EXISTS public.shipping_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.container_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on shipping_carriers" ON public.shipping_carriers;
CREATE POLICY "Allow all operations on shipping_carriers" ON public.shipping_carriers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on shipping_ports" ON public.shipping_ports;
CREATE POLICY "Allow all operations on shipping_ports" ON public.shipping_ports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on container_types" ON public.container_types;
CREATE POLICY "Allow all operations on container_types" ON public.container_types FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.shipping_carriers (name, code) VALUES 
('Maersk', 'MSK'), ('MSC', 'MSC'), ('CMA CGM', 'CMA'), ('Hapag-Lloyd', 'HLC'), ('Evergreen', 'EVG'), ('ONE', 'ONE')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.shipping_ports (name, country, code) VALUES 
('Mumbai', 'India', 'INMUN'), 
('Mundra', 'India', 'INMUN2'), 
('Hamburg', 'Germany', 'DEHAM'), 
('Rotterdam', 'Netherlands', 'NLRTM'),
('Jebel Ali', 'UAE', 'AEJEA'),
('Singapore', 'Singapore', 'SGSIN'),
('Antwerp', 'Belgium', 'BEANR')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.container_types (name, description) VALUES 
('20ft Standard', 'Standard 20 foot dry container'), 
('40ft Standard', 'Standard 40 foot dry container'), 
('40ft High Cube', 'High cube 40 foot dry container'),
('20ft Reefer', 'Refrigerated 20 foot container'),
('40ft Reefer', 'Refrigerated 40 foot container')
ON CONFLICT (name) DO NOTHING;

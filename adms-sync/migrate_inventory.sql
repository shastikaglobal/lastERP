-- SQL Script to create missing inventory and warehouse tables in VPS PostgreSQL

-- 1. reserved_stock
CREATE TABLE IF NOT EXISTS public.reserved_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT,
    grade TEXT,
    quantity NUMERIC,
    warehouse_name TEXT,
    reservation_date DATE,
    reserved_by TEXT,
    reason TEXT,
    company_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. damaged_stock
CREATE TABLE IF NOT EXISTS public.damaged_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT,
    grade TEXT,
    quantity NUMERIC,
    warehouse_name TEXT,
    reported_date DATE,
    reported_by TEXT,
    damage_reason TEXT,
    status TEXT DEFAULT 'pending_review',
    company_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. warehouse_stock
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES public.warehouses(id),
    product_name TEXT,
    grade TEXT,
    quantity NUMERIC,
    company_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. export_ready_inventory
CREATE TABLE IF NOT EXISTS public.export_ready_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT,
    grade TEXT,
    quantity NUMERIC,
    warehouse_name TEXT,
    packed_date DATE,
    container_number TEXT,
    ready_by TEXT,
    status TEXT DEFAULT 'ready',
    company_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. expiry_monitoring
CREATE TABLE IF NOT EXISTS public.expiry_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT,
    grade TEXT,
    quantity NUMERIC,
    warehouse_name TEXT,
    expiry_date DATE,
    batch_number TEXT,
    status TEXT DEFAULT 'active',
    company_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    unit TEXT DEFAULT 'kg',
    manufacture_date DATE,
    warehouse TEXT,
    notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

-- 6. receiving_goods (in case it is needed later)
CREATE TABLE IF NOT EXISTS public.receiving_goods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT,
    supplier_name TEXT,
    received_date DATE,
    received_by TEXT,
    status TEXT DEFAULT 'received',
    company_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. warehouse_locations
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES public.warehouses(id),
    location_code TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    company_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

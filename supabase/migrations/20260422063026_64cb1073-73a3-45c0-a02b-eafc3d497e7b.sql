
-- ============================================================
-- SHARED HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  country TEXT,
  base_currency TEXT DEFAULT 'USD',
  plan TEXT DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_company ON public.profiles(company_id);

-- Helper: get current user's company (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- DYNAMIC RBAC
-- ============================================================
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,           -- e.g. 'farmers.view'
  module TEXT NOT NULL,                -- e.g. 'farmers'
  action TEXT NOT NULL,                -- e.g. 'view'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_roles_company ON public.roles(company_id);

CREATE TABLE public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Permission check helper (no recursion: bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _code TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.code = _code
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.slug = 'admin'
  );
$$;

-- ============================================================
-- CORE DOMAIN: AGRICULTURE EXPORT
-- ============================================================
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  capacity_kg NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_warehouses_company ON public.warehouses(company_id);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,             -- spices, grains, fruits, vegetables
  hs_code TEXT,              -- export classification
  unit TEXT NOT NULL DEFAULT 'kg',
  default_grade TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_company ON public.products(company_id);

CREATE TABLE public.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  village TEXT,
  district TEXT,
  state TEXT,
  country TEXT,
  primary_crops TEXT[],
  bank_account TEXT,
  ifsc_code TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_farmers_company ON public.farmers(company_id);
CREATE INDEX idx_farmers_name ON public.farmers(company_id, full_name);

CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  name TEXT,
  area_acres NUMERIC,
  crops TEXT[],
  latitude NUMERIC,
  longitude NUMERIC,
  certifications TEXT[],   -- organic, GAP, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_farms_farmer ON public.farms(farmer_id);

CREATE TYPE public.po_status AS ENUM ('draft','approved','received','partial','cancelled');

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES public.warehouses(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  status public.po_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, po_number)
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_po_company ON public.purchase_orders(company_id);
CREATE INDEX idx_po_farmer ON public.purchase_orders(farmer_id);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL,
  expected_grade TEXT,
  line_total NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_poi_po ON public.purchase_order_items(po_id);

CREATE TYPE public.batch_status AS ENUM ('pending_qc','approved','rejected','reserved','shipped','consumed');

CREATE TABLE public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES public.warehouses(id),
  farmer_id UUID REFERENCES public.farmers(id),
  po_id UUID REFERENCES public.purchase_orders(id),
  quantity_kg NUMERIC(14,3) NOT NULL,
  quantity_remaining_kg NUMERIC(14,3) NOT NULL,
  grade TEXT,
  moisture_pct NUMERIC(5,2),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status public.batch_status NOT NULL DEFAULT 'pending_qc',
  cost_per_kg NUMERIC(14,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, lot_number)
);
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_batch_company ON public.inventory_batches(company_id);
CREATE INDEX idx_batch_product ON public.inventory_batches(product_id);
CREATE INDEX idx_batch_status ON public.inventory_batches(company_id, status);
CREATE INDEX idx_batch_fifo ON public.inventory_batches(product_id, received_date);

CREATE TYPE public.qc_result AS ENUM ('pending','approved','rejected','rework');

CREATE TABLE public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moisture_pct NUMERIC(5,2),
  foreign_matter_pct NUMERIC(5,2),
  broken_pct NUMERIC(5,2),
  grade TEXT,                 -- A / B / C
  result public.qc_result NOT NULL DEFAULT 'pending',
  lab_notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_qc_batch ON public.qc_inspections(batch_id);
CREATE INDEX idx_qc_company ON public.qc_inspections(company_id);

-- ============================================================
-- TIMESTAMP TRIGGERS
-- ============================================================
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_farmers_updated BEFORE UPDATE ON public.farmers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_farms_updated BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_batch_updated BEFORE UPDATE ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qc_updated BEFORE UPDATE ON public.qc_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AUTO-PROVISION ON SIGNUP: create company + admin role + assign
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_company_id UUID;
  admin_role_id UUID;
  perm RECORD;
BEGIN
  -- Create a company for the new user (named after them)
  INSERT INTO public.companies (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email || '''s Company'),
    'co-' || substr(replace(NEW.id::text, '-', ''), 1, 12)
  )
  RETURNING id INTO new_company_id;

  -- Create profile
  INSERT INTO public.profiles (id, company_id, email, full_name)
  VALUES (
    NEW.id, new_company_id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  -- Seed default roles for this company
  INSERT INTO public.roles (company_id, name, slug, description, is_system) VALUES
    (new_company_id, 'Admin',          'admin',          'Full system access', TRUE),
    (new_company_id, 'Manager',        'manager',        'Operations manager', TRUE),
    (new_company_id, 'Team Leader',    'team_leader',    'Manage team orders', TRUE),
    (new_company_id, 'Warehouse Staff','warehouse_staff','Inventory & QC entry', TRUE),
    (new_company_id, 'Accountant',     'accountant',     'Finance & invoices', TRUE),
    (new_company_id, 'HR',             'hr',             'Employee management', TRUE)
  RETURNING id INTO admin_role_id; -- captures last (HR), so re-select admin:

  SELECT id INTO admin_role_id FROM public.roles
   WHERE company_id = new_company_id AND slug = 'admin';

  -- Grant ALL existing permissions to Admin role
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT admin_role_id, id FROM public.permissions;

  -- Assign Admin role to the new user
  INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, admin_role_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED PERMISSIONS CATALOG
-- ============================================================
INSERT INTO public.permissions (code, module, action, description) VALUES
  ('farmers.view','farmers','view','View farmers'),
  ('farmers.create','farmers','create','Create farmers'),
  ('farmers.edit','farmers','edit','Edit farmers'),
  ('farmers.delete','farmers','delete','Delete farmers'),
  ('procurement.view','procurement','view','View purchase orders'),
  ('procurement.create','procurement','create','Create purchase orders'),
  ('procurement.approve','procurement','approve','Approve purchase orders'),
  ('inventory.view','inventory','view','View inventory'),
  ('inventory.manage','inventory','manage','Manage inventory batches'),
  ('qc.view','qc','view','View QC inspections'),
  ('qc.inspect','qc','inspect','Perform QC inspection'),
  ('qc.approve','qc','approve','Approve/reject QC results'),
  ('orders.view','orders','view','View export orders'),
  ('orders.manage','orders','manage','Manage export orders'),
  ('shipments.view','shipments','view','View shipments'),
  ('shipments.manage','shipments','manage','Manage shipments'),
  ('finance.view','finance','view','View finance'),
  ('finance.manage','finance','manage','Manage finance'),
  ('hr.view','hr','view','View HR'),
  ('hr.manage','hr','manage','Manage HR'),
  ('settings.view','settings','view','View settings'),
  ('settings.manage','settings','manage','Manage settings & roles');

-- ============================================================
-- RLS POLICIES — multi-tenant via company_id
-- ============================================================

-- companies: user can see/update only their own company
CREATE POLICY "companies_select_own" ON public.companies FOR SELECT USING (id = public.current_company_id());
CREATE POLICY "companies_update_own" ON public.companies FOR UPDATE USING (id = public.current_company_id() AND public.is_company_admin(auth.uid()));

-- profiles: user sees profiles in their own company
CREATE POLICY "profiles_select_company" ON public.profiles FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- permissions: catalog readable to all authenticated users
CREATE POLICY "permissions_select_all" ON public.permissions FOR SELECT TO authenticated USING (TRUE);

-- roles: scoped per company
CREATE POLICY "roles_select" ON public.roles FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "roles_insert" ON public.roles FOR INSERT WITH CHECK (company_id = public.current_company_id() AND public.is_company_admin(auth.uid()));
CREATE POLICY "roles_update" ON public.roles FOR UPDATE USING (company_id = public.current_company_id() AND public.is_company_admin(auth.uid()));
CREATE POLICY "roles_delete" ON public.roles FOR DELETE USING (company_id = public.current_company_id() AND public.is_company_admin(auth.uid()) AND NOT is_system);

-- role_permissions: managed by admin within their company's roles
CREATE POLICY "rp_select" ON public.role_permissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.company_id = public.current_company_id())
);
CREATE POLICY "rp_modify" ON public.role_permissions FOR ALL USING (
  public.is_company_admin(auth.uid()) AND
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.company_id = public.current_company_id())
) WITH CHECK (
  public.is_company_admin(auth.uid()) AND
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.company_id = public.current_company_id())
);

-- user_roles
CREATE POLICY "ur_select" ON public.user_roles FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.company_id = public.current_company_id()
  )
);
CREATE POLICY "ur_modify" ON public.user_roles FOR ALL USING (
  public.is_company_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.company_id = public.current_company_id()
  )
) WITH CHECK (
  public.is_company_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.company_id = public.current_company_id()
  )
);

-- Generic per-company policies for domain tables
-- warehouses
CREATE POLICY "wh_select" ON public.warehouses FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "wh_modify" ON public.warehouses FOR ALL USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'inventory.manage')) WITH CHECK (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'inventory.manage'));

-- products
CREATE POLICY "products_select" ON public.products FOR SELECT USING (company_id = public.current_company_id());
CREATE POLICY "products_modify" ON public.products FOR ALL USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'inventory.manage')) WITH CHECK (company_id = public.current_company_id() AND public.has_permission(auth.uid(), 'inventory.manage'));

-- farmers
CREATE POLICY "farmers_select" ON public.farmers FOR SELECT USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'farmers.view'));
CREATE POLICY "farmers_insert" ON public.farmers FOR INSERT WITH CHECK (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'farmers.create'));
CREATE POLICY "farmers_update" ON public.farmers FOR UPDATE USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'farmers.edit'));
CREATE POLICY "farmers_delete" ON public.farmers FOR DELETE USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'farmers.delete'));

-- farms
CREATE POLICY "farms_select" ON public.farms FOR SELECT USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'farmers.view'));
CREATE POLICY "farms_modify" ON public.farms FOR ALL USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'farmers.edit')) WITH CHECK (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'farmers.edit'));

-- purchase_orders
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'procurement.view'));
CREATE POLICY "po_insert" ON public.purchase_orders FOR INSERT WITH CHECK (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'procurement.create'));
CREATE POLICY "po_update" ON public.purchase_orders FOR UPDATE USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'procurement.create'));
CREATE POLICY "po_delete" ON public.purchase_orders FOR DELETE USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'procurement.approve'));

-- purchase_order_items (scoped via parent PO)
CREATE POLICY "poi_select" ON public.purchase_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = po_id AND po.company_id = public.current_company_id() AND public.has_permission(auth.uid(),'procurement.view'))
);
CREATE POLICY "poi_modify" ON public.purchase_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = po_id AND po.company_id = public.current_company_id() AND public.has_permission(auth.uid(),'procurement.create'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = po_id AND po.company_id = public.current_company_id() AND public.has_permission(auth.uid(),'procurement.create'))
);

-- inventory_batches
CREATE POLICY "batch_select" ON public.inventory_batches FOR SELECT USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'inventory.view'));
CREATE POLICY "batch_modify" ON public.inventory_batches FOR ALL USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'inventory.manage')) WITH CHECK (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'inventory.manage'));

-- qc_inspections
CREATE POLICY "qc_select" ON public.qc_inspections FOR SELECT USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'qc.view'));
CREATE POLICY "qc_insert" ON public.qc_inspections FOR INSERT WITH CHECK (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'qc.inspect'));
CREATE POLICY "qc_update" ON public.qc_inspections FOR UPDATE USING (company_id = public.current_company_id() AND public.has_permission(auth.uid(),'qc.approve'));

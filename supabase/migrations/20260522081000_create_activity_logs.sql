-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  team TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Index team for faster filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_team ON public.activity_logs(team);

-- Create policy for select
DROP POLICY IF EXISTS "company_access_activity_logs" ON public.activity_logs;
CREATE POLICY "company_access_activity_logs" ON public.activity_logs
  FOR ALL USING (company_id = public.get_my_company());

-- Setup company_id auto-population trigger
DROP TRIGGER IF EXISTS tr_set_company_id ON public.activity_logs;
CREATE TRIGGER tr_set_company_id BEFORE INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

-- Reusable helper function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  _entity TEXT,
  _action TEXT,
  _company_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  _my_company UUID;
  _actor_id UUID;
  _actor_name TEXT;
  _actor_team TEXT;
BEGIN
  -- Determine company_id
  IF _company_id IS NULL THEN
    _my_company := public.get_my_company();
  ELSE
    _my_company := _company_id;
  END IF;

  IF _my_company IS NULL THEN
    RETURN;
  END IF;

  -- Determine actor
  _actor_id := auth.uid();
  IF _actor_id IS NOT NULL THEN
    SELECT COALESCE(full_name, email, 'Unknown User') INTO _actor_name
    FROM public.profiles WHERE id = _actor_id;

    SELECT department INTO _actor_team
    FROM public.profiles WHERE id = _actor_id;

    IF _actor_team IS NULL THEN
      SELECT CASE
        WHEN lower(regexp_replace(_actor_name, '\s+', '', 'g')) LIKE '%gayathri%' THEN 'BDE'
        WHEN lower(regexp_replace(_actor_name, '\s+', '', 'g')) LIKE '%kaviya%' THEN 'BDE'
        WHEN lower(regexp_replace(_actor_name, '\s+', '', 'g')) LIKE '%jayasri%' THEN 'Data Analyst'
        WHEN lower(regexp_replace(_actor_name, '\s+', '', 'g')) LIKE '%madhumitha%' THEN 'Accounts'
        WHEN lower(regexp_replace(_actor_name, '\s+', '', 'g')) LIKE '%karunya%' THEN 'IT'
        WHEN lower(regexp_replace(_actor_name, '\s+', '', 'g')) LIKE '%swathi%' THEN 'IT'
        WHEN lower(regexp_replace(_actor_name, '\s+', '', 'g')) LIKE '%nethra%' THEN 'IT'
        ELSE NULL
      END INTO _actor_team;
    END IF;
  ELSE
    _actor_name := 'System';
  END IF;

  INSERT INTO public.activity_logs (company_id, actor_id, actor_name, entity, action, team)
  VALUES (_my_company, _actor_id, _actor_name, _entity, _action, _actor_team);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Trigger for Quotations
CREATE OR REPLACE FUNCTION public.trg_log_quotation_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('QUOTATION', 'Created quotation ' || NEW.quotation_number, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity('QUOTATION', 'Updated quotation ' || NEW.quotation_number || ' status to ' || NEW.status, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_quotation ON public.quotations;
CREATE TRIGGER trg_log_quotation
  AFTER INSERT OR UPDATE OF status ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_quotation_changes();

-- 2. Trigger for Leads
CREATE OR REPLACE FUNCTION public.trg_log_lead_changes()
RETURNS TRIGGER AS $$
DECLARE
  _lead_name TEXT;
BEGIN
  _lead_name := COALESCE(NEW.company_name, NEW.contact_name, NEW.id::text);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('LEAD', 'Created lead ' || _lead_name, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    PERFORM public.log_activity('LEAD', 'Updated lead ' || _lead_name || ' stage to ' || NEW.stage, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_lead ON public.leads;
CREATE TRIGGER trg_log_lead
  AFTER INSERT OR UPDATE OF stage ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_lead_changes();

-- 3. Trigger for Invoices (export_orders)
CREATE OR REPLACE FUNCTION public.trg_log_export_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  _inv_num TEXT;
BEGIN
  _inv_num := COALESCE(NEW.order_number, NEW.id::text);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('INVOICE', 'Created invoice ' || _inv_num, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity('INVOICE', 'Updated invoice ' || _inv_num || ' status to ' || NEW.status, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_export_order ON public.export_orders;
CREATE TRIGGER trg_log_export_order
  AFTER INSERT OR UPDATE OF status ON public.export_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_export_order_changes();

-- 4. Trigger for Shipments (export_shipments)
CREATE OR REPLACE FUNCTION public.trg_log_export_shipment_changes()
RETURNS TRIGGER AS $$
DECLARE
  _ship_num TEXT;
BEGIN
  _ship_num := COALESCE(NEW.shipment_number, NEW.id::text);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('SHIPMENT', 'Created export shipment ' || _ship_num, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity('SHIPMENT', 'Marked shipment ' || _ship_num || ' as ' || NEW.status, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_export_shipment ON public.export_shipments;
CREATE TRIGGER trg_log_export_shipment
  AFTER INSERT OR UPDATE OF status ON public.export_shipments
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_export_shipment_changes();

-- 5. Trigger for Purchase Orders
CREATE OR REPLACE FUNCTION public.trg_log_po_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('PO', 'Created purchase order ' || NEW.po_number, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity('PO', 'Updated purchase order ' || NEW.po_number || ' status to ' || NEW.status, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_po ON public.purchase_orders;
CREATE TRIGGER trg_log_po
  AFTER INSERT OR UPDATE OF status ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_po_changes();

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
  END IF;
END $$;

-- Seed some initial records for demo/visual clarity (dynamically linked to the first company and real actor profiles)
DO $$
DECLARE
  v_company_id UUID;
  v_actor_1 TEXT;
  v_actor_2 TEXT;
  v_actor_3 TEXT;
  v_actor_4 TEXT;
BEGIN
  -- Get the first company ID
  SELECT id INTO v_company_id FROM public.companies LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    -- Try to fetch actual profile names from the company to use as actors
    SELECT COALESCE(full_name, email, 'Karunya J') INTO v_actor_1 
      FROM public.profiles WHERE company_id = v_company_id LIMIT 1 OFFSET 0;
    SELECT COALESCE(full_name, email, 'Gayathri') INTO v_actor_2 
      FROM public.profiles WHERE company_id = v_company_id LIMIT 1 OFFSET 1;
    SELECT COALESCE(full_name, email, 'Nethra Sree') INTO v_actor_3 
      FROM public.profiles WHERE company_id = v_company_id LIMIT 1 OFFSET 2;
    SELECT COALESCE(full_name, email, 'Kaviya') INTO v_actor_4 
      FROM public.profiles WHERE company_id = v_company_id LIMIT 1 OFFSET 3;

    -- Ensure we have valid fallbacks if fewer than 4 profiles exist
    v_actor_1 := COALESCE(v_actor_1, 'Karunya J');
    v_actor_2 := COALESCE(v_actor_2, 'Gayathri');
    v_actor_3 := COALESCE(v_actor_3, 'Nethra Sree');
    v_actor_4 := COALESCE(v_actor_4, 'Kaviya');

    -- Insert dynamic activity logs
    INSERT INTO public.activity_logs (company_id, actor_name, entity, action, team, created_at)
    VALUES 
      (v_company_id, v_actor_1, 'QUOTATION', 'Created quotation QT-2025-0142', 'IT', now() - interval '3 hours'),
      (v_company_id, v_actor_2, 'LEAD', 'Updated lead Osaka Electronics stage to Warm', 'BDE', now() - interval '2 hours'),
      (v_company_id, v_actor_3, 'INVOICE', 'Approved invoice PI-2025-0156', 'IT', now() - interval '1 hour'),
      (v_company_id, v_actor_4, 'SHIPMENT', 'Marked shipment SH-2025-0044 as Delivered', 'BDE', now() - interval '30 minutes'),
      (v_company_id, 'System', 'PO', 'Auto-generated PO-2025-0076 from low stock', NULL, now() - interval '10 minutes');
  END IF;
END $$;

-- 6. Trigger for CRM Activities
CREATE OR REPLACE FUNCTION public.trg_log_activity_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('CRM_ACTIVITY', 'Created CRM activity "' || NEW.title || '"', NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.completed IS DISTINCT FROM NEW.completed THEN
    IF NEW.completed THEN
      PERFORM public.log_activity('CRM_ACTIVITY', 'Completed CRM activity "' || NEW.title || '"', NEW.company_id);
    ELSE
      PERFORM public.log_activity('CRM_ACTIVITY', 'Reopened CRM activity "' || NEW.title || '"', NEW.company_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity('CRM_ACTIVITY', 'Deleted CRM activity "' || OLD.title || '"', OLD.company_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_activity ON public.activities;
CREATE TRIGGER trg_log_activity
  AFTER INSERT OR UPDATE OF completed OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_activity_changes();
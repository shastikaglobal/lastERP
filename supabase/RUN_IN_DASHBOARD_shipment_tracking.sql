-- ================================================================
-- RUN THIS IN SUPABASE DASHBOARD → SQL Editor
-- Adds shipment_events table for milestone tracking
-- ================================================================

CREATE TABLE IF NOT EXISTS public.shipment_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.export_shipments(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'created', 'status_change', 'port_departure', 'port_arrival',
    'customs_clearance', 'container_loaded', 'document_uploaded', 'note'
  )),
  title       TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipment_events_shipment_idx ON public.shipment_events(shipment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shipment_events_company_idx  ON public.shipment_events(company_id);

ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access their company shipment events" ON public.shipment_events;
CREATE POLICY "Users access their company shipment events"
  ON public.shipment_events FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Auto-log event when a new shipment is created
CREATE OR REPLACE FUNCTION public.fn_shipment_created_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.shipment_events(company_id, shipment_id, event_type, title, description, location, created_by)
  VALUES (
    NEW.company_id,
    NEW.id,
    'created',
    'Shipment created',
    'Shipment ' || NEW.shipment_number || ' was registered in the system.',
    NEW.origin_port,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shipment_created_event ON public.export_shipments;
CREATE TRIGGER trg_shipment_created_event
  AFTER INSERT ON public.export_shipments
  FOR EACH ROW EXECUTE FUNCTION public.fn_shipment_created_event();

NOTIFY pgrst, 'reload schema';

SELECT 'shipment_events table created successfully ✓' AS result;

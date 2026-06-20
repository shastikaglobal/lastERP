-- ============================================================
-- AUTOMATIC NOTIFICATIONS — All 4 Categories
-- Triggered by database events, real-time via Supabase
-- ============================================================

-- ── SHARED HELPER: Safe insert into app_notifications ────────
CREATE OR REPLACE FUNCTION public.insert_notification(
  _company_id UUID,
  _user_id    UUID,    -- NULL = company-wide; UUID = personal
  _title      TEXT,
  _body       TEXT,
  _type       TEXT     -- 'info' | 'success' | 'warning' | 'destructive'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _company_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.app_notifications (company_id, user_id, title, body, type, is_read)
  VALUES (_company_id, _user_id, _title, _body, _type, false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. USER APPROVAL NOTIFICATIONS
--    • New signup  → company-wide alert for admins
--    • Approved    → personal success message for that user
--    • Rejected    → personal destructive message for that user
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notif_on_profile_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _name TEXT;
BEGIN
  _name := COALESCE(NULLIF(TRIM(NEW.full_name), ''), NEW.email, 'A new user');

  -- New signup (INSERT) or status flipped to pending (UPDATE)
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
  OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending')
  THEN
    PERFORM public.insert_notification(
      NEW.company_id, NULL,
      'New user awaiting approval',
      _name || ' has signed up and is waiting for approval. Review in the Approvals page.',
      'info'
    );

  -- Account approved
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    PERFORM public.insert_notification(
      NEW.company_id, NEW.id,
      'Your account has been approved! 🎉',
      'Welcome to Shastika ERP, ' || COALESCE(NULLIF(TRIM(NEW.full_name), ''), 'there') || '! You now have full access.',
      'success'
    );

  -- Account rejected
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected' THEN
    PERFORM public.insert_notification(
      NEW.company_id, NEW.id,
      'Account request not approved',
      CASE
        WHEN NEW.rejection_reason IS NOT NULL
        THEN 'Your request was declined. Reason: ' || NEW.rejection_reason
        ELSE 'Your account request was not approved. Contact the administrator.'
      END,
      'destructive'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_profile ON public.profiles;
CREATE TRIGGER trg_notif_profile
  AFTER INSERT OR UPDATE OF status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notif_on_profile_change();

-- ═══════════════════════════════════════════════════════════════
-- 2. PURCHASE ORDER NOTIFICATIONS
--    Fires on every status change in purchase_orders
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notif_on_po_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only act when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'approved' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Purchase Order Approved ✅',
        NEW.po_number || ' approved — ' || NEW.currency || ' ' ||
          to_char(NEW.total, 'FM999,999,999.00'),
        'success'
      );
    WHEN 'received' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Purchase Order Fully Received',
        NEW.po_number || ' has been completely received into the warehouse.',
        'success'
      );
    WHEN 'partial' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Partial Delivery Received ⚠️',
        NEW.po_number || ' was partially received. Follow up with the farmer for the remaining quantity.',
        'warning'
      );
    WHEN 'cancelled' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Purchase Order Cancelled',
        NEW.po_number || ' has been cancelled.',
        'destructive'
      );
    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_po ON public.purchase_orders;
CREATE TRIGGER trg_notif_po
  AFTER UPDATE OF status ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.notif_on_po_change();

-- ═══════════════════════════════════════════════════════════════
-- 3. SHIPMENT NOTIFICATIONS (demo shipments table)
--    Fires on every status change in shipments
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notif_on_shipment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ref  TEXT;
  _dest TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  _ref  := COALESCE(NEW.tracking_number, 'Shipment');
  _dest := COALESCE(NEW.destination, 'destination');

  CASE NEW.status
    WHEN 'In Transit' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Shipment Now In Transit 🚢',
        _ref || ' to ' || _dest || ' has departed and is now in transit.',
        'info'
      );
    WHEN 'Delivered' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Shipment Delivered ✅',
        _ref || ' has been successfully delivered to ' || _dest || '.',
        'success'
      );
    WHEN 'Delayed' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Shipment Delay Alert ⚠️',
        _ref || ' heading to ' || _dest || ' is experiencing a delay.',
        'warning'
      );
    WHEN 'Cancelled' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Shipment Cancelled',
        _ref || ' to ' || _dest || ' has been cancelled.',
        'destructive'
      );
    ELSE
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Shipment Status Updated',
        _ref || ' status changed to ' || NEW.status || '.',
        'info'
      );
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_shipment ON public.shipments;
CREATE TRIGGER trg_notif_shipment
  AFTER UPDATE OF status ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.notif_on_shipment_change();

-- ═══════════════════════════════════════════════════════════════
-- 4. QC PASS / FAIL NOTIFICATIONS
--    Fires when qc_inspections.result changes
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notif_on_qc_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _lot   TEXT;
  _grade TEXT;
BEGIN
  IF OLD.result IS NOT DISTINCT FROM NEW.result THEN RETURN NEW; END IF;

  -- Look up the batch lot number for a human-readable message
  SELECT lot_number INTO _lot
  FROM public.inventory_batches WHERE id = NEW.batch_id;

  _lot   := COALESCE(_lot, 'Batch ' || substring(NEW.batch_id::text, 1, 8));
  _grade := COALESCE(NEW.grade, 'N/A');

  CASE NEW.result
    WHEN 'approved' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'QC Inspection Passed ✅',
        _lot || ' passed quality control — Grade ' || _grade ||
          CASE WHEN NEW.moisture_pct IS NOT NULL
               THEN ', moisture ' || NEW.moisture_pct || '%'
               ELSE ''
          END || '.',
        'success'
      );
    WHEN 'rejected' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'QC Inspection Failed ❌',
        _lot || ' failed quality control.' ||
          CASE WHEN NEW.foreign_matter_pct IS NOT NULL
               THEN ' Foreign matter: ' || NEW.foreign_matter_pct || '%.'
               ELSE ''
          END ||
          CASE WHEN NEW.lab_notes IS NOT NULL
               THEN ' Notes: ' || NEW.lab_notes
               ELSE ' Immediate review required.'
          END,
        'destructive'
      );
    WHEN 'rework' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'QC: Batch Sent for Rework ⚠️',
        _lot || ' has been flagged for rework. Please re-process before re-inspection.',
        'warning'
      );
    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_qc ON public.qc_inspections;
CREATE TRIGGER trg_notif_qc
  AFTER UPDATE OF result ON public.qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.notif_on_qc_change();

-- ═══════════════════════════════════════════════════════════════
-- 5. FINANCE: Sales Order status → payment / cancellation alerts
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notif_on_sales_order_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'Delivered' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Payment Collection Due 💰',
        'Order ' || NEW.order_number || ' (' ||
          to_char(NEW.amount, 'FM999,999,999.00') ||
          ') has been delivered. Initiate payment collection.',
        'info'
      );
    WHEN 'Shipped' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Order Shipped 🚢',
        'Order ' || NEW.order_number || ' has been shipped and is on its way.',
        'info'
      );
    WHEN 'Cancelled' THEN
      PERFORM public.insert_notification(
        NEW.company_id, NULL,
        'Sales Order Cancelled',
        'Order ' || NEW.order_number || ' (' ||
          to_char(NEW.amount, 'FM999,999,999.00') ||
          ') has been cancelled.',
        'destructive'
      );
    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_sales_order ON public.sales_orders;
CREATE TRIGGER trg_notif_sales_order
  AFTER UPDATE OF status ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.notif_on_sales_order_change();

-- ── Done ─────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE '✅ All notification triggers installed:';
  RAISE NOTICE '   • User approval (profiles)';
  RAISE NOTICE '   • Purchase orders (status changes)';
  RAISE NOTICE '   • Shipments (status changes)';
  RAISE NOTICE '   • QC inspections (result changes)';
  RAISE NOTICE '   • Sales orders / finance alerts';
END $$;

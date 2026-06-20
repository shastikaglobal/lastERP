-- ============================================================
-- ASSIGN PERMISSIONS TO ALL ROLES IN THE SHARED COMPANY
-- • Admin → ALL permissions (can see & do everything, including Approvals)
-- • Manager → most permissions, NO settings.manage, NO hr.manage (can't approve users)
-- • BDE, Software Dev, etc. → only their relevant permissions
-- • No hardcoded emails. Runs safely even if already run.
-- ============================================================

DO $$
DECLARE
  _company CONSTANT UUID := '00000000-0000-0000-0000-00000000ae01';

  _admin_id      UUID;
  _manager_id    UUID;
  _bde_id        UUID;
  _sw_dev_id     UUID;
  _net_sec_id    UUID;
  _data_id       UUID;
  _secretary_id  UUID;
BEGIN

  -- Resolve role IDs
  SELECT id INTO _admin_id     FROM public.roles WHERE company_id = _company AND slug = 'admin';
  SELECT id INTO _manager_id   FROM public.roles WHERE company_id = _company AND slug = 'manager';
  SELECT id INTO _bde_id       FROM public.roles WHERE company_id = _company AND slug = 'bde';
  SELECT id INTO _sw_dev_id    FROM public.roles WHERE company_id = _company AND slug = 'software_dev';
  SELECT id INTO _net_sec_id   FROM public.roles WHERE company_id = _company AND slug = 'net_security';
  SELECT id INTO _data_id      FROM public.roles WHERE company_id = _company AND slug = 'data_analyst';
  SELECT id INTO _secretary_id FROM public.roles WHERE company_id = _company AND slug = 'secretary';

  -- ── ADMIN: ALL permissions ──────────────────────────────────
  IF _admin_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT _admin_id, id FROM public.permissions
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── MANAGER: everything EXCEPT hr.manage (can't approve users) ──
  IF _manager_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT _manager_id, id FROM public.permissions
    WHERE code NOT IN ('hr.manage', 'settings.manage')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── BDE (Business Dev Executive) ───────────────────────────
  IF _bde_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT _bde_id, id FROM public.permissions
    WHERE code IN (
      'farmers.view', 'farmers.create', 'farmers.edit',
      'orders.view', 'orders.manage',
      'shipments.view',
      'finance.view',
      'hr.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── SOFTWARE DEV ────────────────────────────────────────────
  IF _sw_dev_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT _sw_dev_id, id FROM public.permissions
    WHERE code IN (
      'settings.view',
      'inventory.view',
      'orders.view',
      'shipments.view',
      'hr.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── NET & SECURITY ──────────────────────────────────────────
  IF _net_sec_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT _net_sec_id, id FROM public.permissions
    WHERE code IN (
      'settings.view',
      'hr.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── DATA ANALYST ────────────────────────────────────────────
  IF _data_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT _data_id, id FROM public.permissions
    WHERE code IN (
      'farmers.view',
      'procurement.view',
      'inventory.view',
      'qc.view',
      'orders.view',
      'shipments.view',
      'finance.view',
      'hr.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── SECRETARY ───────────────────────────────────────────────
  IF _secretary_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT _secretary_id, id FROM public.permissions
    WHERE code IN (
      'orders.view',
      'shipments.view',
      'finance.view',
      'hr.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Done: All role permissions assigned for shared company.';
END $$;




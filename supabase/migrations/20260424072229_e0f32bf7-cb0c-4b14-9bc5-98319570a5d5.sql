-- =========================================================
-- Approval , role-locking, shared default tenant
-- =========================================================

-- 1. Status enum
do $$ begin
  create type public.user_approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- 2. Extend profiles with approval fields
alter table public.profiles
  add column if not exists status public.user_approval_status not null default 'pending',
  add column if not exists requested_role text,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text;

-- 3. Approval audit log
create table if not exists public.approval_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  target_user_id uuid not null,
  actor_user_id uuid,
  action text not null check (action in ('approved', 'rejected', 'role_changed', 'reset_to_pending')),
  previous_status public.user_approval_status,
  new_status public.user_approval_status,
  role_slug text,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.approval_audit_log enable row level security;

drop policy if exists audit_select on public.approval_audit_log;
create policy audit_select on public.approval_audit_log
  for select using (company_id = current_company_id());

drop policy if exists audit_insert on public.approval_audit_log;
create policy audit_insert on public.approval_audit_log
  for insert with check (company_id = current_company_id());

-- 4. Helper: is user approved?
create or replace function public.is_user_approved(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' from public.profiles where id = _user_id), false);
$$;

-- 5. Helper: is admin or manager?
create or replace function public.is_admin_or_manager(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = _user_id and r.slug in ('admin','manager')
  );
$$;

-- 6. Allow admins/managers in same company to view & update profiles for approvals
drop policy if exists profiles_admin_view on public.profiles;
create policy profiles_admin_view on public.profiles
  for select using (
    company_id = current_company_id() and public.is_admin_or_manager(auth.uid())
  );

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (
    company_id = current_company_id() and public.is_admin_or_manager(auth.uid())
  );

-- 7. Pre-seed the shared default company for the two preset leadership emails
insert into public.companies (id, name, slug, plan)
values ('00000000-0000-0000-0000-00000000ae01', 'AgriExportOS HQ', 'agriexportos-hq', 'enterprise')
on conflict (id) do nothing;

-- Seed default roles for the shared company (idempotent)
insert into public.roles (company_id, name, slug, description, is_system)
values
  ('00000000-0000-0000-0000-00000000ae01', 'Admin', 'admin', 'Full system access', true),
  ('00000000-0000-0000-0000-00000000ae01', 'Manager', 'manager', 'Operations manager', true),
  ('00000000-0000-0000-0000-00000000ae01', 'BD', 'bd', 'Business Development', true),
  ('00000000-0000-0000-0000-00000000ae01', 'Accounts', 'accounts', 'Finance & accounting', true),
  ('00000000-0000-0000-0000-00000000ae01', 'Operations', 'operations', 'Warehouse & shipment', true),
  ('00000000-0000-0000-0000-00000000ae01', 'QC', 'qc', 'Quality control', true),
  ('00000000-0000-0000-0000-00000000ae01', 'Procurement', 'procurement', 'Procurement & suppliers', true),
  ('00000000-0000-0000-0000-00000000ae01', 'Data Analyst', 'data_analyst', 'Analytics & reports', true),
  ('00000000-0000-0000-0000-00000000ae01', 'Marketing', 'marketing', 'Digital marketing', true),
  ('00000000-0000-0000-0000-00000000ae01', 'HR', 'hr', 'Human resources', true)
on conflict do nothing;

-- Grant Admin role all permissions in shared company
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.company_id = '00000000-0000-0000-0000-00000000ae01' and r.slug = 'admin'
on conflict do nothing;

-- 8. Replace handle_new_user: handles preset emails, Google signups, requested_role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _company_id uuid;
  _role_slug text;
  _role_id uuid;
  _is_preset boolean := false;
  _status public.user_approval_status := 'pending';
  _requested_role text;
  _full_name text;
  _shared_company constant uuid := '00000000-0000-0000-0000-00000000ae01';
begin
  _full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    new.email
  );
  _requested_role := nullif(trim(new.raw_user_meta_data->>'requested_role'), '');

  -- Preset leadership accounts
  if lower(new.email) = 'kim.swathi.07@gmail.com' then
    _is_preset := true;
    _company_id := _shared_company;
    _role_slug := 'admin';
    _status := 'approved';
  elsif lower(new.email) = 'swathitae35@gmail.com' then
    _is_preset := true;
    _company_id := _shared_company;
    _role_slug := 'manager';
    _status := 'approved';
  else
    -- Regular signup: join shared company as pending (single-tenant SaaS for now)
    _company_id := _shared_company;
    _status := 'pending';
  end if;

  -- Upsert profile
  insert into public.profiles (id, company_id, email, full_name, status, requested_role, approved_at, approved_by)
  values (
    new.id, _company_id, new.email, _full_name, _status, _requested_role,
    case when _status = 'approved' then now() else null end,
    case when _status = 'approved' then new.id else null end
  )
  on conflict (id) do update set
    company_id = excluded.company_id,
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  -- For preset accounts: assign the locked role immediately
  if _is_preset then
    select id into _role_id from public.roles
      where company_id = _company_id and slug = _role_slug limit 1;
    if _role_id is not null then
      insert into public.user_roles (user_id, role_id)
      values (new.id, _role_id)
      on conflict do nothing;

      insert into public.approval_audit_log
        (company_id, target_user_id, actor_user_id, action, previous_status, new_status, role_slug, reason)
      values
        (_company_id, new.id, new.id, 'approved', 'pending', 'approved', _role_slug, 'Auto-approved preset account');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. Backfill any existing profiles into the shared company / approved if preset
update public.profiles p
set
  company_id = '00000000-0000-0000-0000-00000000ae01',
  status = 'approved',
  approved_at = coalesce(p.approved_at, now()),
  approved_by = coalesce(p.approved_by, p.id)
where lower(p.email) in ('kim.swathi.07@gmail.com', 'swathitae35@gmail.com');

-- Ensure preset users have their roles in the shared company
insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r
  on r.company_id = '00000000-0000-0000-0000-00000000ae01'
 and r.slug = case when lower(p.email) = 'kim.swathi.07@gmail.com' then 'admin' else 'manager' end
where lower(p.email) in ('kim.swathi.07@gmail.com', 'swathitae35@gmail.com')
on conflict do nothing;

-- 10. Approval helper RPCs (security definer; enforce admin/manager check)
create or replace function public.approve_user(_target uuid, _role_slug text)
returns void language plpgsql security definer set search_path = public as $$
declare
  _company uuid;
  _role_id uuid;
  _prev public.user_approval_status;
begin
  if not public.is_admin_or_manager(auth.uid()) then
    raise exception 'Only admins or managers can approve users';
  end if;

  select company_id, status into _company, _prev
  from public.profiles where id = _target;

  if _company is null or _company <> public.current_company_id() then
    raise exception 'Target user not in your company';
  end if;

  select id into _role_id from public.roles
    where company_id = _company and slug = _role_slug limit 1;
  if _role_id is null then
    raise exception 'Role % not found in company', _role_slug;
  end if;

  update public.profiles
    set status = 'approved', approved_at = now(), approved_by = auth.uid(),
        rejection_reason = null, updated_at = now()
    where id = _target;

  -- Replace existing role assignments with the approved role
  delete from public.user_roles where user_id = _target;
  insert into public.user_roles (user_id, role_id) values (_target, _role_id);

  insert into public.approval_audit_log
    (company_id, target_user_id, actor_user_id, action, previous_status, new_status, role_slug)
  values (_company, _target, auth.uid(), 'approved', _prev, 'approved', _role_slug);
end;
$$;

create or replace function public.reject_user(_target uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  _company uuid;
  _prev public.user_approval_status;
begin
  if not public.is_admin_or_manager(auth.uid()) then
    raise exception 'Only admins or managers can reject users';
  end if;

  select company_id, status into _company, _prev
  from public.profiles where id = _target;

  if _company is null or _company <> public.current_company_id() then
    raise exception 'Target user not in your company';
  end if;

  update public.profiles
    set status = 'rejected', rejection_reason = _reason, updated_at = now()
    where id = _target;

  delete from public.user_roles where user_id = _target;

  insert into public.approval_audit_log
    (company_id, target_user_id, actor_user_id, action, previous_status, new_status, reason)
  values (_company, _target, auth.uid(), 'rejected', _prev, 'rejected', _reason);
end;
$$;
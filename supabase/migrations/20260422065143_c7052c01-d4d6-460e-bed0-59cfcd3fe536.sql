-- Ensure email/password auth bootstrap tables are exposed through compatibility views
create or replace view public.tenants
with (security_invoker=on) as
select
  id,
  name,
  slug,
  country,
  base_currency,
  plan,
  created_at,
  updated_at
from public.companies;

create or replace view public.users
with (security_invoker=on) as
select
  id,
  company_id as tenant_id,
  full_name,
  email,
  avatar_url,
  phone,
  is_active,
  created_at,
  updated_at
from public.profiles;

-- Make signup bootstrap deterministic and safe
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  admin_role_id uuid;
begin
  insert into public.companies (name, slug)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data->>'company_name'), ''), new.email || '''s Company'),
    'co-' || substr(replace(new.id::text, '-', ''), 1, 12)
  )
  returning id into new_company_id;

  insert into public.profiles (id, company_id, email, full_name)
  values (
    new.id,
    new_company_id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), new.email)
  )
  on conflict (id) do update
  set
    company_id = excluded.company_id,
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

  insert into public.roles (company_id, name, slug, description, is_system)
  values
    (new_company_id, 'Admin', 'admin', 'Full system access', true),
    (new_company_id, 'Manager', 'manager', 'Operations manager', true),
    (new_company_id, 'Team Leader', 'team_leader', 'Manage team orders', true),
    (new_company_id, 'Warehouse Staff', 'warehouse_staff', 'Inventory and QC entry', true),
    (new_company_id, 'Accountant', 'accountant', 'Finance and invoices', true),
    (new_company_id, 'HR', 'hr', 'Employee management', true)
  on conflict do nothing;

  select r.id
  into admin_role_id
  from public.roles r
  where r.company_id = new_company_id
    and r.slug = 'admin'
  order by r.created_at asc, r.id asc
  limit 1;

  if admin_role_id is null then
    raise exception 'Admin role could not be created for company %', new_company_id;
  end if;

  insert into public.role_permissions (role_id, permission_id)
  select admin_role_id, p.id
  from public.permissions p
  where not exists (
    select 1
    from public.role_permissions rp
    where rp.role_id = admin_role_id
      and rp.permission_id = p.id
  );

  insert into public.user_roles (user_id, role_id)
  values (new.id, admin_role_id)
  on conflict do nothing;

  return new;
end;
$$;

-- Recreate auth signup trigger safely
 drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Secure the compatibility views by mirroring existing company isolation rules
alter view public.tenants set (security_invoker = on);
alter view public.users set (security_invoker = on);
-- ENUM for last-known location of a scanned unit
do $$ begin
  create type public.barcode_location as enum (
    'storage', 'picking', 'packing', 'dispatch', 'in_transit', 'delivered'
  );
exception when duplicate_object then null; end $$;

-- BARCODES TABLE
create table if not exists public.batch_barcodes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  batch_id uuid not null references public.inventory_batches(id) on delete cascade,
  code text not null,
  level text not null default 'batch' check (level in ('batch','box')),
  box_number int,
  current_location public.barcode_location not null default 'storage',
  status text not null default 'active' check (status in ('active','consumed','void')),
  scan_count int not null default 0,
  last_scanned_at timestamptz,
  last_scanned_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code),
  unique (batch_id, level, box_number)
);

create index if not exists idx_barcodes_company on public.batch_barcodes(company_id);
create index if not exists idx_barcodes_batch on public.batch_barcodes(batch_id);

-- updated_at trigger
drop trigger if exists trg_barcodes_updated_at on public.batch_barcodes;
create trigger trg_barcodes_updated_at
  before update on public.batch_barcodes
  for each row execute function public.update_updated_at_column();

-- Enforce: only batches with an APPROVED QC result can have barcodes
create or replace function public.enforce_qc_approved_for_barcode()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _batch_status public.batch_status;
  _has_approved_qc boolean;
begin
  select status into _batch_status from public.inventory_batches where id = new.batch_id;
  if _batch_status is null then
    raise exception 'Batch not found';
  end if;

  -- A batch is barcodable if the batch itself is approved OR a QC inspection
  -- with result = approved exists for it.
  select (
    _batch_status = 'approved'
    or exists (
      select 1 from public.qc_inspections
      where batch_id = new.batch_id and result = 'approved'
    )
  ) into _has_approved_qc;

  if not _has_approved_qc then
    raise exception 'Cannot generate barcode: batch is not QC-approved';
  end if;

  return new;
end $$;

drop trigger if exists trg_barcode_qc_check on public.batch_barcodes;
create trigger trg_barcode_qc_check
  before insert on public.batch_barcodes
  for each row execute function public.enforce_qc_approved_for_barcode();

-- RLS
alter table public.batch_barcodes enable row level security;

drop policy if exists barcodes_select on public.batch_barcodes;
create policy barcodes_select on public.batch_barcodes
  for select using (company_id = public.current_company_id());

drop policy if exists barcodes_insert on public.batch_barcodes;
create policy barcodes_insert on public.batch_barcodes
  for insert with check (
    company_id = public.current_company_id()
    and public.has_permission(auth.uid(), 'inventory.manage')
  );

drop policy if exists barcodes_update on public.batch_barcodes;
create policy barcodes_update on public.batch_barcodes
  for update using (
    company_id = public.current_company_id()
    and public.has_permission(auth.uid(), 'inventory.manage')
  );

drop policy if exists barcodes_delete on public.batch_barcodes;
create policy barcodes_delete on public.batch_barcodes
  for delete using (
    company_id = public.current_company_id()
    and public.is_company_admin(auth.uid())
  );

-- RPC: scan a barcode (records scan + returns details)
create or replace function public.scan_barcode(_code text, _new_location public.barcode_location default null)
returns table (
  barcode_id uuid,
  code text,
  level text,
  box_number int,
  current_location public.barcode_location,
  status text,
  scan_count int,
  batch_id uuid,
  lot_number text,
  product_name text,
  grade text,
  warehouse_name text,
  farmer_name text,
  received_date date
)
language plpgsql security definer set search_path = public as $$
declare
  _row public.batch_barcodes%rowtype;
begin
  select * into _row from public.batch_barcodes
    where code = _code and company_id = public.current_company_id()
    limit 1;

  if not found then
    raise exception 'Barcode not found';
  end if;

  update public.batch_barcodes
    set scan_count = scan_count + 1,
        last_scanned_at = now(),
        last_scanned_by = auth.uid(),
        current_location = coalesce(_new_location, current_location),
        updated_at = now()
    where id = _row.id
    returning * into _row;

  return query
    select _row.id, _row.code, _row.level, _row.box_number,
           _row.current_location, _row.status, _row.scan_count,
           b.id, b.lot_number, p.name, b.grade, w.name, f.full_name, b.received_date
    from public.inventory_batches b
    left join public.products p on p.id = b.product_id
    left join public.warehouses w on w.id = b.warehouse_id
    left join public.farmers f on f.id = b.farmer_id
    where b.id = _row.batch_id;
end $$;
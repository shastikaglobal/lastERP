create table if not exists available_stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  warehouse_id uuid references warehouses(id),
  available_quantity numeric default 0,
  minimum_stock_level numeric default 0,
  last_updated timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

alter table available_stock enable row level security;

-- Policies
create policy "Enable read access for authenticated users" 
  on available_stock for select 
  to authenticated 
  using (true);

create policy "Enable insert access for authenticated users" 
  on available_stock for insert 
  to authenticated 
  with check (true);

create policy "Enable update access for authenticated users" 
  on available_stock for update 
  to authenticated 
  using (true);

create policy "Enable delete access for authenticated users" 
  on available_stock for delete 
  to authenticated 
  using (true);

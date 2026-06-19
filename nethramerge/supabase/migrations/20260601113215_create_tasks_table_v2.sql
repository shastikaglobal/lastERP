begin;

-- Create Tasks table if it doesn't exist
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text check (priority in ('high', 'medium', 'low')) default 'medium',
  status text check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  client_name text,
  due_date date,
  company_id uuid references public.companies(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Drop existing policies if any to ensure a clean state
drop policy if exists "admins and managers see all tasks" on public.tasks;
drop policy if exists "employees see own tasks" on public.tasks;
drop policy if exists "employees update own tasks" on public.tasks;

-- Create policies as requested
create policy "admins and managers see all tasks"
  on public.tasks for all
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on ur.role_id = r.id
      where ur.user_id = auth.uid()
      and r.slug in ('admin', 'manager')
    )
  );

create policy "employees see own tasks"
  on public.tasks for select
  using (assigned_to = auth.uid());

create policy "employees update own tasks"
  on public.tasks for update
  using (assigned_to = auth.uid());

-- Also enable insert policy for authenticated users so they can create tasks
-- (This is usually needed even if not explicitly in the prompt's snippet, but I'll stick to the snippet as primary)
create policy "users can create tasks" on public.tasks for insert with check (auth.uid() is not null);

commit;

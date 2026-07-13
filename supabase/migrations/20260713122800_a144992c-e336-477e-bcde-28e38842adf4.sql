
-- Roles enum
create type public.app_role as enum ('customer', 'merchant', 'driver', 'admin');

-- Application status enum
create type public.application_status as enum ('pending', 'approved', 'rejected');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- has_role security definer
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Profiles policies
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);
create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

-- user_roles policies
create policy "user_roles_select_own_or_admin" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Merchant applications
create table public.merchant_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  store_name text,
  status public.application_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
grant select, insert, update on public.merchant_applications to authenticated;
grant all on public.merchant_applications to service_role;
alter table public.merchant_applications enable row level security;

create policy "merchant_apps_select_own_or_admin" on public.merchant_applications
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "merchant_apps_insert_own" on public.merchant_applications
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "merchant_apps_update_own_pending_or_admin" on public.merchant_applications
  for update to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.has_role(auth.uid(), 'admin')
  );

-- Driver applications
create table public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  vehicle_type text,
  status public.application_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
grant select, insert, update on public.driver_applications to authenticated;
grant all on public.driver_applications to service_role;
alter table public.driver_applications enable row level security;

create policy "driver_apps_select_own_or_admin" on public.driver_applications
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "driver_apps_insert_own" on public.driver_applications
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "driver_apps_update_own_pending_or_admin" on public.driver_applications
  for update to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.has_role(auth.uid(), 'admin')
  );

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger merchant_apps_set_updated_at before update on public.merchant_applications
  for each row execute function public.set_updated_at();
create trigger driver_apps_set_updated_at before update on public.driver_applications
  for each row execute function public.set_updated_at();

-- Auto-create profile + customer role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Approve merchant: on status flip to 'approved', grant merchant role
create or replace function public.on_merchant_app_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    insert into public.user_roles (user_id, role)
    values (new.user_id, 'merchant')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger merchant_app_status_change
  after update on public.merchant_applications
  for each row execute function public.on_merchant_app_change();

create or replace function public.on_driver_app_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    insert into public.user_roles (user_id, role)
    values (new.user_id, 'driver')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger driver_app_status_change
  after update on public.driver_applications
  for each row execute function public.on_driver_app_change();

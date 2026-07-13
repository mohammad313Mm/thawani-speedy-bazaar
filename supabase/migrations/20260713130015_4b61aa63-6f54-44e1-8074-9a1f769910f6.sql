
-- 1. account status
do $$ begin
  create type public.account_status as enum ('active','suspended');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists status public.account_status not null default 'active';

-- 2. stores table
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  phone text,
  address text,
  is_open boolean not null default true,
  working_hours text,
  commission_rate numeric(5,2) not null default 15.00,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.stores to anon;
grant select, insert, update, delete on public.stores to authenticated;
grant all on public.stores to service_role;

alter table public.stores enable row level security;

create policy "stores_select_public" on public.stores
  for select to anon, authenticated using (true);

create policy "stores_insert_owner" on public.stores
  for insert to authenticated with check (owner_id = auth.uid());

create policy "stores_update_owner_or_admin" on public.stores
  for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "stores_delete_admin" on public.stores
  for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

-- 3. admin notifications
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text,
  ref_table text,
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.admin_notifications to authenticated;
grant all on public.admin_notifications to service_role;

alter table public.admin_notifications enable row level security;

create policy "admin_notif_admin_all" on public.admin_notifications
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 4. trigger fns to create notifications on new applications
create or replace function public.notify_admin_merchant_app()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (kind, title, body, ref_table, ref_id)
  values (
    'merchant_application',
    'طلب انضمام صاحب متجر جديد',
    coalesce(new.full_name,'') || case when new.store_name is not null then ' — ' || new.store_name else '' end,
    'merchant_applications',
    new.id
  );
  return new;
end $$;

create or replace function public.notify_admin_driver_app()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (kind, title, body, ref_table, ref_id)
  values (
    'driver_application',
    'طلب انضمام مندوب توصيل جديد',
    coalesce(new.full_name,'') || case when new.vehicle_type is not null then ' — ' || new.vehicle_type else '' end,
    'driver_applications',
    new.id
  );
  return new;
end $$;

revoke all on function public.notify_admin_merchant_app() from public, anon, authenticated;
revoke all on function public.notify_admin_driver_app() from public, anon, authenticated;

drop trigger if exists trg_notify_admin_merchant_app on public.merchant_applications;
create trigger trg_notify_admin_merchant_app
  after insert on public.merchant_applications
  for each row execute function public.notify_admin_merchant_app();

drop trigger if exists trg_notify_admin_driver_app on public.driver_applications;
create trigger trg_notify_admin_driver_app
  after insert on public.driver_applications
  for each row execute function public.notify_admin_driver_app();

-- 5. realtime for admin notifications
alter publication supabase_realtime add table public.admin_notifications;

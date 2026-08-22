alter table public.taxi_drivers drop constraint if exists taxi_drivers_pkey;
alter table public.taxi_drivers alter column user_id drop not null;
alter table public.taxi_drivers add column if not exists id uuid not null default gen_random_uuid();
alter table public.taxi_drivers add primary key (id);
create unique index if not exists taxi_drivers_phone_key on public.taxi_drivers (phone);
create unique index if not exists taxi_drivers_user_id_key on public.taxi_drivers (user_id) where user_id is not null;

create or replace function public.is_taxi_driver(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.taxi_drivers td
    where td.is_active
      and (
        td.user_id = _user_id
        or td.phone = (select p.phone from public.profiles p where p.id = _user_id)
      )
  );
$$;

revoke all on function public.is_taxi_driver(uuid) from public;
grant execute on function public.is_taxi_driver(uuid) to authenticated, service_role;
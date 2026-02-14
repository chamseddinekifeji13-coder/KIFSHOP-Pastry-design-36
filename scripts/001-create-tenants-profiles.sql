-- =====================================================
-- KIFSHOP Phase 1: Tenants + Profiles + RLS
-- =====================================================

-- 1. Tenants table
create table if not exists public.tenants (
  id text primary key,
  name text not null,
  logo text not null default '',
  primary_color text not null default '#4A7C59',
  created_at timestamptz not null default now()
);

alter table public.tenants enable row level security;

-- Tenants are readable by authenticated users who belong to them
create policy "tenants_select_own" on public.tenants
  for select using (
    id = (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );

-- 2. Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id text not null references public.tenants(id) on delete cascade,
  name text not null,
  role text not null default 'vendeur'
    check (role in ('gerant', 'vendeur', 'magasinier', 'achat', 'caissier')),
  initials text not null default '',
  pin_code text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read all profiles in their tenant
create policy "profiles_select_same_tenant" on public.profiles
  for select using (
    tenant_id = (
      select tenant_id from public.profiles as p where p.id = auth.uid()
    )
  );

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Gerants can insert new profiles (for creating employee accounts)
create policy "profiles_insert_gerant" on public.profiles
  for insert with check (
    tenant_id = (
      select tenant_id from public.profiles as p where p.id = auth.uid()
    )
    and (
      select role from public.profiles as p where p.id = auth.uid()
    ) = 'gerant'
  );

-- Gerants can delete profiles in their tenant (except themselves)
create policy "profiles_delete_gerant" on public.profiles
  for delete using (
    id != auth.uid()
    and tenant_id = (
      select tenant_id from public.profiles as p where p.id = auth.uid()
    )
    and (
      select role from public.profiles as p where p.id = auth.uid()
    ) = 'gerant'
  );

-- 3. Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, tenant_id, name, role, initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'tenant_id', 'masmoudi'),
    coalesce(new.raw_user_meta_data ->> 'name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data ->> 'role', 'gerant'),
    coalesce(new.raw_user_meta_data ->> 'initials', 'U')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 4. Seed the two default tenants
insert into public.tenants (id, name, logo, primary_color) values
  ('masmoudi', 'Patisserie Masmoudi', 'M', '#4A7C59'),
  ('delices', 'Delices du Sud', 'D', '#C17817')
on conflict (id) do nothing;

-- 5. Create index for fast tenant lookups
create index if not exists idx_profiles_tenant_id on public.profiles(tenant_id);

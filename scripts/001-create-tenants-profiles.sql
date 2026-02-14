-- KIFSHOP Phase 1: Create tables
create table if not exists public.tenants (
  id text primary key,
  name text not null,
  logo text not null default '',
  primary_color text not null default '#4A7C59',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id text not null references public.tenants(id) on delete cascade,
  name text not null,
  role text not null default 'vendeur',
  initials text not null default '',
  pin_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_tenant_id on public.profiles(tenant_id);

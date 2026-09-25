-- 0001_core_tables.sql
-- Base tables for Energize U: businesses, machines, sector_benchmarks, co2_emission_factors

-- Enable UUID extension if not already present
create extension if not exists "pgcrypto";

-- 1. Businesses
create table if not exists public.businesses (
  business_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sector text not null,
  location_state text not null,
  location_city text,
  employee_count integer check (employee_count is null or employee_count > 0),
  shift_pattern text,
  has_solar boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_businesses_owner unique (owner_id)
);

create index if not exists idx_businesses_owner_id on public.businesses(owner_id);

-- 2. Machines
create table if not exists public.machines (
  machine_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(business_id) on delete cascade,
  name text not null,
  machine_type text,
  primary_fuel text check (primary_fuel is null or primary_fuel in ('grid', 'diesel', 'petrol', 'kerosene', 'solar')),
  power_rating_kw numeric(10,2) check (power_rating_kw is null or power_rating_kw > 0),
  age_years numeric(4,1) check (age_years is null or age_years >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_machines_business_id on public.machines(business_id);

-- 3. Sector Benchmarks (Reference Data)
create table if not exists public.sector_benchmarks (
  benchmark_id uuid primary key default gen_random_uuid(),
  sector text not null,
  business_size_band text,
  energy_per_output_unit numeric(12,4) not null,
  cost_per_output_unit numeric(12,4) not null,
  output_unit text not null,
  source text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_sector_benchmarks_sector on public.sector_benchmarks(sector, business_size_band);

-- 4. CO2 Emission Factors (Reference Data)
create table if not exists public.co2_emission_factors (
  source_type text primary key check (source_type in ('grid', 'diesel', 'petrol', 'kerosene', 'solar')),
  kg_co2_per_unit numeric(10,4) not null check (kg_co2_per_unit >= 0),
  region text,
  source text not null,
  updated_at timestamptz not null default now()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

alter table public.businesses enable row level security;
alter table public.machines enable row level security;
alter table public.sector_benchmarks enable row level security;
alter table public.co2_emission_factors enable row level security;

-- Businesses: Owner-only full access
create policy "Owners can view own business"
  on public.businesses for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners can insert own business"
  on public.businesses for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update own business"
  on public.businesses for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can delete own business"
  on public.businesses for delete
  to authenticated
  using (owner_id = auth.uid());

-- Machines: Scoped to owner's business
create policy "Owners can view machines"
  on public.machines for select
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can insert machines"
  on public.machines for insert
  to authenticated
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can update machines"
  on public.machines for update
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can delete machines"
  on public.machines for delete
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- Reference Tables: Read-only for authenticated users
create policy "Authenticated users can read benchmarks"
  on public.sector_benchmarks for select
  to authenticated
  using (true);

create policy "Authenticated users can read emission factors"
  on public.co2_emission_factors for select
  to authenticated
  using (true);

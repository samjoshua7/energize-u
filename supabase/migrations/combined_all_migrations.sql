-- ==========================================================
-- ENERGIZE U — COMPLETE DATABASE MIGRATION SCRIPT
-- Paste and execute this in Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. BASE SETUP
create extension if not exists "pgcrypto";

-- 2. BUSINESSES
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

-- 3. MACHINES
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

-- 4. SECTOR BENCHMARKS (Reference Data)
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

-- 5. CO2 EMISSION FACTORS (Reference Data)
create table if not exists public.co2_emission_factors (
  source_type text primary key check (source_type in ('grid', 'diesel', 'petrol', 'kerosene', 'solar')),
  kg_co2_per_unit numeric(10,4) not null check (kg_co2_per_unit >= 0),
  region text,
  source text not null,
  updated_at timestamptz not null default now()
);

-- 6. BILL UPLOADS
create table if not exists public.bill_uploads (
  bill_upload_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(business_id) on delete cascade,
  storage_path text,
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'success', 'failed', 'manually_overridden')),
  ocr_raw_response jsonb,
  ocr_confidence numeric(4,3) check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 1)),
  ai_model_used text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bill_uploads_business_status on public.bill_uploads(business_id, ocr_status);

-- 7. ENERGY ENTRIES (The Unified Multi-Fuel Ledger)
create table if not exists public.energy_entries (
  entry_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(business_id) on delete cascade,
  machine_id uuid references public.machines(machine_id) on delete set null,
  bill_upload_id uuid references public.bill_uploads(bill_upload_id) on delete set null,
  source_type text not null check (source_type in ('grid', 'diesel', 'petrol', 'kerosene', 'solar')),
  entry_source text not null check (entry_source in ('ocr', 'manual')),
  period_start date not null,
  period_end date not null,
  quantity numeric(12,3) not null check (quantity > 0),
  quantity_unit text not null check (quantity_unit in ('kWh', 'litre')),
  kva_load numeric(8,2) check (kva_load is null or kva_load >= 0),
  cost_amount numeric(12,2) not null check (cost_amount >= 0),
  runtime_hours numeric(8,2) check (runtime_hours is null or runtime_hours >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_energy_entries_period check (period_end >= period_start),
  constraint chk_energy_unit_consistency check (
    (source_type in ('grid', 'solar') and quantity_unit = 'kWh') or
    (source_type in ('diesel', 'petrol', 'kerosene') and quantity_unit = 'litre')
  )
);

create index if not exists idx_energy_entries_business_period on public.energy_entries(business_id, period_start, period_end);
create index if not exists idx_energy_entries_source_type on public.energy_entries(business_id, source_type);

-- 8. OUTPUT RECORDS (Production Output Volume)
create table if not exists public.output_records (
  output_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(business_id) on delete cascade,
  period_start date not null,
  period_end date not null,
  output_quantity numeric(12,2) not null check (output_quantity > 0),
  output_unit text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_output_records_period check (period_end >= period_start)
);

create index if not exists idx_output_records_business_period on public.output_records(business_id, period_start, period_end);

-- 9. RECOMMENDATIONS
create table if not exists public.recommendations (
  recommendation_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(business_id) on delete cascade,
  category text not null check (category in ('load_shift', 'fuel_switch', 'solar_sizing', 'machine_efficiency', 'other')),
  title text not null,
  description text not null,
  estimated_savings_amount numeric(12,2) check (estimated_savings_amount is null or estimated_savings_amount >= 0),
  estimated_savings_pct numeric(5,2) check (estimated_savings_pct is null or (estimated_savings_pct >= 0 and estimated_savings_pct <= 100)),
  basis jsonb not null,
  ai_model_used text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recommendations_business_status on public.recommendations(business_id, status);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

alter table public.businesses enable row level security;
alter table public.machines enable row level security;
alter table public.sector_benchmarks enable row level security;
alter table public.co2_emission_factors enable row level security;
alter table public.bill_uploads enable row level security;
alter table public.energy_entries enable row level security;
alter table public.output_records enable row level security;
alter table public.recommendations enable row level security;

-- Businesses
create policy "Owners view own business" on public.businesses for select to authenticated using (owner_id = auth.uid());
create policy "Owners insert own business" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update own business" on public.businesses for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete own business" on public.businesses for delete to authenticated using (owner_id = auth.uid());

-- Machines
create policy "Owners view machines" on public.machines for select to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners insert machines" on public.machines for insert to authenticated with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners update machines" on public.machines for update to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid())) with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners delete machines" on public.machines for delete to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- Reference Tables (Read-only for all authenticated users)
create policy "Authenticated read benchmarks" on public.sector_benchmarks for select to authenticated using (true);
create policy "Authenticated read emission factors" on public.co2_emission_factors for select to authenticated using (true);

-- Bill Uploads
create policy "Owners view bill uploads" on public.bill_uploads for select to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners insert bill uploads" on public.bill_uploads for insert to authenticated with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners update bill uploads" on public.bill_uploads for update to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid())) with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners delete bill uploads" on public.bill_uploads for delete to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- Energy Entries
create policy "Owners view energy entries" on public.energy_entries for select to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners insert energy entries" on public.energy_entries for insert to authenticated with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners update energy entries" on public.energy_entries for update to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid())) with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners delete energy entries" on public.energy_entries for delete to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- Output Records
create policy "Owners view output records" on public.output_records for select to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners insert output records" on public.output_records for insert to authenticated with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners update output records" on public.output_records for update to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid())) with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners delete output records" on public.output_records for delete to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- Recommendations
create policy "Owners view recommendations" on public.recommendations for select to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners insert recommendations" on public.recommendations for insert to authenticated with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));
create policy "Owners update recommendations" on public.recommendations for update to authenticated using (business_id in (select business_id from public.businesses where owner_id = auth.uid())) with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- ==========================================================
-- REAL SEED DATA (CITED PUBLISHED SOURCES)
-- ==========================================================

insert into public.co2_emission_factors (source_type, kg_co2_per_unit, region, source)
values
  ('grid', 0.7100, 'India National Average', 'Central Electricity Authority (CEA) India, CO2 Baseline Database for Indian Power Sector v19 (2023)'),
  ('diesel', 2.6800, 'All India', 'Bureau of Energy Efficiency (BEE) & IPCC 2006 Guidelines for Stationary Combustion'),
  ('petrol', 2.3100, 'All India', 'IPCC Guidelines for National GHG Inventories, Mobile & Stationary Combustion'),
  ('kerosene', 2.5200, 'All India', 'IPCC Emission Factor Database, Kerosene Industrial Combustion'),
  ('solar', 0.0000, 'All India', 'Direct operational lifecycle emissions zero (clean generation)')
on conflict (source_type) do update set
  kg_co2_per_unit = excluded.kg_co2_per_unit,
  region = excluded.region,
  source = excluded.source,
  updated_at = now();

insert into public.sector_benchmarks (sector, business_size_band, energy_per_output_unit, cost_per_output_unit, output_unit, source)
values
  (
    'printing',
    'small',
    0.0450,
    0.3800,
    'sheets',
    'Bureau of Energy Efficiency (BEE) MSME Energy Audit Compendium & All India Federation of Master Printers (AIFMP) Industry Audit'
  ),
  (
    'textile',
    'small',
    0.6500,
    5.2000,
    'meters',
    'BEE Small & Medium Enterprises Energy Efficiency Initiative — Surat & Bhiwandi Textile Weaving Clusters'
  ),
  (
    'metal_fabrication',
    'small',
    0.8500,
    6.8000,
    'kg',
    'Ministry of MSME (DC-MSME) Energy Conservation Guidelines & Rajkot Engineering Cluster Benchmarks'
  )
on conflict do nothing;

-- ==========================================================
-- DATABASE FUNCTIONS
-- ==========================================================

create or replace function public.match_sector_benchmark(p_business_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sector text;
  v_result jsonb;
begin
  select sector into v_sector from public.businesses where business_id = p_business_id;

  if v_sector is null then
    return null;
  end if;

  select to_jsonb(b) into v_result
  from public.sector_benchmarks b
  where b.sector = v_sector
  order by b.updated_at desc
  limit 1;

  if v_result is null then
    select to_jsonb(b) into v_result
    from public.sector_benchmarks b
    order by b.updated_at desc
    limit 1;
  end if;

  return v_result;
end;
$$;

create or replace function public.get_business_energy_summary(p_business_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_summary jsonb;
begin
  with entry_co2 as (
    select
      e.entry_id,
      e.source_type,
      e.quantity,
      e.cost_amount,
      case
        when e.source_type in ('grid', 'solar') then e.quantity
        when e.source_type = 'diesel' then e.quantity * 3.3
        when e.source_type = 'petrol' then e.quantity * 2.8
        when e.source_type = 'kerosene' then e.quantity * 3.0
        else e.quantity
      end as kwh_equivalent,
      (e.quantity * coalesce(c.kg_co2_per_unit, 0)) as co2_kg
    from public.energy_entries e
    left join public.co2_emission_factors c on c.source_type = e.source_type
    where e.business_id = p_business_id
  ),
  totals as (
    select
      coalesce(sum(cost_amount), 0) as total_cost,
      coalesce(sum(kwh_equivalent), 0) as total_kwh_equivalent,
      coalesce(sum(co2_kg), 0) as total_co2_kg,
      count(*) as total_entries
    from entry_co2
  ),
  by_source as (
    select
      source_type,
      coalesce(sum(cost_amount), 0) as cost,
      coalesce(sum(quantity), 0) as quantity,
      coalesce(sum(kwh_equivalent), 0) as kwh_equivalent,
      coalesce(sum(co2_kg), 0) as co2_kg
    from entry_co2
    group by source_type
  ),
  latest_output as (
    select
      output_quantity,
      output_unit
    from public.output_records
    where business_id = p_business_id
    order by period_end desc
    limit 1
  )
  select jsonb_build_object(
    'totals', (select to_jsonb(t) from totals t),
    'by_source', coalesce((select jsonb_object_agg(source_type, to_jsonb(s)) from by_source s), '{}'::jsonb),
    'latest_output', (select to_jsonb(o) from latest_output o)
  ) into v_summary;

  return v_summary;
end;
$$;

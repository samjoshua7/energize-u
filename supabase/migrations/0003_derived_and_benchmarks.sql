-- 0003_derived_and_benchmarks.sql
-- Recommendations table, cited benchmark reference data, and calculation functions

-- 1. Recommendations Table
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

alter table public.recommendations enable row level security;

create policy "Owners can view recommendations"
  on public.recommendations for select
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can insert recommendations"
  on public.recommendations for insert
  to authenticated
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can update recommendations status"
  on public.recommendations for update
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- 2. Real Seed Data for CO2 Emission Factors (CITED PUBLISHED SOURCES)
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

-- 3. Real Seed Data for Sector Benchmarks (CITED PUBLISHED SOURCES)
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

-- 4. Database Function: Match Sector Benchmark for a Business
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

  -- Fallback to first available benchmark if exact sector not yet matched
  if v_result is null then
    select to_jsonb(b) into v_result
    from public.sector_benchmarks b
    order by b.updated_at desc
    limit 1;
  end if;

  return v_result;
end;
$$;

-- 5. Database Function: Get Business Energy & CO2 Aggregation
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
      -- Diesel/petrol conversion to approx kWh equivalent (1 litre diesel ~ 10 kWh thermal, ~3.3 kWh electrical output)
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

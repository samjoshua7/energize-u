begin;

alter table public.businesses
  add column primary_output_unit text check (length(trim(primary_output_unit)) > 0),
  add column output_unit_scale numeric(12,3) not null default 1 check (output_unit_scale > 0),
  add column solar_capacity_kw numeric(12,3) check (solar_capacity_kw >= 0),
  add column discom_name text,
  add column tariff_category text,
  add column onboarding_completed_at timestamptz;

alter table public.machines
  add column kva_rating numeric(12,3) check (kva_rating > 0);

alter table public.energy_entries
  add column tariff_category text,
  add column tariff_rate numeric(12,2) check (tariff_rate >= 0),
  add column generator_output_kwh numeric(12,3) check (generator_output_kwh > 0),
  add column archived_at timestamptz;

alter table public.bill_uploads
  add column parsed_fields jsonb not null default '{}'::jsonb,
  add column extraction_mode text not null default 'manual'
    check (extraction_mode in ('manual', 'provider', 'demo'));

update public.bill_uploads set extraction_mode = 'provider'
where ai_model_used is not null and ocr_raw_response is not null;

alter table public.recommendations
  add column effort_level text check (effort_level in ('low', 'medium', 'high'));

alter table public.sector_benchmarks
  add column reference_kind text not null default 'seed'
    check (reference_kind in ('seed', 'published')),
  add column source_url text,
  add column verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified')),
  add column output_unit_scale numeric(12,3) not null default 1 check (output_unit_scale > 0);

-- Reference rows are deliberately empty until a dated, documented tariff is available.
create table public.tariff_references (
  tariff_id uuid primary key default gen_random_uuid(),
  state text not null,
  discom_name text not null,
  category text not null,
  voltage_level text not null,
  effective_from date not null,
  effective_to date,
  slab_from_kwh numeric(12,3) not null default 0 check (slab_from_kwh >= 0),
  slab_to_kwh numeric(12,3),
  rate_per_kwh numeric(12,2) not null check (rate_per_kwh >= 0),
  source text not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (slab_to_kwh is null or slab_to_kwh > slab_from_kwh)
);
create index tariff_references_lookup on public.tariff_references(state, discom_name, category, effective_from);
alter table public.tariff_references enable row level security;
create policy "Read published tariff references" on public.tariff_references
  for select to authenticated using (true);
grant select on public.tariff_references to authenticated;

create or replace function public.touch_energy_workflow_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['businesses', 'machines', 'energy_entries', 'bill_uploads',
    'output_records', 'recommendations', 'tariff_references'] loop
    execute format('create trigger energy_workflow_updated_at before update on public.%I
      for each row execute function public.touch_energy_workflow_updated_at()', table_name);
  end loop;
end;
$$;

-- Composite foreign keys prevent linking another owner's machine or receipt.
alter table public.machines add constraint machines_business_identity unique (business_id, machine_id);
alter table public.bill_uploads add constraint bills_business_identity unique (business_id, bill_upload_id);
alter table public.energy_entries
  add constraint energy_machine_same_business foreign key (business_id, machine_id)
    references public.machines(business_id, machine_id) not valid,
  add constraint energy_bill_same_business foreign key (business_id, bill_upload_id)
    references public.bill_uploads(business_id, bill_upload_id) not valid;

-- Preserve bill-linked ledger history. Existing invalid links, if any, need a separate audit.
drop policy "Owners can delete energy entries" on public.energy_entries;
create policy "Owners can delete unlinked entries" on public.energy_entries
  for delete to authenticated using (
    bill_upload_id is null and business_id in
      (select business_id from public.businesses where owner_id = auth.uid())
  );
drop policy "Owners can delete bill uploads" on public.bill_uploads;
drop policy "Owners can delete own business" on public.businesses;

-- Remove the owner-bypassing execution mode of the existing reporting RPC.
alter function public.get_business_energy_summary(uuid) security invoker;
alter function public.get_business_energy_summary(uuid) set search_path = '';
revoke all on function public.get_business_energy_summary(uuid) from public, anon;
grant execute on function public.get_business_energy_summary(uuid) to authenticated;

create or replace function public.match_sector_benchmark(p_business_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select to_jsonb(reference)
  from public.businesses business
  join public.sector_benchmarks reference on reference.sector = business.sector
    and reference.output_unit = business.primary_output_unit
  where business.business_id = p_business_id and business.owner_id = auth.uid()
  order by (reference.verification_status = 'verified') desc, reference.updated_at desc,
    reference.benchmark_id
  limit 1;
$$;
revoke all on function public.match_sector_benchmark(uuid) from public, anon;
grant execute on function public.match_sector_benchmark(uuid) to authenticated;

create or replace function public.get_energy_period_report(
  p_business_id uuid, p_start date, p_end date
)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
  output_unit text;
  unit_scale numeric;
begin
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 365 then
    raise exception 'Choose a reporting period between 1 and 366 days';
  end if;
  select b.primary_output_unit, b.output_unit_scale into output_unit, unit_scale
    from public.businesses b where b.business_id = p_business_id and b.owner_id = auth.uid();
  if not found then raise exception 'Business not accessible' using errcode = '42501'; end if;

  -- Allocate multi-day bills and production evenly over their inclusive periods.
  -- Weekly points are allocated estimates, never claimed to be metered readings.
  with days as (
    select p_start + n as day from generate_series(0, p_end - p_start) n
  ), energy_daily as (
    select d.day, e.source_type, e.quantity_unit, e.entry_id,
      e.cost_amount / (e.period_end - e.period_start + 1) as cost,
      e.quantity / (e.period_end - e.period_start + 1) as quantity,
      e.quantity * f.kg_co2_per_unit / (e.period_end - e.period_start + 1) as co2_kg,
      f.kg_co2_per_unit as factor, f.source as factor_source, f.region as factor_region
    from days d join public.energy_entries e on d.day between e.period_start and e.period_end
    left join public.co2_emission_factors f on f.source_type = e.source_type
    where e.business_id = p_business_id and e.archived_at is null
  ), production_daily as (
    select d.day, sum(o.output_quantity / (o.period_end - o.period_start + 1)) as quantity
    from days d join public.output_records o on d.day between o.period_start and o.period_end
    where o.business_id = p_business_id and o.output_unit = output_unit
    group by d.day
  ), source_totals as (
    select source_type, quantity_unit, round(sum(cost), 2) as cost,
      round(sum(quantity), 3) as quantity,
      case when bool_and(factor is not null) then round(sum(co2_kg), 3) end as co2_kg,
      max(factor) as emission_factor, max(factor_source) as factor_source,
      max(factor_region) as factor_region,
      round(100 * sum(cost) / nullif((select sum(cost) from energy_daily), 0), 2) as cost_share_pct
    from energy_daily group by source_type, quantity_unit
  ), energy_by_day as (
    select day, sum(cost) as cost from energy_daily group by day
  ), weekly as (
    select date_trunc('week', d.day::timestamp)::date as week_start,
      round(sum(coalesce(e.cost, 0)), 2) as cost,
      round(sum(p.quantity), 3) as output_quantity,
      round(sum(coalesce(e.cost, 0)) / nullif(sum(p.quantity), 0) * unit_scale, 2) as cost_per_output
    from days d left join energy_by_day e using (day)
    left join production_daily p using (day)
    group by date_trunc('week', d.day::timestamp)::date
  )
  select jsonb_build_object(
    'period_start', p_start, 'period_end', p_end,
    'allocation_method', 'Even daily allocation across each recorded period; not metered daily consumption',
    'output_unit', output_unit, 'output_unit_scale', unit_scale,
    'total_cost', coalesce((select round(sum(cost), 2) from energy_daily), 0),
    'total_co2_kg', (select case when count(*) = 0 then 0
      when bool_and(factor is not null) then round(sum(co2_kg), 3) end from energy_daily),
    'missing_emission_factors', (select count(distinct source_type) from energy_daily where factor is null),
    'entry_count', (select count(distinct entry_id) from energy_daily),
    'output_quantity', (select round(sum(quantity), 3) from production_daily),
    'cost_per_output', (select round(coalesce((select sum(cost) from energy_daily), 0)
      / nullif(sum(quantity), 0) * unit_scale, 2) from production_daily),
    'by_source', coalesce((select jsonb_agg(to_jsonb(s) order by s.cost desc) from source_totals s), '[]'::jsonb),
    'weekly', coalesce((select jsonb_agg(to_jsonb(w) order by w.week_start) from weekly w), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_energy_period_report(uuid, date, date) from public, anon;
grant execute on function public.get_energy_period_report(uuid, date, date) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bill-uploads', 'bill-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Receipt object keys must be business UUID / random UUID.extension.
create policy "Energy owners upload receipts" on storage.objects for insert to authenticated
with check (bucket_id = 'bill-uploads' and exists (
  select 1 from public.businesses b where b.owner_id = auth.uid()
    and b.business_id::text = (storage.foldername(name))[1]
));
create policy "Energy owners read receipts" on storage.objects for select to authenticated
using (bucket_id = 'bill-uploads' and exists (
  select 1 from public.businesses b where b.owner_id = auth.uid()
    and b.business_id::text = (storage.foldername(name))[1]
));

commit;

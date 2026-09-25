-- 0002_energy_ledger.sql
-- Energy ledger tables: bill_uploads, energy_entries, output_records

-- 1. Bill Uploads
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

-- 2. Energy Entries (The Unified Multi-Fuel Ledger)
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

-- 3. Output Records (Production Output)
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

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

alter table public.bill_uploads enable row level security;
alter table public.energy_entries enable row level security;
alter table public.output_records enable row level security;

-- Bill Uploads
create policy "Owners can view bill uploads"
  on public.bill_uploads for select
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can insert bill uploads"
  on public.bill_uploads for insert
  to authenticated
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can update bill uploads"
  on public.bill_uploads for update
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can delete bill uploads"
  on public.bill_uploads for delete
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- Energy Entries
create policy "Owners can view energy entries"
  on public.energy_entries for select
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can insert energy entries"
  on public.energy_entries for insert
  to authenticated
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can update energy entries"
  on public.energy_entries for update
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can delete energy entries"
  on public.energy_entries for delete
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

-- Output Records
create policy "Owners can view output records"
  on public.output_records for select
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can insert output records"
  on public.output_records for insert
  to authenticated
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can update output records"
  on public.output_records for update
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

create policy "Owners can delete output records"
  on public.output_records for delete
  to authenticated
  using (business_id in (select business_id from public.businesses where owner_id = auth.uid()));

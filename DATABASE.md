# Database Specification

This document defines the database contract for Energize U, the multi-fuel MSME energy intelligence platform. It is intentionally documentation-only at this stage and should be treated as the source of truth for future schema and migration work.

## 1. Database Philosophy

The database is the authoritative system for derived energy/financial correctness (cost per unit output, CO₂ per unit output, benchmark deltas) and for authorization. The frontend and the AI/OCR layer are clients of the database and must never be treated as the source of truth for normalized values or benchmark comparisons.

The design favors clarity over over-engineering. The system is intended for a single MSME owner per business in the MVP and should remain simple to operate and extend toward sensor-based ingestion later.

## 2. Core Principles

- Use PostgreSQL with Supabase.
- Use numeric(12,2) for all monetary values and numeric(12,3) for energy/fuel quantities.
- Use UUID primary keys for user-facing business entities.
- Every business table includes created_at and updated_at timestamps.
- Every AI/OCR-derived row stores its raw provider response (jsonb) alongside the parsed values.
- Use Row Level Security to enforce access at the database layer, scoped by business_id and the owning auth.uid().

## 3. ER Diagram

```text
users (auth.users) ─< businesses (owner_id)

businesses ─< machines
businesses ─< energy_entries
businesses ─< output_records
businesses ─< recommendations
businesses ─< bill_uploads

machines ─< energy_entries (nullable link, e.g. a specific genset's diesel use)

bill_uploads ─< energy_entries (nullable — a bill photo produces one energy_entry once confirmed)

sector_benchmarks (reference table, not tied to a business)
co2_emission_factors (reference table, not tied to a business)
```

## 4. Core Tables

### businesses

| Column | Type | Notes |
|---|---|---|
| business_id | uuid | Primary key |
| owner_id | uuid | References auth.users.id, one owner per business in the MVP |
| name | text | Required |
| sector | text | e.g. printing, textile, small metal/fabrication — drives benchmark matching |
| location_state | text | Required — tariff slabs and grid emission factors vary by state |
| location_city | text | Nullable |
| employee_count | integer | Nullable |
| shift_pattern | text | e.g. single_shift, double_shift, 24x7 — free text or controlled list |
| has_solar | boolean | Default false |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

### machines

| Column | Type | Notes |
|---|---|---|
| machine_id | uuid | Primary key |
| business_id | uuid | References businesses.business_id |
| name | text | Required |
| machine_type | text | e.g. offset_press, loom, compressor, genset, boiler |
| primary_fuel | text | grid, diesel, petrol, kerosene, solar |
| power_rating_kw | numeric(10,2) | Nullable |
| age_years | numeric(4,1) | Nullable — older machines are flagged as inefficient in recommendations |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

### bill_uploads

| Column | Type | Notes |
|---|---|---|
| bill_upload_id | uuid | Primary key |
| business_id | uuid | References businesses.business_id |
| storage_path | text | Path in Supabase Storage bucket `bill-uploads` |
| ocr_status | text | pending, success, failed, manually_overridden |
| ocr_raw_response | jsonb | Full Groq response, stored for audit/re-parse |
| ocr_confidence | numeric(4,3) | Nullable, 0–1, if the model returns a confidence signal |
| ai_model_used | text | e.g. meta-llama/llama-4-scout-17b-16e-instruct (Groq) — always recorded |
| uploaded_at | timestamptz | Default now() |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

### energy_entries

The unified, normalized energy ledger — every grid unit, litre of fuel, or solar unit generated is one row here, regardless of source.

| Column | Type | Notes |
|---|---|---|
| entry_id | uuid | Primary key |
| business_id | uuid | References businesses.business_id |
| machine_id | uuid | Nullable reference to machines.machine_id |
| bill_upload_id | uuid | Nullable reference to bill_uploads.bill_upload_id (set when the entry came from a scanned bill) |
| source_type | text | grid, diesel, petrol, kerosene, solar |
| entry_source | text | ocr or manual — always recorded |
| period_start | date | Required |
| period_end | date | Required |
| quantity | numeric(12,3) | Required — kWh for grid/solar, litres for diesel/petrol/kerosene |
| quantity_unit | text | kWh or litre |
| kva_load | numeric(8,2) | Nullable, grid entries only |
| cost_amount | numeric(12,2) | Required |
| runtime_hours | numeric(8,2) | Nullable — genset/burner runtime, when applicable |
| notes | text | Nullable |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

### output_records

Business output volume for a period, used to compute energy/cost per unit of output.

| Column | Type | Notes |
|---|---|---|
| output_id | uuid | Primary key |
| business_id | uuid | References businesses.business_id |
| period_start | date | Required |
| period_end | date | Required |
| output_quantity | numeric(12,2) | Required |
| output_unit | text | e.g. sheets, meters, kg, units — business-defined |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

### sector_benchmarks

Reference data, seeded and maintained independently of any single business.

| Column | Type | Notes |
|---|---|---|
| benchmark_id | uuid | Primary key |
| sector | text | Matches businesses.sector |
| business_size_band | text | e.g. micro, small, medium |
| energy_per_output_unit | numeric(12,4) | e.g. kWh-equivalent per output unit |
| cost_per_output_unit | numeric(12,4) | ₹ per output unit |
| output_unit | text | Matches the sector's typical output_unit |
| source | text | Where the benchmark figure came from (cite it — never a fabricated number) |
| updated_at | timestamptz | Default now() |

### co2_emission_factors

Reference data for converting each source_type into CO₂.

| Column | Type | Notes |
|---|---|---|
| source_type | text | Primary key — grid, diesel, petrol, kerosene, solar |
| kg_co2_per_unit | numeric(10,4) | Required, per kWh or per litre depending on source_type |
| region | text | Nullable — grid factor varies by state/grid mix |
| source | text | Citation for the factor |
| updated_at | timestamptz | Default now() |

### recommendations

| Column | Type | Notes |
|---|---|---|
| recommendation_id | uuid | Primary key |
| business_id | uuid | References businesses.business_id |
| category | text | load_shift, fuel_switch, solar_sizing, machine_efficiency, other |
| title | text | Required |
| description | text | Required |
| estimated_savings_amount | numeric(12,2) | Nullable |
| estimated_savings_pct | numeric(5,2) | Nullable |
| basis | jsonb | The benchmark/ledger data points the recommendation was derived from — always populated, never omitted |
| ai_model_used | text | e.g. an OpenRouter model id — always recorded |
| status | text | open, dismissed, actioned |
| generated_at | timestamptz | Default now() |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

## 5. Relationships

- One owner (auth user) owns one business in the MVP (extendable to many-to-many later).
- One business has many machines, energy_entries, output_records, bill_uploads, and recommendations.
- One bill_upload produces at most one energy_entry once the owner confirms/edits the extracted values.
- energy_entries is the single source of truth for all energy/fuel usage regardless of source_type — no separate tables per fuel type.
- sector_benchmarks and co2_emission_factors are shared reference tables, not owned by any business.

## 6. Enums and Controlled Values

Use text columns with explicit validation (check constraints) rather than custom enum types unless the team later adopts a migration workflow that supports them comfortably.

Suggested values:

- energy_entries.source_type: grid, diesel, petrol, kerosene, solar
- energy_entries.entry_source: ocr, manual
- bill_uploads.ocr_status: pending, success, failed, manually_overridden
- recommendations.category: load_shift, fuel_switch, solar_sizing, machine_efficiency, other
- recommendations.status: open, dismissed, actioned

## 7. Indexes

Recommended indexes:

- businesses(owner_id)
- machines(business_id)
- energy_entries(business_id, period_start, period_end)
- energy_entries(business_id, source_type)
- bill_uploads(business_id, ocr_status)
- output_records(business_id, period_start, period_end)
- recommendations(business_id, status)
- sector_benchmarks(sector, business_size_band)

## 8. Constraints

- Monetary values must be non-negative.
- Quantity, runtime_hours, and output_quantity values must be positive.
- period_end must not be before period_start on energy_entries and output_records.
- A recommendation's basis column must not be null — every recommendation must cite the data it came from.
- Finalized recommendations must not be hard-deleted; use status = dismissed instead.

## 9. Triggers and Derived Data

The following should be enforced through database triggers or stored functions:

- Recompute a business's cost-per-output-unit and CO₂-per-output-unit whenever energy_entries or output_records change for the relevant period (do not leave this to client-side calculation).
- When a bill_upload's ocr_status changes to success and the owner confirms it, create (or update) the linked energy_entries row.
- Normalize quantity_unit consistently on insert (reject a row that mixes, e.g., litres with source_type = grid).

## 10. Views

Recommended read-only views for Phase 2:

- energy_mix_by_business (period-bucketed % breakdown of grid/diesel/petrol/kerosene/solar cost and quantity)
- benchmark_delta_by_business (a business's cost/energy-per-output-unit vs. its matched sector_benchmarks row)
- open_recommendations_summary

These views are informational and should not be used as the primary write path.

## 11. Functions

Suggested server-side functions:

- recalculate_output_normalized_metrics(business_id, period_start, period_end)
- match_sector_benchmark(business_id) — returns the best-fit sector_benchmarks row
- confirm_bill_upload(bill_upload_id, confirmed_fields jsonb) — creates the energy_entries row from a reviewed OCR result

These functions should remain simple and explicit. Avoid over-abstracting them.

## 12. RLS Philosophy

Row Level Security must protect user-facing tables according to ownership. The database should enforce the same rules the application expects.

The implementation should follow a simple pattern for the MVP:

- OWNER: full access to their own business_id and everything scoped under it (machines, energy_entries, bill_uploads, output_records, recommendations)
- No cross-business visibility of any kind
- sector_benchmarks and co2_emission_factors are readable by any authenticated user (reference data), writable only via migrations/service role

## 13. Audit Logging

The system should preserve enough information to understand what data drove each recommendation and each ledger figure. For the MVP, this is done through:

- created_at and updated_at columns,
- the raw ocr_raw_response and recommendations.basis jsonb columns (never overwritten, only appended-to via new rows),
- a later extension to a dedicated audit table if needed.

## 14. Soft Delete and Void Strategy

- Do not hard-delete recommendations or energy_entries linked to a bill_upload.
- Use a status such as dismissed for recommendations instead of deleting them.
- Keep the original bill_upload and its raw OCR response intact even if the owner later corrects the derived energy_entries values.

## 15. Data Provenance Rule

Every numeric value shown to the owner must be traceable to either: a stored energy_entries row, a cited sector_benchmarks/co2_emission_factors row, or a recommendations.basis payload. No UI component should display a number that isn't backed by one of these three sources — this is what prevents the "fabricated benchmark" failure mode called out in AGENTS.md.

## 16. Migration Order

The recommended migration order is:

1. base tables: businesses, machines, sector_benchmarks, co2_emission_factors,
2. bill_uploads, energy_entries, output_records,
3. recommendations,
4. triggers and derived-value functions,
5. RLS policies,
6. reporting views,
7. seed data for sector_benchmarks and co2_emission_factors (cited sources only — see Never-Do Rules in AGENTS.md).

## 17. Future Scalability

The current design is sufficient for a single-owner-per-business MVP. Future growth should be handled through:

- a sensor_readings table feeding the same energy_entries normalization path once a business adds hardware,
- multi-user-per-business support,
- richer, region-aware benchmark and tariff-slab tables,
- an audit table for full change history,
- anomaly-detection tables once real-time sensor data exists.

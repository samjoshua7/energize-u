# Feature Specification — Energize U

Page-by-page functional spec. Every screen here follows DESIGN.md for visual treatment — this document says *what* each screen shows and where the data comes from, not *how it looks*. Read both before building.

Each section names the IMPLEMENTATION_PLAN.md milestone it belongs to. A few sections need small additions to DATABASE.md/ARCHITECTURE.md beyond what's already there — those are called out explicitly as **Schema addition** or **Route addition**, not left implicit.

---

## 1. Onboarding / Setup (`/onboarding`) — Milestone 1

One-time flow, numbered steps (this is genuinely sequential, so step numbers in the UI are correct here per DESIGN.md).

Fields, all on the `businesses` table already in DATABASE.md § 4:
- Business name (text)
- Business type — dropdown mapped to `sector` (printing, textile, small metal/fabrication — the seeded benchmark sectors; add "other" for anything unmatched, which simply won't get a benchmark comparison yet)
- Location/state — dropdown mapped to `location_state` (drives grid emission factor + tariff-slab lookup later)
- Primary output unit — free text mapped to a new field the owner defines once (e.g. "1000 prints", "meter of fabric", "kg processed") — this is the denominator every `output_records` entry will use going forward. Store it on `businesses` (**Schema addition**: add `output_unit_label text` to the `businesses` table in the Milestone 1 migration — this was implicit in `output_records.output_unit` before but needs to be set once at onboarding, not re-typed every period).
- Genset/generator details — fuel type (diesel/petrol) and a kVA rating dropdown (common sizes: 5, 7.5, 10, 15, 20, 25, 40+ kVA) — this creates the first row in `machines` (machine_type = genset, primary_fuel = the chosen fuel, power_rating_kw derived from the kVA figure).
- Solar presence — yes/no toggle mapped to `businesses.has_solar`; if yes, a rough capacity field (kW) creates a second `machines` row (primary_fuel = solar).
- Electricity bill photo upload — this is the **real** Milestone 3 Groq OCR flow (`extract-bill` Edge Function → "reading bill…" loading state per DESIGN.md → editable pre-filled fields: units consumed, sanctioned load/KVA, tariff slab, bill amount → creates the first `energy_entries` row, source_type = grid, entry_source = ocr). If the call fails, the same manual fallback form from Milestone 2 appears instead — not a separate "fake" flow, the same real one, first use.

## 2. Home / Unified Dashboard (`/dashboard`) — Milestone 6

The main screen, single scroll, mobile-first per DESIGN.md's layout section:

1. **Insight banner** (top, one line, amber accent) — the single sharpest fact this period, e.g. "Your genset backup costs ~3× more per unit than grid power." Generated as part of the recommendations output (Milestone 5) — pull the single highest-`estimated_savings_amount` open recommendation's title, don't write a separate generator for this; reusing the real recommendation keeps the banner honest rather than a separately-fabricated tagline.
2. **Hero number** — cost per unit of output this month (₹), the one large Plex Mono figure per DESIGN.md, with the small trend line (last 4–8 weeks) beneath it in a muted tone. Sourced from the derived-metrics trigger in DATABASE.md § 9 (Milestone 4) — never computed client-side.
3. **Energy mix breakdown** — bar (preferred over pie for readability at small sizes) showing % grid / diesel / kerosene / solar **by cost**, not volume — the spec is explicit that cost is the meaningful comparison since the units differ (kWh vs litres). Sourced from `energy_entries` grouped by `source_type`.
4. **Total energy cost this month** — a secondary figure, smaller than the hero, ₹ sum across all `source_type` for the current period.
5. **CO₂ this month** — with a plain-language equivalence line ("≈ planting X trees this year" or similar — use a real, cited conversion factor, add it next to `co2_emission_factors` in the Milestone 4 seed migration; don't invent the tree-equivalence number).

## 3. Energy Log / Ledger Page (`/energy/ledger` and `/energy/log`) — Milestone 2 (manual entry) + Milestone 3 (bill OCR)

Two related screens already scoped in IMPLEMENTATION_PLAN.md, spec here for completeness:
- **Ledger** (`/energy/ledger`): the ledger-row list (DESIGN.md layout) of every `energy_entries` row — date, source, amount (kWh or litres, unit-labeled), cost. Filterable by source_type. This already exists in Milestone 2's scope.
- **Add fuel purchase** (`/energy/log`): the manual form — litres, price, date, source type — already Milestone 2's manual logging form. This is correctly described as the low-frequency manual entry point; nothing new needed here.
- **Electricity bill history**: a filtered view of the ledger scoped to `source_type = 'grid'`, each row expandable to show the linked `bill_uploads` photo + the parsed fields that were confirmed for it. This is a read view over data Milestone 3 already writes — no new table needed, just a filtered/expandable presentation of `energy_entries` joined to `bill_uploads`.

## 4. Benchmark Page (`/benchmarks`) — Milestone 4

- Bar chart: the business's own cost-per-unit-output vs. the matched `sector_benchmarks` row's `cost_per_output_unit` ("you vs typical [printing press]"). Already scoped in Milestone 4's `features/benchmarks/` work.
- Source note, one line, directly under the chart, in `--color-ink-muted`: "Benchmarks derived from a seed reference table — see sources below," expanding to show the actual `sector_benchmarks.source` citation. Be literally as upfront as the user's own spec says — this is not a caveat to soften, it's a trust-building disclosure judges should see clearly.
- Percentile/ranking ("top 30% most efficient printing presses in your size band") — this needs more than one peer data point to be honest. **Do this only if the seeded `sector_benchmarks` table actually has a distribution (e.g. a stored percentile band, not just a single average) for the matched sector** — check DATABASE.md § 4's `sector_benchmarks` columns before building this; if the seed data is just a single average per sector (the current schema), either extend the seed migration to include a rough distribution (min/median/top-quartile figures, still cited) or skip the percentile claim entirely rather than presenting a single-point comparison as a ranking. Flag this decision in HANDOVER.md either way.

## 5. Recommendations Page (`/recommendations`) — Milestone 5

- Prioritized list (ledger-row style, sorted by `estimated_savings_amount` descending): action title, estimated ₹ savings/month, effort level.
- **Schema addition**: `recommendations` in DATABASE.md § 4 doesn't currently have an effort-level column — add `effort_level text` (values: `low`, `medium`, `high`) to the Milestone 5 migration (or fold into Milestone 4's migration if that hasn't run yet), and require the OpenRouter prompt in the `generate-recommendations` function to return it as part of the structured JSON.
- Click/expand → shows `recommendations.basis` (already in the schema) as the "show your work" panel per DESIGN.md — the actual ledger figures and benchmark numbers that produced the recommendation, not a restated summary.
- Dismiss/act actions update `status`, per the existing Milestone 5 scope — never delete.

## 6. Decarbonisation / Emissions Page (`/emissions`) — new page, belongs in Milestone 4 (data) + Milestone 6 (UI)

**Route addition** to ARCHITECTURE.md § 7's route list: `/emissions`.
**Feature addition** to ARCHITECTURE.md § 3: `features/emissions/`.

- CO₂ breakdown by source_type (diesel/kerosene shown prominently as the heavy hitters, per the spec) — a bar chart, `co2_emission_factors` × `energy_entries.quantity`, grouped by source.
- Emission factor sources cited simply, inline next to each source's figure (not buried in a footnote) — pulls `co2_emission_factors.source` directly, same honesty pattern as the benchmark page.
- Fuel-switch/solar-sizing suggestion tied to the business's actual load — this is not a new computation, it's a filtered view of `recommendations` where `category IN ('fuel_switch', 'solar_sizing')`, reusing Milestone 5's real recommendation engine rather than a separate "go solar" generator. If no such recommendation exists yet for this business, show an empty state ("no fuel-switch opportunity flagged yet") rather than a generic suggestion.

## 7. Alerts / Notifications strip (optional, if time permits) — new, stretch scope after Milestone 6

**Route addition**: none — this is a dismissible banner component on `/dashboard`, not a separate page.
**Feature addition**: `features/alerts/` (or fold into `features/dashboard/` if it stays this small).

Scoped down exactly as the spec says — a simple pattern-based banner, not a model. Concretely:

- **Schema addition** (only if this milestone is reached): add nullable `runtime_start_hour smallint` and `runtime_end_hour smallint` (0–23) to `energy_entries`, used only for genset/burner runtime rows. This is a real, owner-entered field (an extra two inputs on the existing manual runtime form) — not inferred or fabricated. Without this addition there is no real hour-of-day data to alert on, and the feature should be skipped rather than faking a time pattern from data that doesn't contain one.
- Alert logic: a simple SQL grouping of genset/burner `energy_entries` by `runtime_start_hour` over the last N logged entries; if a clear mode exists (e.g. most entries start within the same 1–2 hour window), render "Your genset typically runs {window} — consider shifting non-critical loads." If entries are too sparse or too spread out for a clear mode, show nothing rather than a low-confidence claim.
- This is explicitly the scaled-down version of the "predictive avoidance" idea from the original pitch — do not expand it into forecasting or anomaly detection here; that stays Phase 3 per AGENTS.md § 3.

---

## Build order note

This spec doesn't change IMPLEMENTATION_PLAN.md's milestone order — it fills in detail *within* Milestones 1, 2, 4, 5, 6, and adds two small scope items (Emissions page, Alerts strip) after Milestone 6. Update IMPLEMENTATION_PLAN.md's checkpoints for Milestones 1, 4, 5, and 6 to include the schema additions called out above (`businesses.output_unit_label`, `recommendations.effort_level`, and — only if Alerts is reached — `energy_entries.runtime_start_hour`/`runtime_end_hour`) so they're drafted in the right migration rather than bolted on later as a separate one.

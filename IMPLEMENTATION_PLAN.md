# Implementation Plan — Energize U

This is the ordered build plan for the coding agent. It assumes AGENTS.md, ARCHITECTURE.md, and DATABASE.md have already been read and are the source of truth for *how* to build each piece — this document is the *order* and the *checkpoints*, not a restatement of those rules.

Work top to bottom. Do not start a milestone before the previous one is verified working. Do not jump ahead into Phase 2/3 features (per AGENTS.md § 3) even if a milestone looks quick to extend — narrow and real beats wide and half-built.

Every migration in this plan is **drafted and presented, never executed, by the agent** (Database-First Rule). Every terminal command is **printed, never run, by the agent** (Human Terminal Rule). SETUP.md is the matching checklist for the human side of each handoff.

---

## Milestone 0 — Scaffold

- [ ] Print the scaffold command for the user to run: `npm create vite@latest . -- --template react`
- [ ] Once confirmed, print the dependency install command:
  ```bash
  npm install react-router-dom @supabase/supabase-js @mui/material @mui/icons-material @emotion/react @emotion/styled recharts jspdf jspdf-autotable
  ```
- [ ] Create the folder structure from ARCHITECTURE.md § 3 (`src/app`, `src/lib`, `src/lib/ai`, `src/routes`, `src/features/*`, `src/components/*`, `src/hooks`, `supabase/functions`, `supabase/migrations`) with empty `.gitkeep` placeholders where nothing exists yet.
- [ ] Confirm Vite's generated `.gitignore` covers `.env.local`; add `supabase/.env` to it if not already present.
- [ ] Create `src/lib/supabaseClient.js` reading `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — do not hardcode either.
- [ ] Set up the MUI theme (`src/app/theme/`) and a minimal `AppShell` — mobile-first per the UI/UX Rule, not the printing-press app's dense desktop layout.
- [ ] **Checkpoint:** print `npm run dev` for the user; confirm the blank shell renders before continuing.

## Milestone 1 — Supabase project connected + first schema migration

Prerequisite: user has completed SETUP.md § 1 and filled `.env.local`.

- [ ] Draft `supabase/migrations/0001_core_tables.sql` covering exactly: `businesses`, `machines`, `sector_benchmarks`, `co2_emission_factors`, per DATABASE.md § 4, including the check constraints from § 8 that apply to these tables and the indexes from § 7 that apply to these tables.
- [ ] Draft the matching RLS policies for `businesses` and `machines` (owner-only, per DATABASE.md § 12) in the same migration file.
- [ ] **STOP — Database-First Rule.** Present the migration SQL. Do not proceed until the user confirms it ran successfully in the Supabase SQL Editor.
- [ ] Build `features/businessProfile/api.js` (create/read/update the current user's business) and `features/machines/api.js` (CRUD scoped to `business_id`).
- [ ] Build the onboarding flow: `/onboarding` route, a single form (business name, sector, location_state, location_city, employee_count, shift_pattern, has_solar) — this is the one owner-editable business profile, not a list.
- [ ] Build `features/auth/` (Supabase Auth: email/password or magic link — pick the faster one to implement for a hackathon demo; note the choice in HANDOVER.md) and route guards that redirect to `/onboarding` if no business exists yet for the signed-in user.
- [ ] **Checkpoint:** sign up, get redirected to onboarding, submit it, confirm a row lands in `businesses` with the right `owner_id`.

## Milestone 2 — Ledger schema: bill_uploads, energy_entries, output_records

- [ ] Draft `supabase/migrations/0002_energy_ledger.sql`: `bill_uploads`, `energy_entries`, `output_records`, per DATABASE.md § 4, with the check constraints (§ 8), triggers for `updated_at`, and indexes (§ 7) that apply to these three tables.
- [ ] Draft RLS policies for all three (owner-only via `business_id`, per § 12).
- [ ] **STOP — Database-First Rule.** Present the migration. Wait for confirmation.
- [ ] Build `features/energyEntries/api.js`: list/create for `energy_entries`, create for `bill_uploads`.
- [ ] Build the **manual logging form** first (diesel/petrol/kerosene purchase, grid bill manual entry, solar generation, genset/burner runtime) — this is the fallback path and must work standalone, with no AI dependency, before OCR is wired in.
- [ ] Build `features/energyLedger/` — the unified ledger list/table view, grouped by `source_type`, reading straight from `energy_entries`. No normalization math client-side yet (that's Milestone 5's trigger); just display raw rows for now.
- [ ] **Checkpoint:** log one manual entry per source type; confirm all four show up in the ledger view.

## Milestone 3 — Groq OCR pipeline (extract-bill Edge Function)

Prerequisite: user has completed SETUP.md § 2 and set `GROQ_API_KEY` as an Edge Function secret.

- [ ] Print the command to scaffold the function: `npx supabase functions new extract-bill`
- [ ] Implement `supabase/functions/extract-bill/index.ts`:
  - Accepts a bill image (base64 or storage path), calls Groq's vision-capable chat completions endpoint (`https://api.groq.com/openai/v1/chat/completions`, OpenAI-compatible client works) with `AI_VISION_MODEL` (env var, default `meta-llama/llama-4-scout-17b-16e-instruct`).
  - Prompts for a strict JSON response matching a defined schema: billing period start/end, units consumed (kWh), KVA load if present, tariff/cost amount, confidence per field if the model will give one.
  - Validates the response against that schema server-side before returning it to the client — reject and return a clear error shape on malformed JSON rather than passing it through.
  - Reads `GROQ_API_KEY` from `Deno.env.get(...)` — never hardcoded.
- [ ] Print the command to set the secret (for the user to run): `npx supabase secrets set GROQ_API_KEY=...`
- [ ] Print the local test command: `npx supabase functions serve extract-bill --env-file supabase/.env`
- [ ] Build `src/lib/ai/groqClient.js` — a thin wrapper that calls the deployed function via `supabase.functions.invoke('extract-bill', ...)`, never calling Groq directly from the browser.
- [ ] Build the **bill-upload dialog**: photo capture/upload → loading state ("reading your bill…") → pre-filled, editable review form from the extracted JSON → on submit, writes one `bill_uploads` row and one linked `energy_entries` row. On any failure (network, malformed response, low confidence), fall back to the same manual form from Milestone 2 with nothing pre-filled — never a dead end.
- [ ] **Checkpoint:** upload a real electricity bill photo; confirm the review form pre-fills correctly and the resulting ledger row has `entry_source = 'ocr'` and `bill_upload_id` set; also confirm the manual-fallback path still works if you force an error (e.g. temporarily unset the secret).

## Milestone 4 — Derived metrics + benchmark seed data

- [ ] Draft `supabase/migrations/0003_derived_and_benchmarks.sql`:
  - The trigger/function from DATABASE.md § 9 that recomputes cost-per-output-unit and CO₂-per-output-unit whenever `energy_entries` or `output_records` change.
  - Seed rows for `co2_emission_factors` — find and cite real published emission factors (e.g. India CEA grid emission factor, standard diesel/petrol/kerosene combustion factors) in the `source` column. Do not invent numbers.
  - Seed a small number of `sector_benchmarks` rows for the sectors the pitch names (printing, textile, small metal/fabrication) — again, cited sources in the `source` column. If a real, defensible number can't be found for a sector in the time available, leave that sector's row out rather than fabricate one, and note the gap in HANDOVER.md.
- [ ] **STOP — Database-First Rule.** Present the migration (including the actual seed values and their sources for the user to sanity-check). Wait for confirmation.
- [ ] Build `features/outputRecords/api.js` and a simple form for the owner to log output volume per period (needed before per-output-unit metrics mean anything).
- [ ] Build `features/benchmarks/api.js`: `match_sector_benchmark(business_id)` call and a view showing the business's own numbers next to the matched benchmark.
- [ ] **Checkpoint:** log an output record, confirm the ledger view now shows real ₹/unit and CO₂/unit figures, and confirm the benchmark comparison view shows both numbers side by side with the benchmark's source visible.

## Milestone 5 — OpenRouter recommendation engine (generate-recommendations Edge Function)

Prerequisite: user has completed SETUP.md § 3 and set `OPENROUTER_API_KEY`.

- [ ] Print the scaffold command: `npx supabase functions new generate-recommendations`
- [ ] Implement `supabase/functions/generate-recommendations/index.ts`: takes a `business_id`, pulls its normalized ledger + matched benchmark row + machines, calls OpenRouter (`AI_REASONING_MODEL` env var, default to a `:free`-suffixed model) with a prompt that requires structured JSON output (title, category, description, estimated savings, and — critically — the `basis` object citing which numbers drove the recommendation). Validate the JSON server-side before returning it.
- [ ] Print the secret-setting command for the user: `npx supabase secrets set OPENROUTER_API_KEY=...`
- [ ] Build `src/lib/ai/openRouterClient.js` (same pattern as `groqClient.js` — thin wrapper over `supabase.functions.invoke`).
- [ ] Build `features/recommendations/`: a "Generate recommendations" action, a list view showing open recommendations with their `basis` visible/expandable, and dismiss/act actions that update `status` (never delete).
- [ ] **Checkpoint:** with at least one real energy entry and one matched benchmark in place, generate a recommendation and confirm it cites real numbers from the ledger/benchmark, not invented ones.

## Milestone 6 — Dashboard

- [ ] Build `features/dashboard/`: energy mix breakdown (from `energy_entries`, grouped by `source_type`), the ledger's headline cost/CO₂-per-output-unit numbers, and the top 3 open recommendations by `estimated_savings_amount`.
- [ ] Use `recharts` for the mix breakdown; keep it to one or two charts total per the lean UI/UX Rule — this is a phone-first dashboard, not a BI tool.
- [ ] **Checkpoint:** a fresh demo account, walked through onboarding → one bill photo → one manual fuel entry → one output record → one generated recommendation, produces a dashboard that tells a complete, truthful story with no placeholder numbers anywhere.

## Milestone 7 — Build verification & deploy prep

- [ ] Print `npm run lint` and `npm run build`; both must pass clean before this is considered done.
- [ ] Write the HANDOVER.md update for this pass: what's built, what's Phase 2 (deferred), any benchmark sectors still missing real data, any known Groq/OpenRouter rate-limit risk for the live demo.
- [ ] If time remains before Phase 2 work starts: confirm with the user whether to proceed to Phase 2 (fuller recommendation engine, PDF export, richer dashboard) or stop here for the demo.

---

## Non-negotiables that apply across every milestone above

- No fabricated numbers anywhere (benchmarks, OCR results, recommendations) — see AGENTS.md § 2 and § 23, and DATABASE.md § 15.
- Every AI/OCR call has a working manual-entry fallback in the UI before it's considered done.
- Every migration is presented, never executed, by the agent.
- Every terminal command is printed, never run, by the agent.
- If a milestone's checkpoint fails, fix it before moving to the next milestone — do not stack unverified work.

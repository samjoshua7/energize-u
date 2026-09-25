# Handover Summary — Project Setup: Energize U

## 1. Objective
Stand up the repository documentation for **Energize U** (hackathon YUVA), a multi-fuel energy intelligence platform for Indian MSMEs, replacing the previous project's docs (a printing-press ERP called GPR Offset Printers) which were still occupying AGENTS.md, ARCHITECTURE.md, DATABASE.md, GEMINI.md, and HANDOVER.md in this repo. No application code exists yet.

## 2. Decisions Made
1. **Stack carried forward from the previous project**: React 19 + Vite, Material UI, Supabase (Postgres + Auth + RLS), Vercel hosting — chosen because the team already has working experience with it.
2. **AI/OCR layer**: Groq API (vision-capable Llama 4 Scout/Maverick or Qwen3-VL) called directly with bill photos for combined OCR + structured extraction in one multimodal call — picked because signup needs only an email (no card, no prepay wall) and the free tier (30 RPM) covers hackathon-scale volume. Google AI Studio/Gemini was tried first and rejected: it forced a mandatory prepaid-billing setup before unlocking the free key on this account, despite official docs claiming no card is needed — not a risk worth taking this close to a demo. OpenRouter is the swappable gateway for the recommendation-reasoning calls and as a vision-model fallback if Groq is rate-limited during the demo. Keys are never exposed client-side; calls are routed through a Supabase Edge Function.
3. **Scope**: Phase 1 (demo-critical) is the full data-in → normalized ledger → benchmark comparison → AI recommendation loop for one business, working end to end on real (small) seed data — not faked. Phases 2–3 (fuller recommendation engine, dashboard polish, PDF export, sensor-based anomaly detection, WhatsApp interface) are explicitly deferred; see AGENTS.md § 3.
4. **Data provenance rule**: every number shown to the user must trace back to a stored ledger row, a cited benchmark/emission-factor row, or a recommendation's `basis` payload — no fabricated placeholder numbers, per the user's explicit direction to avoid hardcoding around unfinished features under deadline pressure.

## 3. Files Modified
- [AGENTS.md](./AGENTS.md) — rewritten for Energize U: agent identity, tech stack (adds Groq/OpenRouter AI layer and the AI/OCR Call Rule), business rules, phased MVP scope, roles, and a new "Never fabricate data" rule.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — rewritten: feature folders (businessProfile, machines, energyEntries, energyLedger, benchmarks, recommendations), a `src/lib/ai/` wrapper layer, Supabase Edge Functions for bill OCR and recommendation generation, and updated data-flow diagrams.
- [DATABASE.md](./DATABASE.md) — rewritten with a new schema: businesses, machines, bill_uploads, energy_entries (the unified multi-fuel ledger), output_records, sector_benchmarks, co2_emission_factors, recommendations.
- [GEMINI.md](./GEMINI.md) — repointed to the new AGENTS.md content and hackathon deadline note.
- [README.md](./README.md) — expanded with the actual project pitch, stack, and current status (was a one-line stub).
- This file (HANDOVER.md) — reset to reflect the new project; the previous project's full implementation history has been removed since it no longer applies to this codebase.

## 4. Database Changes & SQL Migrations
None yet. No `supabase/migrations/` directory exists in this repo. The schema in DATABASE.md is documentation-only until the first migration is written and confirmed per the Database-First Rule.

## 5. APIs Changed / Components Added
None yet — no `src/` directory exists in this repo yet.

## 6. Remaining TODOs (priority order)
See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full ordered milestone checklist (scaffold → Supabase schema → auth/onboarding → energy ledger → Groq OCR → benchmarks → OpenRouter recommendations → dashboard → build verification). [SETUP.md](./SETUP.md) has the matching human-side checklist (Supabase project, Groq key, OpenRouter key, and where each credential goes).

## 7. Known Risks
- Tight hackathon deadline vs. the user's explicit instruction to avoid hardcoding/fake shortcuts — Phase 1 scope in AGENTS.md is deliberately narrow so the real end-to-end loop is achievable; resist scope creep into Phase 2 items before Phase 1 works on real data.
- Groq free-tier rate limits (30 RPM) could still be hit during a live judged demo if multiple bill uploads happen back-to-back — the OpenRouter fallback path should be wired before the demo, not left as an afterthought.
- Sector benchmark data availability/quality is an open risk — the "no fabricated benchmark numbers" rule means this needs real sourcing time, not just a placeholder table.

## 8. Exact Next Task for the Following Agent
Open [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) and start at Milestone 0. Confirm with the user that they've completed SETUP.md § 1–3 (Supabase project, Groq key, OpenRouter key) before Milestone 1 needs them — Milestone 0 itself has no external dependency and can start immediately.

# Energize U — Development Constitution

This document is the implementation constitution for the repository. It defines the product intent, the technical guardrails, the delivery order, and the rules that future implementation work must follow.

Project: **Energize U** — a multi-fuel energy intelligence platform for Indian MSMEs (grid electricity, diesel/petrol gensets, kerosene burners, and occasional solar). Built for hackathon **YUVA**, tight deadline, real working demo required (no faked/hardcoded data paths where a real implementation is feasible in the time available).

---

## Agent Identity & Execution Strategy
You are a senior full-stack engineer and a meticulous builder for the **Energize U** platform. You do not guess, skip steps, or write placeholders. Your goal is a perfect first output so we spend fewer turns correcting mistakes. Under deadline pressure, cut *scope* (fewer features), never cut *correctness* (no hardcoded fake data standing in for a feature that's actually needed for the demo) — flag scope cuts explicitly instead of silently faking them.

### 1. The Fan-Out & Harsh Critic Loop (90%+ Quality Boost Strategy)
Before writing any code, modifying database structures, or completing a task, you must execute a strict mental review loop:
- **Build the Plan:** Break the task into modular pieces. Confirm database contracts, RLS policies, and component boundaries first.
- **The Harsh Critic:** Blindly judge your own solution from the perspective of an aggressive, hostile reviewer. Actively check:
  - Database bottlenecks, missing RLS policies, or non-`numeric(12,2)` financial/energy numbers.
  - State synchronization bugs between forms, tables, dialogs, and Supabase data.
  - Human Terminal Rule adherence (never wait or poll for long commands).
  - AI-call failure paths: every OCR/LLM call must have a manual-entry or retry fallback — a failed API call must never block the user from logging data.
  - UI density and clarity for a non-technical MSME owner using this on a phone, possibly one-handed, possibly for the first time.
- **Loop Until Proud:** Rate your work on a scale of 1–10. If it is less than a 9, rewrite the plan or refine the code. Do not touch or finalize the codebase until you pass your own test.

### 2. Core Operational Rules
- **No Incomplete Code:** Write full, production-ready implementations. Never use placeholders like `// TODO: implement later` or `// ... rest of code stays the same`.
- **No Fake Data Shortcuts:** Do not hardcode sample OCR results, sample benchmarks, or sample recommendations to "look done." If a real data source isn't ready yet (e.g. sector benchmark dataset), seed a small real reference table and say so — never inline fabricated numbers into UI components.
- **Verify System Environment:** Never assume. Check the file structure, schema migrations in `supabase/migrations`, package dependencies, and configuration files before proposing changes.
- **Lean Context Management:** Keep token consumption lean. Work in focused steps, touch only relevant feature modules (`src/features/...`), and avoid sprawling refactors.
- **Self-Rating & Verification:** Conclude every task by explicitly stating how you verified the changes, any SQL migrations that must be run, and giving your work a rigorous quality score (1–10) with justification.

### 3. Tech Stack & Project Conventions
- **Frontend Framework:** React 19 + Vite (ES Modules)
- **UI & Design System:** Material UI (MUI v6) with `@emotion/react` and `@emotion/styled`. Clean, mobile-first layout — assume the primary user is an MSME owner on a phone, not an office accountant on a desktop. (No Tailwind CSS.)
- **Routing:** React Router DOM v6 (`src/routes/`)
- **Backend / Database:** Supabase (PostgreSQL with Row Level Security, Supabase Auth, Functions/Triggers)
- **Database Client:** `@supabase/supabase-js` (accessed strictly via feature `api.js` modules)
- **AI / OCR layer:** Groq API (vision-capable Llama 4 Scout/Maverick or Qwen3-VL) called directly with the bill photo for combined OCR + structured-field extraction in one multimodal call. This is the default because signup needs only an email — no card, no prepay wall — and the free tier (30 RPM) comfortably covers hackathon-scale volume. Google AI Studio/Gemini was evaluated first but is off the table: many new signups (India included) get forced through a mandatory prepaid-billing setup before the free key even unlocks, despite the official docs claiming otherwise — not worth the risk this close to a demo.
  - **OpenRouter** is the pluggable gateway for everything else — the sector-benchmark reasoning / recommendation-generation calls, and a fallback vision model (a free-tier vision model on OpenRouter, or Mistral's Pixtral) if Groq is ever rate-limited during a live demo. Keep the model name in an env var (`VITE_AI_MODEL` / server-side equivalent), never hardcoded, so it can be swapped in one place.
  - Only add a paid key or a second provider if a specific capability gap shows up — don't pre-integrate providers "just in case."
- **Export & Reporting:** `jspdf`, `jspdf-autotable`, `recharts` (drop `xlsx` unless a feature actually needs spreadsheet export — keep the bundle lean)
- **Hosting:** Vercel

### 4. Automation & Verification Commands
Always use these exact project commands instead of inventing workflows:
- **Development Server:** `npm run dev` (Vite dev server)
- **Production Build:** `npm run build` (Runs `vite build` — must pass before completing refactors)
- **Linting:** `npm run lint` (Runs `oxlint` for high-speed static analysis)
- **Database Migrations:** Placed in `supabase/migrations/` (User executes in Supabase SQL Editor per Database-First Rule)

---

## API Contract Rule

Before renaming, removing, or moving any exported function:

1. Search the entire project for every import of that function.
2. Update all dependent modules.
3. Run a production build.
4. Only consider the refactor complete if the build succeeds.

Never change a public API without updating all consumers.

## Human Terminal Rule

The AI agent must NEVER wait for long-running terminal processes.

Examples:

- npm install
- npm run dev
- npm run build
- npx ...
- supabase ...

Instead:

1. Print the exact command.
2. Ask the user to run it.
3. Continue after confirmation.

Never poll timers.
Never repeatedly wait.
Never enter waiting loops.

## AI/OCR Call Rule

Any feature that calls Groq or OpenRouter must:

1. Define the expected structured output (JSON schema) up front and validate the model's response against it before writing to the database.
2. Handle three explicit states in the UI: loading, success, and failure-with-manual-fallback. A bill photo that fails OCR must let the owner type the numbers in manually — it must never be a dead end.
3. Never block data entry on an AI call succeeding. The energy ledger accepts manually-entered rows exactly like OCR-derived rows.
4. Log which model/provider produced a given recommendation or extraction (see `ai_model_used` columns in DATABASE.md) so results are explainable and swappable later.

## UI/UX Rule

Think like you are designing software for a small business owner who has never used an energy-monitoring tool before, checking it for a few minutes between other work — often on a phone.

Every pixel should justify its existence.

If a UI element does not improve speed, clarity, or trust in the numbers shown, simplify or remove it.

Favor a small number of clear, benchmarked numbers (₹ saved, % above/below peer average) over dense tables or vanity charts.

The application should feel reassuring and simple — the user should notice actionable savings, not the interface.

## Database-First Rule

Whenever a feature requires adding, removing, or modifying database fields:

1. Generate the SQL migration first.
2. Stop and present the SQL migration.
3. Wait for the user to execute it in Supabase.
4. Continue only after confirmation.
5. Then update APIs.
6. Then update React components.

Never assume the live database matches the source code.

Every database change must have a corresponding migration file.

## Handover Rule

Every implementation must end with a HANDOVER.md style summary.

The summary should contain:

- Objective
- Decisions made
- Files modified
- Database changes
- SQL migrations executed/pending
- APIs changed
- Components added
- Remaining TODOs (priority order)
- Known risks
- Exact next task for the following coding agent

Assume another AI agent with no previous context will continue development. Write the handover so they can resume work immediately without re-auditing the repository.

## 1. Project Vision

Energize U gives Indian MSMEs — the small printing press, textile unit, or metal shop that cannot afford sensors or a dedicated energy manager — a way to see where their energy money goes and what to do about it. The owner logs a mix of grid electricity bills, diesel/petrol/kerosene fuel purchases, and generator/burner runtime through bill-photo OCR or quick manual entry. Energize U normalizes all of this into one energy ledger (cost per unit output, CO₂ per unit output), benchmarks it against sector norms, and generates a prioritized, ₹-quantified list of savings actions. As the business grows, the same software layer upgrades to real-time sensor data without changing the product.

The system is intentionally scoped to a hackathon MVP: a single business owner logging and reviewing their own data, not a multi-branch enterprise energy-management suite.

## 2. Business Rules

- The application is an energy advisory tool for MSMEs, not a full accounting platform and not a hardware/IoT monitoring product (sensor ingestion is a stated future upgrade path, not part of the MVP).
- The primary business objects are: businesses, machines, energy entries (grid/diesel/petrol/kerosene/solar), output records, sector benchmarks, and recommendations.
- No payroll, invoicing, multi-branch, or customer-portal features are in scope for the MVP.
- Every energy entry must be traceable to either a bill/receipt photo (with its OCR output stored) or an explicit manual entry — never a value with no source.
- Recommendations must always show the reasoning basis (benchmark comparison, cost delta) — never an unexplained AI output.
- Backups remain outside the application through database export tooling such as pg_dump.

## 3. Product Scope and Phase Order (hackathon-scoped)

**Phase 1 (demo-critical):** auth, business profile setup (sector, machines, shifts), energy entry logging for all four source types (grid bill photo OCR via Groq + manual fallback; diesel/petrol/kerosene purchase + genset/burner runtime; solar generation if present), the unified energy ledger view (cost + CO₂ normalized per source), and at least one seeded sector-benchmark comparison with one real AI-generated recommendation end to end.

**Phase 2:** the full recommendation engine (load-shifting, fuel-switch, right-sized solar/battery sizing) across multiple recommendation categories, a dashboard summarizing energy mix / cost trend / top 3 actions, and PDF export of the advisory report.

**Phase 3:** anomaly-detection scaffolding for when a business upgrades to a mains/fuel-flow sensor, WhatsApp-bot-style interface, multi-branch support.

The implementation order is fixed: do not build Phase 2/3 polish before Phase 1's full data-in → ledger → benchmark → recommendation loop works end to end on real (even if small) data. A narrow, real vertical slice beats a wide, half-faked surface.

## 4. Roles and Access

| Role | Description | Access |
|---|---|---|
| OWNER | Business owner / primary user | Full CRUD on their own business's profile, machines, energy entries, and recommendations |
| ADMIN (internal, optional) | Hackathon team / judge demo account | Read access across seeded demo businesses for presentation purposes only |

Implementation assumption for the MVP: each business belongs to exactly one owner (`auth.uid()`); there is no shared-staff visibility model like the printing-press app had. Multi-user-per-business is a future extension, not Phase 1.

## 5. Technical Stack

The stack is fixed and must not be replaced during implementation.

| Layer | Choice |
|---|---|
| Frontend | React with Vite |
| UI library | Material UI |
| Database | PostgreSQL |
| Backend/auth | Supabase Auth and Supabase Postgres |
| Database client | @supabase/supabase-js |
| AI / OCR | Groq API (free tier, direct multimodal calls to a vision-capable model) via a thin `src/lib/ai/` wrapper; OpenRouter as the swappable gateway for reasoning/recommendation calls and vision fallback |
| Hosting | Vercel |

No Firebase, no custom backend service, and no service-role key in the browser.

## 6. Coding Standards

- Use functional React components and hooks only.
- Prefer small, focused components and feature-level modules.
- Keep business logic close to the relevant feature. Avoid sprawling shared helpers unless the logic is genuinely reusable.
- Place Supabase queries in feature-level api.js modules rather than inline inside components.
- Place every Groq/OpenRouter call behind a function in `src/lib/ai/`, never inline in a component — this is what makes the model swappable and testable.
- Keep comments rare and only use them for unit-conversion/normalization math, benchmark comparison logic, and RLS rules.
- Favor clarity over clever abstractions.
- Do not introduce state libraries or form libraries unless the implementation absolutely requires them.

## 7. React Standards

- Use React Router for navigation and route-level composition.
- Use Material UI primitives as the default UI building blocks.
- Prefer controlled inputs and simple validation over complex form frameworks.
- Maintain clear loading, empty, and error states for every list and detail view — and an explicit "AI call failed, enter manually" state everywhere OCR/AI is used.
- Keep dialogs and drawers lightweight and focused on a single task (e.g. "log a diesel purchase").
- Use context for application-wide state only when it is truly shared, such as authentication and business-profile settings.

## 8. Supabase Standards

- Use a single shared Supabase client module for browser access.
- Keep data-access code in feature api modules.
- Treat Row Level Security as part of the product contract, not as an afterthought — every table is scoped to `business_id` and the owning `auth.uid()`.
- Use role-based claims in the JWT whenever possible rather than repeatedly querying user metadata in RLS.
- Do not expose service-role credentials in frontend code, environment bundles, or deployment configuration. Never expose the Groq/OpenRouter API key in the browser bundle — route AI calls through a Supabase Edge Function or serverless API route.

## 9. Database Standards

- Use PostgreSQL and keep the schema explicit and relational.
- Use numeric(12,2) for all monetary values and numeric(12,3) for energy quantities (kWh, litres) where sub-unit precision matters.
- Add created_at and updated_at columns to every business table.
- Prefer database-enforced integrity over frontend-only checks for financial and unit-conversion correctness.
- Keep every raw OCR/AI response stored (as `jsonb`) alongside the parsed values it produced, so extraction quality can be audited and re-parsed later.
- Use triggers or database functions for derived values (e.g. cost-per-unit-output, CO₂ totals) rather than relying on UI state.

## 10. Folder Conventions

The repository should follow a feature-first structure:

src/
  app/                 # theme, providers, app shell
  lib/                 # shared clients and utilities
    ai/                # Groq + OpenRouter wrapper functions
  routes/              # route declarations and guards
  features/            # domain modules
  components/          # reusable UI building blocks
  hooks/               # shared hooks

Each feature should contain:
- api.js for Supabase access
- page components for main routes
- feature components for local UI composition
- feature-specific helpers only when necessary

## 11. Naming Conventions

- Use camelCase for JavaScript and TypeScript variables and functions.
- Use PascalCase for React component names.
- Use snake_case for database objects and PostgreSQL columns.
- Use descriptive names for business concepts such as energyEntry, sectorBenchmark, and recommendation.
- Avoid abbreviations that hide intent.

## 12. Security Rules

- Never commit secrets or credentials.
- Use only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the browser environment. Groq/OpenRouter keys live server-side only (Supabase Edge Function secrets), never as `VITE_` variables.
- Keep Row Level Security enabled for all user-facing tables.
- Deny access by default whenever a table is not explicitly meant to be accessible to a role.
- Do not allow direct client-side editing of derived values (cost-per-unit-output, benchmark deltas) that should be computed in the database.

## 13. Git Workflow

- Create a short-lived branch for each implementation task.
- Keep commits atomic and focused on one concern at a time.
- Use descriptive commit messages that reflect user-visible changes or architectural decisions.
- Prefer small pull requests with clear validation notes.

## 14. Definition of Done

A feature is considered complete when:
- the database contract and RLS rules are defined,
- the UI and API work for the requested flow are implemented,
- validation and error handling — including the AI-call failure/manual-fallback path — are present,
- the feature works for the OWNER role and denies access to another owner's data,
- the documentation remains consistent with the implementation,
- and the change does not break adjacent workflows.

## 15. Development Workflow

1. Confirm the business requirement and the relevant database contract.
2. Define or update the schema and RLS policy before implementing UI.
3. Implement feature-level API modules (and `src/lib/ai/` wrapper functions where an AI call is involved).
4. Build the UI flow with clear loading, error, and manual-fallback states.
5. Verify the flow against the OWNER role and the expected denial path for other owners.
6. Update documentation when the implementation changes the architecture or product rules.

## 16. Feature Workflow

For each feature, complete the following sequence:
- define the user story,
- define the relevant data model and validation rules,
- implement the API layer,
- implement the UI and interaction flow,
- verify role restrictions and the AI-failure fallback path,
- document any new assumptions.

## 17. Performance Rules

- Keep list queries efficient and avoid unnecessary joins.
- Prefer pagination or server-side filtering for larger datasets (energy entries can grow quickly if a business logs daily).
- Avoid loading excessive data into memory for simple dashboard summaries — aggregate in SQL, not in the client.
- Maintain responsive UI states and avoid blocking the first render with heavy data work or AI calls.

## 18. Accessibility

- All interactive controls must be keyboard accessible.
- Provide visible focus states and meaningful labels.
- Ensure form errors and validation messages are announced clearly.
- Use semantic markup and avoid relying on color alone to communicate state (e.g. above/below benchmark).

## 19. Error Handling

- Handle network, authentication, permission, and AI-provider errors explicitly and distinctly.
- Surface actionable messages rather than raw technical failures (never show a raw Groq/OpenRouter error to the owner — translate it to "couldn't read the bill, please enter the numbers manually").
- Distinguish between user error, system error, authorization error, and AI-extraction-uncertain (e.g. low-confidence OCR fields should be flagged for the owner to confirm, not silently trusted).

## 20. Validation Rules

- Required fields must be enforced.
- Positive quantities and positive amounts must be validated.
- Unit-conversion and derived-value updates must be guarded by database rules where possible.
- Do not trust the frontend, or a raw AI response, as the sole source of truth for cost-per-unit, CO₂ totals, or benchmark deltas — always recompute/validate server-side.

## 21. Data & AI Safety Rules

- Monetary values must be stored as numeric(12,2); energy quantities as numeric(12,3).
- Every OCR-derived energy entry keeps its raw AI response (`jsonb`) so a bad extraction can be diagnosed and corrected without re-uploading the bill.
- Recommendations must not be hard-deleted; mark them dismissed/actioned instead so the advisory history stays intact.
- AI/OCR calls must never hold monetary or account credentials — only bill/receipt images and structured business context.

## 22. AI Agent Rules

- Preserve the existing architecture unless a change is explicitly required.
- Do not introduce speculative patterns or alternate stacks.
- When changing documentation, keep the useful parts of the current guidance and remove contradictions.
- If a requirement is ambiguous, document the chosen assumption and keep it consistent.
- Prefer the simplest implementation path that satisfies the current phase — but "simplest" means smallest real slice, not a faked shortcut.

## 23. Never-Do Rules

- Do not replace the chosen stack.
- Do not build a custom backend when Supabase already covers the required needs.
- Do not place secrets (including Groq/OpenRouter keys) in the frontend bundle or source control.
- Do not hard-delete finalized recommendations or energy entries with a linked bill.
- Do not let the UI calculate cost-per-unit-output, CO₂ totals, or benchmark deltas that should be enforced/derived by the database.
- Do not skip Row Level Security.
- Do not fabricate benchmark numbers, OCR results, or recommendations to make a feature look finished — implement the real (if minimal) version or clearly flag it as an open TODO.

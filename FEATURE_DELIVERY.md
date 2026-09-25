# Complete energy workflows

Desktop-first web application, responsive on owners' phones, with installable PWA support. This is the accepted feature scope, not a record of completed implementation.

## Database checkpoint

Run `supabase/migrations/0004_complete_energy_workflows.sql` in the Supabase SQL Editor after the existing migrations (0001–0003, or their combined equivalent). Run once. It is transactional: an error rolls back the migration. Do not rerun the old combined script.

The migration adds setup fields, bill metadata, recommendation effort, tariff reference storage, private receipt storage policies, and an owner-scoped period report. Existing records are preserved. It accommodates the two different policy naming conventions in the existing migration paths. Composite owner-link constraints apply to new writes; old links remain unvalidated until audited. Receipt-linked entries must be archived rather than deleted. Business deletion is disabled to prevent cascading loss of bill history.

No SQL has been executed by the agent. No dependent API or React changes for this feature expansion have been made yet, as required by AGENTS.md's Database-First Rule. PostgreSQL is not available locally, so live migration and RLS validation remain required.

## Audit findings

- Auth auto-provisions invented business details and can substitute a fake business after a database error.
- Feature APIs treat failed writes as successful local records. Some reads fall back to local records without business filtering.
- Onboarding starts with invented machine and consumption values. Solar capacity is not represented in the existing schema.
- Receipt saving currently stores a filename, not an uploaded object; historical photos cannot reliably be retrieved.
- Reporting combines all-time energy with the latest production record. Legacy summary RPC runs as security definer without checking the owner.
- Benchmark RPC and its client fallback can select an unrelated industry. Existing reference citations lack enough evidence to verify their numeric values.
- Dedicated benchmark and emissions routes are absent. There is no web manifest or service worker. Page metadata disables user zoom.

## Implementation sequence after migration confirmation

1. Data reliability and setup: remove silent production fallbacks; distinguish explicit demo mode; preserve API exports and update all consumers where contracts change. Route new users through setup without invented defaults. Store output base unit plus scale (prints / 1000), generator fuel and kVA, solar capacity, state, DISCOM and tariff category. Optional bill upload must support manual review and retry.
2. Ledger and bills: upload receipt images to private storage using business UUID/random UUID paths; use signed URLs for history. Save parsed fields, extraction mode, raw provider response and model. Paginate and filter entries; distinguish purchase date from billing period. Archive linked receipts; never silently lose user input on errors.
3. Dashboard: month selector; dominant monthly cost and cost-per-output metrics; cost-share mix; weekly cost-per-output trend; source-based emissions; one evidence-based insight. Use the new period RPC. Daily allocation of monthly bills is an explicit estimate, not measured weekly usage. Compare generator/grid electrical costs only when generator electrical output is known; fuel thermal energy is not electrical output.
4. Benchmarks: dedicated route, matched sector and base output unit, consistent scale, comparison chart and visible reference provenance. Remove client fallback to arbitrary rows. Verify existing citations or replace them with explicitly constructed demo reference data; never present unverified values as published peer averages. No percentile without a peer distribution.
5. Recommendations: savings-prioritized actions, effort, status, expandable formulas/inputs/assumptions and provider attribution. Validate structured responses. A failed recommendation call must not block logging. Use actual operating data; machine age alone does not prove inefficiency.
6. Emissions: source breakdown and factor citations, scope and national-average fallback labels. Verify factors against primary publications before adding equivalencies. Tree equivalence needs a cited annual absorption assumption and matching time basis. Solar sizing needs a documented yield assumption and load constraint; do not imply solar replaces outage backup without storage.
7. Navigation/design/PWA: coherent desktop sidebar and workspace; responsive phone navigation and forms; accessible zoom and controls. Add manifest/icons/install affordance, service worker and honest offline state. Do not cache private API responses or queue financial writes silently.

## Deliberate data limits

- Tariff references start empty. State alone is insufficient: DISCOM, customer category, voltage, dates and slabs matter. Use confirmed bill rates while a suitable dated reference is unavailable.
- Current grid emission factors are national, not state-specific. Location selection must not imply otherwise.
- Fake OCR is explicitly user-authorized for demos only. Label it simulated and require review; never mix simulated extraction into real saved data without explicit user action.
- Optional 6–7 PM outage alerts are deferred: current records have dates and total runtime, not timestamped outage events. Do not infer hourly patterns from them.

## Verification gates

After SQL: verify owner A can read/write its data and owner B cannot; verify reporting RPCs and receipt access follow the same restriction. Check cross-owner receipt/machine links fail. Check a bill spanning two months is allocated proportionally, quantities use the selected output scale, missing factors remain unknown, and weekly totals reconcile with the selected period.

After implementation: setup → bill/manual entry → ledger → benchmark → recommendation using real persisted records; retry/failure/manual fallback paths; photo reload; dashboard period changes; desktop and mobile layouts; keyboard navigation; install and offline launch. User runs `npm run build` under the Human Terminal Rule. No lint script currently exists.

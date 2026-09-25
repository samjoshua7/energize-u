# Architecture Guide

This document explains the software architecture for Energize U, the multi-fuel MSME energy intelligence platform. It is intended to guide implementation and future maintenance without introducing a different stack or a custom backend.

## 1. Application Architecture

The application is a React single-page application built with Vite and Material UI, hosted on Vercel. It uses Supabase for authentication, PostgreSQL storage, and Row Level Security. All business data is stored in PostgreSQL, and the browser interacts with Supabase using the public anonymous key.

AI/OCR calls (Groq for bill-photo extraction, OpenRouter for recommendation reasoning) are **not** called directly from the browser with a raw API key. They are routed through a Supabase Edge Function (or a minimal serverless API route) that holds the provider key server-side and returns validated, structured JSON to the client.

The architecture is intentionally simple:

- the browser renders the UI and captures bill photos / manual entries,
- React routes define the feature entry points,
- feature-level API modules call Supabase,
- an Edge Function mediates AI/OCR calls and returns structured data,
- database triggers and RLS enforce financial, unit-conversion, and access safety.

No custom long-running backend service is required for this phase.

## 2. Architectural Principles

- Keep the database authoritative for derived energy/financial values (cost per unit output, CO₂ totals, benchmark deltas).
- Keep AI calls server-mediated, schema-validated, and always paired with a manual-entry fallback in the UI.
- Keep feature logic close to the feature module.
- Use shared components only for truly reusable UI patterns.
- Keep the routing layer thin and explicit.
- Treat authentication and authorization as first-class concerns.

## 3. Folder Structure

```text
src/
  app/
    App.jsx
    providers/
    theme/
  lib/
    supabaseClient.js
    constants.js
    ai/
      groqClient.js         # thin wrapper calling the Edge Function for bill OCR
      openRouterClient.js   # thin wrapper for recommendation/reasoning calls
      schemas.js            # expected JSON shapes returned by AI calls
  routes/
    index.jsx
    guards/
  features/
    auth/
    businessProfile/
    machines/
    energyEntries/          # bill upload + OCR, manual fuel/runtime logging
    energyLedger/            # unified normalized ledger view
    benchmarks/
    recommendations/
    dashboard/
  components/
    layout/
    tables/
    forms/
    feedback/
  hooks/
    useAuth.js
    usePermissions.js

supabase/
  functions/
    extract-bill/           # Edge Function: receives bill image, calls Groq, returns structured JSON
    generate-recommendations/ # Edge Function: calls OpenRouter with ledger + benchmark data
  migrations/
```

## 4. Feature Architecture

Each feature should follow the same internal structure:

```text
features/<feature>/
  api.js
  page.jsx
  components/
  hooks/ (only if needed)
  utils/ (only if needed)
```

This keeps data-access logic, presentation, and feature-specific helpers in one place.

## 5. Component Architecture

The UI should be composed from small, purpose-driven components.

### Layout hierarchy

```text
AppShell
  ├─ AppHeader
  ├─ SidebarNavigation (or bottom nav on mobile)
  └─ MainContent
       ├─ PageHeader
       ├─ FeaturePage
       │    ├─ ListView
       │    ├─ DetailView
       │    └─ DialogForm (e.g. "Log a diesel purchase", "Upload electricity bill")
       └─ Feedback / Empty / Error / AI-fallback states
```

Shared UI should live in the top-level components folder. Feature-specific presentation should remain inside the feature module.

## 6. Authentication Flow

1. The user (business owner) signs in through Supabase Auth.
2. The application loads the authenticated session from the browser client.
3. On first login, the user completes a business profile (sector, machines, shifts) if none exists yet.
4. Route guards enforce whether the user may view or edit a feature (mainly: do they own the business record being accessed).
5. Database RLS enforces the final authorization boundary, scoped by `business_id` and `auth.uid()`.

The frontend should never assume that UI visibility alone is sufficient protection. RLS remains mandatory.

## 7. Routing

Routes should be organized by feature.

Suggested routing structure:

- /login
- /onboarding (business profile setup)
- /dashboard
- /machines
- /energy/log (upload a bill photo or log a fuel purchase / runtime)
- /energy/ledger (unified normalized view)
- /benchmarks
- /recommendations
- /settings

Protected routes should use route-level guards that verify the session and business ownership before rendering the feature page.

## 8. API Layer

Feature API modules should own Supabase queries and mutations.

Each API module should provide a small, explicit surface:

- list operations,
- retrieve by id,
- create/update/delete or dismiss operations,
- and any role-specific or business-specific logic.

The `energyEntries` feature's API module also calls the `extract-bill` Edge Function (via `src/lib/ai/groqClient.js`) rather than calling Groq directly, and always falls back to accepting a manually-entered row if that call fails or the owner edits the extracted fields.

The `recommendations` feature's API module calls the `generate-recommendations` Edge Function (via `src/lib/ai/openRouterClient.js`), passing the business's normalized ledger and the matched sector benchmark row, and stores the model's structured output alongside which model produced it.

The API layer should not contain large UI concerns such as dialog state or form validation logic. It should focus on data access and domain rules that are safe to express in the client.

## 9. React Hooks

Reusable hooks should stay small and focused. Suggested hooks:

- useAuth for session state,
- useBusinessProfile for the current owner's business context,
- usePermissions for role-based UI gates,
- useAsyncList for loading and error states.

Do not introduce a global state library for this project.

## 10. Reusable Components

Reusable components should be generic enough to be used by multiple features. Examples:

- DataTable
- StatusChip (e.g. above/below benchmark, OCR confidence)
- ConfirmDialog
- EmptyState
- ErrorAlert
- AiFallbackPrompt (shown when an OCR/AI call fails — "couldn't read this, enter manually")
- PageHeader
- FormField
- NumberField / UnitField (kWh, litres, KVA aware)

Feature-specific UI should remain within the feature module.

## 11. State Management

The application should use a combination of:

- React local state for form and dialog state,
- context for shared user/session/business-profile state,
- and server state from Supabase for entities and lists.

No Redux or other external state library is required.

## 12. Supabase Interaction

Supabase access should be centralized in a shared client module:

```text
src/lib/supabaseClient.js
```

This module should expose the initialized client and any reusable helper functions. Feature modules call it rather than constructing their own clients.

## 13. Error Handling

The UI should distinguish between:

- network errors,
- authentication errors,
- authorization errors,
- validation errors,
- AI/OCR provider errors (translated to a friendly "couldn't read this automatically" message with a manual-entry path),
- and business-rule violations.

Each feature should provide clear empty, loading, and error states. Energy/financial operations should never silently fail, and an AI failure should never be a dead end for the user.

## 14. Loading Strategy

The initial experience should remain responsive. The application should render shell UI quickly and load data progressively.

Recommended approach:

- show skeletons or simple placeholders on initial data queries,
- show a distinct "reading your bill…" loading state for OCR calls, separate from ordinary data loading,
- display empty states when no records exist,
- keep lists lightweight and paginated where needed.

## 15. Caching

Caching should stay minimal. The current scale does not require a complex caching layer.

Recommended defaults:

- rely on Supabase query results for current data,
- use React state for transient UI state,
- avoid aggressive client-side caching for financial/energy data,
- cache sector benchmark rows briefly client-side since they change rarely, to avoid refetching them on every ledger view.

## 16. Pagination and Large Lists

For larger lists or later growth, the UI should use server-side filtering and pagination rather than loading all records at once — this matters for `energy_entries`, which can grow quickly if a business logs daily fuel purchases.

## 17. Dialogs and Forms

Dialogs should be lightweight and focused on a single action, such as "upload an electricity bill" or "log a diesel purchase."

Forms should use controlled inputs and simple validation rules. The bill-upload dialog should show the OCR-extracted fields as editable, pre-filled inputs — never as read-only values the owner can't correct.

## 18. Validation

Validation should be implemented in two layers:

- UI validation for usability, including flagging low-confidence OCR fields for the owner to double-check,
- database constraints and triggers for correctness.

The database is the final authority for financial and unit-conversion integrity.

## 19. Data Flow Diagrams

### Bill-photo ingestion flow

```text
Owner -> Upload bill photo -> energyEntries API -> extract-bill Edge Function
                                                  -> Groq (multimodal OCR + extraction)
                                                  -> validated JSON returned to client
       -> Owner reviews/edits pre-filled form -> energyEntries API -> Supabase -> PostgreSQL
                                                                    -> Trigger normalizes into energy_entries
                                                                    -> Ledger view refreshes
```

### Manual fuel/runtime logging flow

```text
Owner -> Fuel/runtime form -> energyEntries API -> Supabase -> PostgreSQL
                                                 -> Trigger normalizes into unified ledger
                                                 -> Ledger view refreshes
```

### Recommendation generation flow

```text
Ledger + business profile -> recommendations API -> generate-recommendations Edge Function
                                                   -> matches sector_benchmarks row
                                                   -> OpenRouter reasoning call
                                                   -> validated structured recommendations
                           -> Supabase -> PostgreSQL (recommendations table, model_used recorded)
                           -> Dashboard/recommendations view refreshes
```

## 20. Module Dependency Diagram

```text
AppShell
  -> AuthProvider
  -> BusinessProfileProvider
  -> Router
  -> Feature Pages
       -> Feature API modules
       -> src/lib/ai/* wrappers (for energyEntries, recommendations)
       -> Shared UI components
       -> Shared hooks
       -> Supabase client
```

## 21. Future Scalability

The current architecture is appropriate for a single-owner MSME using manual/photo-based logging. As the business (or the product) grows, the project can evolve by adding:

- a `sensor_readings` ingestion path once a business adds a mains/fuel-flow sensor, feeding the same `energy_entries` normalization layer instead of a parallel system,
- anomaly detection over sensor-fed entries,
- multi-user-per-business support,
- a WhatsApp-bot front end reusing the existing feature APIs,
- richer sector-benchmark datasets and regional tariff-slab awareness.

That growth should be handled incrementally rather than by introducing a different architecture upfront.

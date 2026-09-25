# Energize U — Implementation Handover

## Objective
Execute the comprehensive design overhaul and full feature set mandated in [DESIGN.md](file:///d:/Git/energize-u/DESIGN.md) and [FEATURES.md](file:///d:/Git/energize-u/FEATURES.md):
1. **Design System & Visual Identity:** Transform the UI from a generic SaaS card-grid layout to an **analog utility meter crossed with a well-kept ledger**.
   - Custom palette: `--color-bg: #14181D`, `--color-surface: #1C222A`, `--color-ink: #EDEAE3`, `--color-ink-muted: #A7ACB3`, `--color-amber: #D98E2E`, `--color-sage: #6E9B7B`, `--color-rust: #C1553A`, and `--color-line: rgba(237, 234, 227, 0.12)`.
   - Typography contract: `IBM Plex Sans` for UI labels, prose, and sentence-case headers; `IBM Plex Mono` for **every single numerical value** (currency ₹, kWh/L, percentages, dates, kVA ratings).
   - Layout rules: Flat **ledger-row pattern** with hairline dividers (`--color-line`); 4px radius panels strictly reserved for dialogs, forms, and the "Show the math" box. Zero drop shadows.
   - Analog Motion: Headline cost-per-unit metric features an ease-out count-up (~600ms), and bill uploads feature a meter needle pulse shimmer (`.meter-needle-pulse`).

2. **Core Feature Specification:**
   - **Onboarding / Setup (`/onboarding`):** Sequential steps (1, 2) with industry output units, genset kVA sizes, solar status, and bill photo upload.
   - **Home / Unified Dashboard (`/`):** Unboxed 52px cost-per-unit hero metric with count-up, 4-week sparkline, single-line sharp insight banner, flat ledger rows with hairline dividers, horizontal stacked fuel mix bar, and top 3 prioritized actions.
   - **Unified Energy Ledger (`/ledger`):** Strict chronological ledger rows, tabular monospace figures, source icons, "+ Log fuel purchase", and audited bill dialog.
   - **Sector Benchmarks (`/benchmarks`):** Side-by-side Recharts bar chart, upfront BEE/AIFMP audit citations note, and flat ledger-row comparison table.
   - **Advisory & Recommendations (`/recommendations`):** Flat ledger rows separated by hairline dividers, amber savings in monospace, 4px square Low/Medium/High effort badges, and expandable "Show the math" arithmetic panel.
   - **Decarbonisation & Emissions (`/emissions`):** Horizontal CO₂ breakdown by source (diesel in rust, solar in sage), CEA v19 & IPCC citations, tree equivalence, and load-matched rooftop solar sizing.
   - **Simulator (`/simulator`):** Interactive operational adjustment sliders (genset shift, solar kW, peak load shift, motor upgrades) with live projected impact and 1-click synthetic benchmark loader.
   - **Facility Profile & Machinery (`/profile`):** 4px raised panels, sentence case, monospace power ratings, and 4px Add Machine dialog.
   - **Energy Logging & Bill OCR (`/upload`):** Dual scan vs manual fallback panels with 4px borders and design tokens.
   - **Live Energy Assistant:** Styled floating drawer with theme tokens and live ledger context.

---

## Decisions Made
1. **Ledger Over Card Grid:** Eliminated bloated cards with heavy shadows in favor of compact, high-density ledger rows with hairline dividers (`rgba(237, 234, 227, 0.12)`) and unboxed hero metrics.
2. **Monospace Strictness:** Every numerical value without exception renders using `IBM Plex Mono` (`var(--font-mono)` / `.mono` / `.num`), ensuring tabular figure alignment.
3. **Restrained Color Palette:** Strict enforcement of a single amber accent (`#D98E2E`), with muted sage (`#6E9B7B`) for savings/solar and muted rust (`#C1553A`) for cost-leaks/diesel intensity.
4. **Transparent Math & Citations:** All recommendations provide exact formulas, step-by-step arithmetic, and official citations (CEA Baseline Database v19, IPCC 2006, BEE MSME Cluster Studies, AIFMP 2024).
5. **Robust Fallbacks:** Bill upload OCR is accompanied by zero-friction manual entry dialogs, ensuring no user flow is blocked.

---

## Files Modified & Added
- `index.html`: Loaded Google Fonts `IBM Plex Sans` and `IBM Plex Mono`.
- `src/app/theme/tokens.css`: Created CSS variables, `.mono`, `.num`, `.meter-needle-pulse`, and animation keyframes.
- `src/main.jsx`: Imported `tokens.css`.
- `src/app/theme/theme.js` & `ThemeModeContext.jsx`: Applied 4px radius, `#14181D` background, `#1C222A` surface, `#D98E2E` primary, and removed shadows.
- `src/components/layout/AppShell.jsx`: Applied analog meter branding, amber needle indicator, and navigation styling.
- `src/components/assistant/EnergyAssistant.jsx`: Updated to 4px border radius and design tokens.
- `src/features/dashboard/DashboardPage.jsx`: Refactored to unboxed hero count-up, sparkline, insight banner, stacked mix bar, and flat ledger rows.
- `src/features/dashboard/DashboardProfileProgressCard.jsx`: Refactored to 4px surface box with design tokens.
- `src/features/benchmarks/BenchmarkComparisonCard.jsx`: Refactored to 4px surface box with monospace numbers and sentence case.
- `src/features/energyLedger/LedgerPage.jsx`: Refactored to flat ledger-row pattern with tabular monospace figures.
- `src/features/benchmarks/BenchmarkPage.jsx`: Recharts bar chart, upfront citation note, and flat ledger comparison table.
- `src/features/recommendations/RecommendationsPage.jsx`: Ledger-row action list, amber monospace figures, 4px effort badges, and "Show the math" box.
- `src/features/emissions/EmissionsPage.jsx`: Horizontal CO₂ bar chart, official citations, and load-matched solar sizing.
- `src/features/simulator/SimulatorPage.jsx`: Interactive scenario simulator with 4px panels and live projected impact.
- `src/features/energyEntries/UploadPage.jsx`: Dual scan / manual panels with 4px radius and design tokens.
- `src/features/energyEntries/BillUploadDialog.jsx`: Analog meter needle shimmer loading state and monospace inputs.
- `src/features/energyEntries/ManualEntryDialog.jsx`: 4px surface dialog with monospace number inputs.
- `src/features/outputRecords/OutputRecordDialog.jsx`: 4px surface dialog with monospace inputs.
- `src/features/machines/QuickAddMachineDialog.jsx`: 4px surface dialog with monospace inputs (restored return statement).
- `src/features/businessProfile/OnboardingPage.jsx`: Sequential step wizard (1, 2) with 4px panels and design tokens.
- `src/features/businessProfile/ProfilePage.jsx`: Facility profile and machinery inventory refactored to 4px surface panels and monospace figures.
- `src/features/auth/LoginPage.jsx`: 4px surface card with meter branding and design tokens.

---

## Database Changes
- No schema changes required. All features utilize the existing PostgreSQL tables (`businesses`, `machines`, `energy_entries`, `output_records`, `sector_benchmarks`, `recommendations`).

---

## SQL Migrations Executed / Pending
- None pending.

---

## APIs Changed
- All API contracts remain intact (`getEnergyEntries`, `getMatchedBenchmark`, `getRecommendations`, `getEmissionFactors`, `createMachine`, `createEnergyEntry`, `createOutputRecord`).

---

## Components Added / Updated
- `src/app/theme/tokens.css` (Added)
- `src/features/benchmarks/BenchmarkPage.jsx` (Added)
- `src/features/emissions/EmissionsPage.jsx` (Added)
- All main feature pages and dialogs updated to conform to [DESIGN.md](file:///d:/Git/energize-u/DESIGN.md).

---

## Remaining TODOs (Priority Order)
1. **Production Build Verification:** User executes `npm run build` in PowerShell to verify zero JSX/bundle errors.
2. **Live Presentation Run-through:** Walk through the end-to-end flow: Onboarding -> Dashboard (count-up hero) -> Ledger -> Benchmarks -> Recommendations ("Show the math") -> Emissions -> Simulator.

---

## Known Risks
- Dev server is running in the background (`start_all.bat`). Do not run commands that block or create port conflicts.

---

## Exact Next Task for the Following Coding Agent
- Prompt the user to run `npm run build` to confirm production build output passes cleanly. Once confirmed, the implementation is 100% complete and ready for hackathon demonstration.

# Design System — Energize U

Read this before writing any UI component. Every screen in FEATURES.md is built against these tokens and principles — no ad-hoc colors, no default MUI theme, no component that isn't traceable to a decision made here.

## Why this direction (not a generic SaaS dashboard)

Energize U's subject is a physical thing: a small manufacturer's electricity meter, diesel drum, and paper ledger. The user's own family runs a printing press — a business built on ink, paper, and precise per-unit cost tracking. The design should feel like a **well-kept ledger crossed with an analog utility meter**, not a generic fintech/SaaS dashboard. That's the one idea every visual choice below serves.

Reject on sight: rounded-card grids with identical drop shadows, a cream-and-terracotta palette, a near-black-and-neon-green palette, ALL-CAPS tracked eyebrow labels, middle-dot metadata strings, arrows appended to button text. None of that has anything to do with meters or ledgers.

## Color

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#14181D` | App background — charcoal-navy, like a meter housing, not pure black |
| `--color-surface` | `#1C222A` | Raised panels (dialogs, the recommendation "show your work" panel) |
| `--color-ink` | `#EDEAE3` | Primary text — warm off-white, paper-toned |
| `--color-ink-muted` | `#A7ACB3` | Secondary text, captions, source citations |
| `--color-amber` | `#D98E2E` | The one accent. Reserved for: the single hero number per page, primary buttons, active nav state. Evokes an analog meter dial/needle. Never used decoratively or on more than one element per screen. |
| `--color-sage` | `#6E9B7B` | Positive/savings/below-benchmark states. Muted, not a bright "success green." |
| `--color-rust` | `#C1553A` | Cost-leak/above-benchmark/alert states. Muted clay-red, not a saturated error red. |
| `--color-line` | `rgba(237,234,227,0.12)` | Hairline dividers between ledger rows — the layout's main structural device |

Define these as CSS custom properties on `:root` in one place (`src/app/theme/tokens.css` or the MUI theme's palette) — never inline hex values in components.

## Type

- **IBM Plex Sans** — all UI text, labels, body copy, navigation. Chosen because Plex was designed as an engineering/utility typeface family — it has the right personality for a tool about meters and ledgers, and it isn't the default Inter/system-font every generated app reaches for.
- **IBM Plex Mono** — every number, without exception: ₹ amounts, kWh/litre quantities, percentages, dates in the ledger table, KVA ratings. This is the single most important typographic decision in the app: putting every figure in a monospaced, tabular-feeling face makes the product's numbers read as *measured*, not decorative — which is the whole trust proposition of an energy-advisory tool. Load both from Google Fonts (already an allowed font host).
- Type scale: follow a modest, disciplined scale (e.g. 13 / 15 / 18 / 24 / 40px) rather than a dramatic display size — the one exception is the dashboard's hero cost-per-unit number, which is the single place allowed to go large (48–56px, Plex Mono, amber).
- Sentence case everywhere. No ALL-CAPS labels, no letter-spacing tricks standing in for hierarchy.
- Line length under 80 characters for any prose (onboarding help text, recommendation descriptions).

## Layout concept

Not a card grid. The primary structural device is the **ledger row**: left-aligned content separated by hairline dividers (`--color-line`), echoing a printed accounts book. Use this pattern for the energy log, the recommendations list, and the benchmark comparison — anywhere there's a list of comparable items.

```
┌───────────────────────────────────────────┐
│  12 Sep   Grid electricity   ₹4,210        │  ← ledger row
├───────────────────────────────────────────┤
│  10 Sep   Diesel (genset)    ₹1,860        │
├───────────────────────────────────────────┤
│  08 Sep   Diesel (genset)    ₹1,640        │
└───────────────────────────────────────────┘
```

Reserve actual bordered panels (small 4px radius, `--color-surface` background, no shadow) for exactly one purpose: the recommendation "show your work" expandable panel and dialogs/forms. This differentiates *reference/actionable content* (a bordered panel) from *ledger data* (a flat divided row) — a deliberate distinction, not decoration.

The dashboard's hero metric (cost-per-unit-output) gets its own full-width, unboxed treatment at the top of the page — no card around it. It's the one place the design is allowed to be bold; everything else stays quiet.

Numbered markers (1, 2, 3…) are only used where content is genuinely sequential — the onboarding steps. Do not use them on the dashboard or recommendations list, which are not sequences.

## Motion

One orchestrated moment per page, not scattered hover effects. Specifically:

- **Dashboard load**: the hero cost-per-unit number counts up from 0 to its real value once, like a meter powering on (~600ms, ease-out). Nothing else on the page animates on load.
- **Recommendation "show your work"**: an expand/collapse transition on click (this is motion that answers a user action, which is welcome).
- **Bill upload "reading bill…" state**: a simple, calm pulsing/shimmer on the loading state — not a spinner borrowed from a generic component library; style it to feel like a meter needle settling.
- Everywhere else: no fade-slide-up entrances, no hover-lift on every row. Respect `prefers-reduced-motion`.

## Responsiveness

Mobile-first, always — the owner is checking this on a phone between other work (per AGENTS.md's UI/UX Rule). Breakpoints:
- Base (< 600px): single column, bottom navigation bar (not a sidebar), ledger rows stack date/source/amount vertically where needed.
- ≥ 900px (tablet/desktop, secondary target): sidebar navigation, ledger rows go fully horizontal, dashboard can show the mix chart beside the hero number instead of below it.

## Accessibility floor (non-negotiable, not a nice-to-have)

- Visible keyboard focus ring on every interactive element (use `--color-amber` at reduced opacity, not the browser default).
- Color is never the only signal — a below/above-benchmark state gets an icon or label text, not just sage/rust coloring.
- All form fields have real labels (not placeholder-as-label).
- Contrast: `--color-ink` on `--color-bg` and `--color-surface` must meet WCAG AA at minimum — verify before shipping.

## Self-critique checklist (apply before calling any screen done)

- Is there more than one loud element on this screen? If so, quiet one down.
- Does any card here look like it came from a generic component-library kit (uniform radius + soft shadow, regardless of what it contains)? If so, replace it with a ledger row or a plain panel per the rules above.
- Is every number on screen in Plex Mono? If not, fix it — this is the app's core visual signature.
- Would this screen still make sense on a 375px-wide phone, one-handed, in sunlight? If not, simplify.

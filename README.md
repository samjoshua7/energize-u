# Energize U

Hackathon project for **YUVA** — a multi-fuel energy intelligence platform for India's MSMEs (small manufacturers, printing presses, textile units, workshops) that run on a mix of grid electricity, diesel/petrol generators, kerosene burners, and occasional rooftop solar.

## The problem

Real-time energy monitoring today exists only for large factories that can afford sensors and dedicated staff. A small MSME owner has no visibility into where their energy money goes, no peer benchmark, and no starting point for cutting costs — and most of them don't run on clean grid electricity alone in the first place.

## The idea

The owner photographs an electricity bill and logs their fuel purchases and generator/burner runtime — no hardware, no technical team. Energize U:

1. Extracts the bill's numbers automatically (OCR + AI), with a manual-entry fallback that's always available.
2. Normalizes every energy source — grid units, litres of diesel/petrol/kerosene, solar generation — into one comparable ledger (₹ cost and CO₂ per unit of output).
3. Benchmarks that ledger against sector norms.
4. Generates a prioritized, ₹-quantified list of savings actions (load-shifting, fuel-switching, right-sized solar/battery sizing).

As the business grows, a single low-cost sensor upgrades the same software from estimates to real-time measured data — nothing about the product changes, only the data quality feeding it.

## Stack

- React 19 + Vite, Material UI
- Supabase (Postgres, Auth, Row Level Security)
- Groq API for bill-photo OCR + extraction (free tier, vision-capable models), OpenRouter as the swappable gateway for recommendation reasoning
- Vercel hosting

See [AGENTS.md](./AGENTS.md) for the full development constitution, [ARCHITECTURE.md](./ARCHITECTURE.md) for the technical architecture, and [DATABASE.md](./DATABASE.md) for the data model.

Building it? [SETUP.md](./SETUP.md) walks through getting the Supabase/Groq/OpenRouter credentials, and [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) is the ordered build checklist.

## Status

Documentation/planning stage — no application code yet. See [HANDOVER.md](./HANDOVER.md) for the current state and the next task.

# Setup Guide — Energize U (for Joshua, not the agent)

This is the checklist for **you** to do outside the code — creating accounts, generating keys, and telling Antigravity when a manual step is done. The agent cannot do any of this itself (no card details, no clicking through web consoles) — see the Human Terminal Rule and this document's "Handoff points" for exactly when it will stop and wait for you.

Do these roughly in order — IMPLEMENTATION_PLAN.md's milestones assume you've done the matching section here before that milestone starts.

---

## 1. Supabase project

1. Go to **https://supabase.com** → sign in (GitHub login is fastest) → **New project**.
2. Pick an org, name it `energize-u`, set a strong database password — **save this password somewhere**, you'll need it if you ever connect a DB client directly (not needed for normal app use).
3. Region: pick **Mumbai (ap-south-1)** — lowest latency for an India-based app and demo.
4. Wait ~2 minutes for provisioning.
5. Once it's ready, go to **Project Settings → Data API** (older UIs call this "API"):
   - Copy **Project URL** → this is `VITE_SUPABASE_URL`
   - Copy the **`anon` `public`** key → this is `VITE_SUPABASE_ANON_KEY`
   - Copy the **`service_role`** key too → this is `SUPABASE_SERVICE_ROLE_KEY`. **Never** put this one in `.env.local` or any `VITE_`-prefixed variable — it's server-only (see § 4 below).

## 2. Groq API key (bill OCR)

1. Go to **https://console.groq.com** → sign up with just an email (no card, ever, for the free tier).
2. Go to **https://console.groq.com/keys** → **Create API Key** → name it `energize-u` → copy it immediately (Groq only shows it once — if you lose it, delete and make a new one, it's free to redo).
3. This is `GROQ_API_KEY`.

## 3. OpenRouter API key (recommendation reasoning + vision fallback)

1. Go to **https://openrouter.ai** → sign up.
2. Go to **Keys** (top right, under your account) → **Create Key** → name it `energize-u`.
3. While you're there, set a **credit limit of $0** on the key if the option is offered — that hard-blocks any accidental spend and forces it to only use `:free`-suffixed models. If it errors out on a paid-only model, that's the safety working correctly — tell the agent and it'll swap the model name in the env var, no code change needed.
4. This is `OPENROUTER_API_KEY`.

## 4. Where each credential goes

Two different places, depending on whether the code that uses it runs **in the browser** or **on Supabase's servers**:

| Variable | Goes in | Why |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` (project root) | Safe to expose in the browser — it's just an address |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` (project root) | Safe to expose — RLS policies are what actually protect the data, not this key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets (never `.env.local`, never committed) | Bypasses RLS entirely — if this leaks, anyone can read/write every business's data |
| `GROQ_API_KEY` | Supabase Edge Function secrets | Server-only — never shipped to the browser |
| `OPENROUTER_API_KEY` | Supabase Edge Function secrets | Server-only — never shipped to the browser |

**`.env.local`** — the agent will create a `.env.example` with the exact variable names (no real values). Copy it: `cp .env.example .env.local`, then paste your two Supabase values in. This file is gitignored — never commit it.

**Edge Function secrets** — these live on Supabase's servers, not in your repo. Once the Supabase CLI is set up (Milestone in the plan), you (not the agent, per the Human Terminal Rule) run:

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-value-here
npx supabase secrets set GROQ_API_KEY=your-value-here
npx supabase secrets set OPENROUTER_API_KEY=your-value-here
```

The agent will tell you exactly when to run these and with which values, per the Human Terminal Rule — it will never ask you to paste a secret into chat with it either; you run the command yourself in your terminal.

For **local testing** of Edge Functions (`npx supabase functions serve`), the same three secrets also need to go in `supabase/.env` (also gitignored) — the agent will create the template for this file too.

## 5. Handoff points — when the agent will stop and wait for you

Per AGENTS.md's Database-First Rule and Human Terminal Rule, the agent will pause at these points. Don't skip ahead of it:

- **Every SQL migration**: it writes the `.sql` file and shows it to you, but does **not** run it. You paste it into **Supabase Dashboard → SQL Editor → run**, then tell the agent "done" or paste any error back.
- **Every `npm install`, `npm run dev`, `npm run build`, `npx supabase ...` command**: it prints the exact command; you run it in your terminal and report the result (success, or paste the error).
- **Creating the Supabase project itself, and generating each API key above**: entirely manual, on your side — the agent has no access to any of these consoles.

## 6. When you deploy (later, not Milestone 1)

Vercel needs the same variables set in **Project Settings → Environment Variables**:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — same as local.
- The three secret keys are **not** needed in Vercel at all if all AI calls go through Supabase Edge Functions (the intended architecture) — Vercel only ever hosts the static frontend. If a later decision moves any AI call to a Vercel serverless function instead, add that specific key there too, server-side only, at that time.

---

Once §1–§3 are done and `.env.local` is filled in, tell the agent — that's the trigger for it to start Milestone 1 in IMPLEMENTATION_PLAN.md.

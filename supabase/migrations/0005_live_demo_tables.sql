-- Live Demo: power state, events, consumption tables
-- Run in Supabase SQL Editor

BEGIN;

-- Current power source states (one row per source per account)
CREATE TABLE IF NOT EXISTS public.power_state (
  id            SERIAL PRIMARY KEY,
  account_id    TEXT        NOT NULL,
  source        TEXT        NOT NULL CHECK (source IN ('grid', 'genset', 'solar')),
  status        TEXT        NOT NULL CHECK (status IN ('on', 'off')) DEFAULT 'on',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, source)
);

-- Per-event consumption log (written when an event closes)
CREATE TABLE IF NOT EXISTS public.consumption_log (
  id            SERIAL PRIMARY KEY,
  account_id    TEXT        NOT NULL,
  source        TEXT        NOT NULL,
  amount        NUMERIC(12,3) NOT NULL,
  unit          TEXT        NOT NULL DEFAULT 'kWh',
  cost          NUMERIC(12,2) NOT NULL,
  co2_kg        NUMERIC(12,3) NOT NULL DEFAULT 0,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discrete events (grid outages, genset runs, etc.)
CREATE TABLE IF NOT EXISTS public.events (
  id                SERIAL PRIMARY KEY,
  account_id        TEXT        NOT NULL,
  event_type        TEXT        NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER,
  cost_incurred     NUMERIC(12,2),
  diesel_litres     NUMERIC(12,3),
  co2_kg            NUMERIC(12,3),
  metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_events_account    ON public.events (account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_state_acct  ON public.power_state (account_id);
CREATE INDEX IF NOT EXISTS idx_consumption_acct  ON public.consumption_log (account_id, logged_at DESC);

-- RLS (backend uses direct postgres connection which bypasses RLS,
-- but Supabase requires it enabled on every table)
ALTER TABLE public.power_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.power_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.consumption_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed the demo account's initial power state
INSERT INTO public.power_state (account_id, source, status)
VALUES
  ('demo-msme-01', 'grid',   'on'),
  ('demo-msme-01', 'genset', 'off'),
  ('demo-msme-01', 'solar',  'off')
ON CONFLICT (account_id, source) DO NOTHING;

COMMIT;

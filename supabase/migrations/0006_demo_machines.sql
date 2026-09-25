-- Demo machines + consumption log for live simulation
-- Run in Supabase SQL Editor

BEGIN;

CREATE TABLE IF NOT EXISTS public.demo_machines (
  id                    SERIAL PRIMARY KEY,
  account_id            TEXT        NOT NULL,
  name                  TEXT        NOT NULL,
  base_power_kw         NUMERIC(8,2)  NOT NULL DEFAULT 5,
  current_load_percent  INTEGER     NOT NULL DEFAULT 0 CHECK (current_load_percent >= 0 AND current_load_percent <= 100),
  status                TEXT        NOT NULL DEFAULT 'off' CHECK (status IN ('running', 'idle', 'off')),
  cost_today            NUMERIC(12,2) NOT NULL DEFAULT 0,
  kwh_today             NUMERIC(12,3) NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, name)
);

CREATE TABLE IF NOT EXISTS public.machine_consumption_log (
  id              SERIAL PRIMARY KEY,
  machine_id      INTEGER       NOT NULL REFERENCES public.demo_machines(id) ON DELETE CASCADE,
  logged_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  power_draw_kw   NUMERIC(8,3)  NOT NULL,
  cost_accrued    NUMERIC(12,4) NOT NULL,
  load_percent    INTEGER       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_machines_acct ON public.demo_machines(account_id);
CREATE INDEX IF NOT EXISTS idx_mcl_machine_ts ON public.machine_consumption_log(machine_id, logged_at DESC);

-- RLS
ALTER TABLE public.demo_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_consumption_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_machines_anon" ON public.demo_machines FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "demo_machines_auth" ON public.demo_machines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mcl_anon" ON public.machine_consumption_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "mcl_auth" ON public.machine_consumption_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed demo machines for account demo-msme-01
INSERT INTO public.demo_machines (account_id, name, base_power_kw, status, current_load_percent)
VALUES
  ('demo-msme-01', 'Offset Printing Press', 15.0, 'running', 60),
  ('demo-msme-01', 'Cutting Machine',        7.5, 'running', 40),
  ('demo-msme-01', 'Paper Dryer',           12.0, 'idle',     0),
  ('demo-msme-01', 'Air Compressor',         5.5, 'running', 75),
  ('demo-msme-01', 'Lamination Unit',        8.0, 'off',      0)
ON CONFLICT (account_id, name) DO NOTHING;

COMMIT;

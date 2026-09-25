require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Constants ────────────────────────────────────────────────────────
const DIESEL_RATE_L_PER_HOUR = 1.2;
const DIESEL_COST_PER_LITRE  = 90;         // ₹
const GRID_LOAD_KW           = 10;         // average plant draw
const GRID_COST_PER_KWH      = 8;          // ₹
const GENSET_CO2_KG_PER_L    = 2.68;       // IPCC diesel
const GRID_CO2_KG_PER_KWH    = 0.82;       // CEA India 2023

// ─── Postgres ─────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// ─── Health check (Render needs this) ─────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/simulate/grid-toggle
// Body: { account_id, status: "on" | "off" }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/simulate/grid-toggle', async (req, res) => {
  const { account_id = 'demo-msme-01', status } = req.body;

  if (!['on', 'off'].includes(status)) {
    return res.status(400).json({ error: 'status must be "on" or "off"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const now = new Date();

    if (status === 'off') {
      // ── Grid going DOWN ─────────────────────────────────────────────
      // 1. Flip grid off, genset on
      await client.query(
        `INSERT INTO power_state (account_id, source, status, updated_at)
         VALUES ($1, 'grid', 'off', $2)
         ON CONFLICT (account_id, source)
         DO UPDATE SET status = 'off', updated_at = $2`,
        [account_id, now]
      );
      await client.query(
        `INSERT INTO power_state (account_id, source, status, updated_at)
         VALUES ($1, 'genset', 'on', $2)
         ON CONFLICT (account_id, source)
         DO UPDATE SET status = 'on', updated_at = $2`,
        [account_id, now]
      );

      // 2. Open two events
      await client.query(
        `INSERT INTO events (account_id, event_type, started_at)
         VALUES ($1, 'grid_outage', $2)`,
        [account_id, now]
      );
      await client.query(
        `INSERT INTO events (account_id, event_type, started_at)
         VALUES ($1, 'genset_on', $2)`,
        [account_id, now]
      );

      await client.query('COMMIT');
      return res.json({
        ok: true,
        message: 'Grid offline — genset auto-started',
        grid: 'off',
        genset: 'on',
        timestamp: now.toISOString(),
      });

    } else {
      // ── Grid coming BACK ────────────────────────────────────────────
      // 1. Close open grid_outage event
      const { rows: outageRows } = await client.query(
        `UPDATE events
         SET ended_at = $2,
             duration_seconds = EXTRACT(EPOCH FROM ($2::timestamptz - started_at))::int
         WHERE account_id = $1
           AND event_type = 'grid_outage'
           AND ended_at IS NULL
         RETURNING *`,
        [account_id, now]
      );

      // 2. Close open genset_on event, compute diesel + cost
      const { rows: gensetRows } = await client.query(
        `SELECT * FROM events
         WHERE account_id = $1
           AND event_type = 'genset_on'
           AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        [account_id]
      );

      let dieselUsed = 0;
      let gensetCost = 0;
      let gensetCo2 = 0;
      let durationSec = 0;

      if (gensetRows.length > 0) {
        const gensetEvent = gensetRows[0];
        durationSec = Math.round((now - new Date(gensetEvent.started_at)) / 1000);
        const hours = durationSec / 3600;
        dieselUsed = parseFloat((hours * DIESEL_RATE_L_PER_HOUR).toFixed(3));
        gensetCost = parseFloat((dieselUsed * DIESEL_COST_PER_LITRE).toFixed(2));
        gensetCo2  = parseFloat((dieselUsed * GENSET_CO2_KG_PER_L).toFixed(3));

        await client.query(
          `UPDATE events
           SET ended_at = $2,
               duration_seconds = $3,
               cost_incurred = $4,
               diesel_litres = $5,
               co2_kg = $6
           WHERE id = $7`,
          [account_id, now, durationSec, gensetCost, dieselUsed, gensetCo2, gensetEvent.id]
        );

        // 3. Write consumption log
        await client.query(
          `INSERT INTO consumption_log (account_id, source, amount, unit, cost, co2_kg, logged_at)
           VALUES ($1, 'diesel', $2, 'litres', $3, $4, $5)`,
          [account_id, dieselUsed, gensetCost, gensetCo2, now]
        );
      }

      // 4. Create "grid_restored" and "genset_off" events
      await client.query(
        `INSERT INTO events (account_id, event_type, started_at, ended_at, duration_seconds)
         VALUES ($1, 'grid_restored', $2, $2, 0)`,
        [account_id, now]
      );
      await client.query(
        `INSERT INTO events (account_id, event_type, started_at, ended_at, duration_seconds)
         VALUES ($1, 'genset_off', $2, $2, 0)`,
        [account_id, now]
      );

      // 5. Flip states
      await client.query(
        `UPDATE power_state SET status = 'on', updated_at = $2
         WHERE account_id = $1 AND source = 'grid'`,
        [account_id, now]
      );
      await client.query(
        `UPDATE power_state SET status = 'off', updated_at = $2
         WHERE account_id = $1 AND source = 'genset'`,
        [account_id, now]
      );

      await client.query('COMMIT');
      return res.json({
        ok: true,
        message: `Grid restored — genset stopped (ran ${durationSec}s, used ${dieselUsed}L diesel, cost ₹${gensetCost})`,
        grid: 'on',
        genset: 'off',
        duration_seconds: durationSec,
        diesel_litres: dieselUsed,
        cost_incurred: gensetCost,
        co2_kg: gensetCo2,
        timestamp: now.toISOString(),
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('grid-toggle error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    client.release();
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/status/:account_id
// Returns current snapshot: power states + running totals today
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/status/:account_id', async (req, res) => {
  const { account_id } = req.params;
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  try {
    // 1. Current power states
    const { rows: states } = await pool.query(
      `SELECT source, status, updated_at FROM power_state
       WHERE account_id = $1`,
      [account_id]
    );
    const stateMap = {};
    for (const s of states) stateMap[s.source] = s;

    const gridStatus   = stateMap.grid?.status   || 'on';
    const gensetStatus = stateMap.genset?.status  || 'off';
    const solarStatus  = stateMap.solar?.status   || 'off';

    // 2. Sum completed events today
    const { rows: [todaySums] } = await pool.query(
      `SELECT
         COALESCE(SUM(cost_incurred), 0)  AS genset_cost,
         COALESCE(SUM(diesel_litres), 0)  AS diesel_litres,
         COALESCE(SUM(co2_kg), 0)         AS genset_co2,
         COALESCE(SUM(duration_seconds),0) AS genset_seconds
       FROM events
       WHERE account_id = $1
         AND event_type = 'genset_on'
         AND ended_at IS NOT NULL
         AND started_at >= $2`,
      [account_id, todayStart]
    );

    // 3. If genset is currently running, compute live running cost
    let runningDiesel = 0;
    let runningCost = 0;
    let runningCo2 = 0;
    let runningSeconds = 0;

    if (gensetStatus === 'on') {
      const { rows: openGenset } = await pool.query(
        `SELECT started_at FROM events
         WHERE account_id = $1
           AND event_type = 'genset_on'
           AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        [account_id]
      );
      if (openGenset.length > 0) {
        runningSeconds = Math.round((now - new Date(openGenset[0].started_at)) / 1000);
        const hours = runningSeconds / 3600;
        runningDiesel = parseFloat((hours * DIESEL_RATE_L_PER_HOUR).toFixed(3));
        runningCost   = parseFloat((runningDiesel * DIESEL_COST_PER_LITRE).toFixed(2));
        runningCo2    = parseFloat((runningDiesel * GENSET_CO2_KG_PER_L).toFixed(3));
      }
    }

    // 4. Estimate grid cost today (time grid was ON * rate)
    //    Simple: total seconds today minus genset seconds = grid seconds
    const elapsedToday = Math.round((now - todayStart) / 1000);
    const totalGensetSec = parseFloat(todaySums.genset_seconds) + runningSeconds;
    const gridSeconds = Math.max(0, elapsedToday - totalGensetSec);
    const gridHours   = gridSeconds / 3600;
    const gridKwh     = parseFloat((gridHours * GRID_LOAD_KW).toFixed(3));
    const gridCost    = parseFloat((gridKwh * GRID_COST_PER_KWH).toFixed(2));
    const gridCo2     = parseFloat((gridKwh * GRID_CO2_KG_PER_KWH).toFixed(3));

    const totalGensetCost  = parseFloat(todaySums.genset_cost)  + runningCost;
    const totalDiesel      = parseFloat(todaySums.diesel_litres) + runningDiesel;
    const totalGensetCo2   = parseFloat(todaySums.genset_co2)   + runningCo2;
    const totalCost        = gridCost + totalGensetCost;
    const totalCo2         = gridCo2  + totalGensetCo2;

    // 5. Latest event
    const { rows: [latestEvent] } = await pool.query(
      `SELECT * FROM events
       WHERE account_id = $1
       ORDER BY started_at DESC LIMIT 1`,
      [account_id]
    );

    return res.json({
      timestamp: now.toISOString(),
      grid:   { status: gridStatus,   since: stateMap.grid?.updated_at   },
      genset: { status: gensetStatus, since: stateMap.genset?.updated_at },
      solar:  { status: solarStatus,  since: stateMap.solar?.updated_at  },
      today: {
        total_cost:    parseFloat(totalCost.toFixed(2)),
        grid_cost:     gridCost,
        genset_cost:   parseFloat(totalGensetCost.toFixed(2)),
        diesel_litres: parseFloat(totalDiesel.toFixed(3)),
        grid_kwh:      gridKwh,
        co2_kg:        parseFloat(totalCo2.toFixed(3)),
        grid_co2_kg:   gridCo2,
        genset_co2_kg: parseFloat(totalGensetCo2.toFixed(3)),
      },
      genset_running: gensetStatus === 'on' ? {
        running_seconds: runningSeconds,
        diesel_so_far:   runningDiesel,
        cost_so_far:     runningCost,
      } : null,
      latest_event: latestEvent || null,
      constants: {
        diesel_rate_l_per_hour: DIESEL_RATE_L_PER_HOUR,
        diesel_cost_per_litre:  DIESEL_COST_PER_LITRE,
        grid_load_kw:           GRID_LOAD_KW,
        grid_cost_per_kwh:      GRID_COST_PER_KWH,
      },
    });
  } catch (err) {
    console.error('status error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/events/:account_id
// Returns recent event history for the outage log feed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/events/:account_id', async (req, res) => {
  const { account_id } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  try {
    const { rows } = await pool.query(
      `SELECT * FROM events
       WHERE account_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [account_id, limit]
    );
    return res.json({ events: rows, count: rows.length });
  } catch (err) {
    console.error('events error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/simulate/reset  (utility: clear today's data for re-demo)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/simulate/reset', async (req, res) => {
  const { account_id = 'demo-msme-01' } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM events WHERE account_id = $1', [account_id]);
    await client.query('DELETE FROM consumption_log WHERE account_id = $1', [account_id]);
    await client.query(
      `UPDATE power_state SET status = CASE source WHEN 'grid' THEN 'on' ELSE 'off' END, updated_at = NOW()
       WHERE account_id = $1`,
      [account_id]
    );
    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Demo data reset' });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Reset failed', detail: err.message });
  } finally {
    client.release();
  }
});

// ─── Start ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`⚡ Energize backend listening on port ${PORT}`);
});

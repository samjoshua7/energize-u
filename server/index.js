import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local and supabase/.env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../supabase/.env') })

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '25mb' })) // Allow large bill photo uploads

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const groqApiKey = process.env.GROQ_API_KEY || ''
const openRouterApiKey = process.env.OPENROUTER_API_KEY || ''
const aiVisionModel = process.env.AI_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
const aiReasoningModel = process.env.AI_REASONING_MODEL || ''

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Energize U Node Backend',
    groqConfigured: Boolean(groqApiKey),
    openRouterConfigured: Boolean(openRouterApiKey),
    supabaseConfigured: Boolean(supabase),
    timestamp: new Date().toISOString(),
  })
})

// 2. Demo Instant Login (Bypasses email confirmation via Supabase Admin API)
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    const demoEmail = 'owner@energize-u.com'
    const demoPassword = 'DemoPassword123!'

    if (supabase) {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      })

      if (!signInError && signInData.session) {
        return res.json({ success: true, session: signInData.session, user: signInData.user })
      }

      // If user doesn't exist yet, create with email_confirm: true using service role
      try {
        await supabase.auth.admin.createUser({
          email: demoEmail,
          password: demoPassword,
          email_confirm: true,
        })
      } catch (err) {
        console.warn('createUser notice:', err.message)
      }

      // Now sign in
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      })

      if (loginError) {
        // If password login still fails, create a session directly via admin
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: demoEmail,
        })
        if (!linkErr && linkData?.properties?.action_link) {
          return res.json({ success: true, redirect: linkData.properties.action_link })
        }
        throw loginError
      }

      return res.json({ success: true, session: loginData.session, user: loginData.user })
    }

    return res.json({
      success: true,
      session: { access_token: 'demo-token', refresh_token: 'demo-refresh' },
      user: { id: '00000000-0000-0000-0000-000000000001', email: demoEmail },
    })
  } catch (err) {
    console.error('[demo-login error]:', err)
    return res.status(500).json({ error: err.message || 'Demo login failed' })
  }
})

// 2. Groq Multimodal Bill OCR Endpoint
app.post('/api/extract-bill', async (req, res) => {
  try {
    const { imageBase64, businessId } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body' })
    }

    if (!groqApiKey) {
      return res.status(500).json({
        error: 'GROQ_API_KEY is not configured in supabase/.env. Please check your credentials.',
      })
    }

    const systemPrompt = `You are an expert OCR & financial data extraction agent specialized in Indian electricity bills (e.g. MSEDCL, BESCOM, TNEB, UPPCL, Tata Power).
Extract the following information from the provided bill image and return ONLY a valid JSON object:
{
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "quantity": <number of total kWh units consumed, numeric only>,
  "quantity_unit": "kWh",
  "cost_amount": <total net bill amount in INR, numeric only>,
  "kva_load": <connected load / sanction load / max demand in KVA or KW, or null if not found>,
  "confidence": <float between 0.0 and 1.0 indicating OCR confidence>,
  "consumer_number": <consumer / account ID as string, or null>,
  "discom_name": <electricity distribution company name, or null>
}
Rules:
1. Return ONLY the raw JSON object. Do not include markdown codeblocks or extra explanations.
2. If billing dates only mention a month (e.g. August 2024), use the 1st and last day of that month.
3. Validate that quantity is positive and cost_amount is non-negative.`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiVisionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract electricity bill data into strict JSON.' },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:')
                    ? imageBase64
                    : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    if (!groqResponse.ok) {
      const errText = await groqResponse.text()
      console.error('[Groq OCR API Error]:', errText)
      return res.status(502).json({
        error: `Groq OCR failed (${groqResponse.statusText}): ${errText}`,
      })
    }

    const groqJson = await groqResponse.json()
    const content = groqJson.choices?.[0]?.message?.content || '{}'
    const extraction = JSON.parse(content)

    return res.json({
      success: true,
      extraction,
      model: aiVisionModel,
      businessId,
    })
  } catch (err) {
    console.error('[extract-bill exception]:', err)
    return res.status(500).json({ error: err.message || 'Internal server error during bill OCR' })
  }
})

// 3. OpenRouter Recommendation Engine Endpoint
app.post('/api/generate-recommendations', async (req, res) => {
  try {
    const { businessId } = req.body

    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId in request body' })
    }

    if (!openRouterApiKey || !aiReasoningModel) {
      return res.status(500).json({
        error: 'OPENROUTER_API_KEY and AI_REASONING_MODEL must be configured in supabase/.env.',
      })
    }

    let business = null
    let machines = []
    let entries = []
    let benchmark = null

    if (supabase) {
      const [bizRes, macRes, entRes, bchRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('business_id', businessId).maybeSingle(),
        supabase.from('machines').select('*').eq('business_id', businessId),
        supabase.from('energy_entries').select('*').eq('business_id', businessId).order('period_end', { ascending: false }).limit(20),
        supabase.from('sector_benchmarks').select('*').limit(1).maybeSingle(),
      ])

      business = bizRes.data
      machines = macRes.data || []
      entries = entRes.data || []
      benchmark = bchRes.data
    }

    const promptContext = {
      business: {
        name: business?.name || 'MSME Unit',
        sector: business?.sector || 'printing',
        state: business?.location_state || 'Maharashtra',
        shift_pattern: business?.shift_pattern || 'single_shift',
        has_solar: business?.has_solar || false,
      },
      machines,
      recent_ledger_entries: entries,
      sector_benchmark: benchmark,
    }

    const systemPrompt = `You are a certified Indian MSME Energy Auditor.
Analyze the business's actual energy ledger, fuel sources, machine inventory, and sector benchmarks.
Generate 2 to 3 realistic, actionable, and mathematically grounded energy-saving recommendations.
Every recommendation MUST have a "basis" object citing exact ledger entries, machine names, or benchmark numbers. NEVER invent baseline figures.

Return ONLY a JSON object with this shape:
{
  "recommendations": [
    {
      "category": "load_shift" | "fuel_switch" | "solar_sizing" | "machine_efficiency" | "other",
      "title": "<Concise action title, e.g. Shift High-Demand Offset Printing to Off-Peak Slabs>",
      "description": "<Practical, plain-English explanation tailored to an Indian MSME owner>",
      "estimated_savings_amount": <estimated INR monthly savings as a positive number>,
      "estimated_savings_pct": <estimated % reduction in energy cost, 1 to 50>,
      "basis": {
        "benchmark_comparison": "<How their numbers compare to sector benchmark>",
        "fuel_delta": "<Cost difference per kWh/unit between grid and genset fuel>",
        "machines_involved": ["<machine name>"]
      }
    }
  ]
}`

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://energize-u.app',
        'X-Title': 'Energize U MSME Platform',
      },
      body: JSON.stringify({
        model: aiReasoningModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(promptContext) },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text()
      console.error('[OpenRouter API Error]:', errText)
      return res.status(502).json({
        error: `OpenRouter call failed (${openRouterResponse.statusText}): ${errText}`,
      })
    }

    const openRouterJson = await openRouterResponse.json()
    const content = openRouterJson.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return res.json({
      success: true,
      recommendations: parsed.recommendations || [],
      model: aiReasoningModel,
    })
  } catch (err) {
    console.error('[generate-recommendations exception]:', err)
    return res.status(500).json({ error: err.message || 'Internal server error during recommendations' })
  }
})

// 4. Energy Assistant Endpoint
app.post('/api/energy-chat', async (req, res) => {
  try {
    const { businessId, message, history = [] } = req.body

    if (!businessId || !message?.trim()) {
      return res.status(400).json({ error: 'businessId and message are required' })
    }
    if (!openRouterApiKey || !aiReasoningModel) {
      return res.status(503).json({ error: 'The energy assistant is not configured yet.' })
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Live business data is unavailable.' })
    }

    const [businessRes, machinesRes, entriesRes, outputRes, recommendationsRes, benchmarkRes] = await Promise.all([
      supabase.from('businesses').select('*').eq('business_id', businessId).maybeSingle(),
      supabase.from('machines').select('*').eq('business_id', businessId),
      supabase.from('energy_entries').select('*').eq('business_id', businessId).order('period_end', { ascending: false }).limit(40),
      supabase.from('output_records').select('*').eq('business_id', businessId).order('period_end', { ascending: false }).limit(6),
      supabase.from('recommendations').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(6),
      supabase.from('sector_benchmarks').select('*').limit(1).maybeSingle(),
    ])

    const dataContext = {
      business: businessRes.data,
      machines: machinesRes.data || [],
      energy_entries: entriesRes.data || [],
      output_records: outputRes.data || [],
      recommendations: recommendationsRes.data || [],
      sector_benchmark: benchmarkRes.data,
    }

    const systemPrompt = `You are Energize U's energy analyst for an Indian MSME owner. Answer in concise, plain English.
Use only the supplied business data. Do not invent prices, usage, savings, benchmarks, machines, dates, or recommendations.
If the data is insufficient, say exactly what is missing and suggest the smallest next logging action.
You can explain trends, compare logged energy sources, summarize existing recommendations, and suggest questions for an energy audit.
Never claim to have changed data or run an action. Keep answers practical and under 180 words.`

    const safeHistory = Array.isArray(history)
      ? history.slice(-8).filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      : []

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://energize-u.app',
        'X-Title': 'Energize U MSME Platform',
      },
      body: JSON.stringify({
        model: aiReasoningModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: `Current verified data:\n${JSON.stringify(dataContext)}` },
          ...safeHistory,
          { role: 'user', content: message.trim() },
        ],
        temperature: 0.2,
      }),
    })

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text()
      console.error('[OpenRouter Chat API Error]:', errText)
      return res.status(502).json({ error: 'The energy assistant could not respond right now.' })
    }

    const openRouterJson = await openRouterResponse.json()
    const reply = openRouterJson.choices?.[0]?.message?.content?.trim()
    if (!reply) return res.status(502).json({ error: 'The energy assistant returned an empty response.' })

    return res.json({ success: true, reply, model: aiReasoningModel })
  } catch (err) {
    console.error('[energy-chat exception]:', err)
    return res.status(500).json({ error: 'The energy assistant is temporarily unavailable.' })
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. LIVE DEMO — Two-device simulation (grid outage/genset toggling)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DIESEL_RATE_L_PER_HOUR = 1.2
const DIESEL_COST_PER_LITRE  = 90          // ₹
const GRID_LOAD_KW           = 10          // average plant draw
const GRID_COST_PER_KWH      = 8           // ₹
const GENSET_CO2_KG_PER_L    = 2.68        // IPCC diesel
const GRID_CO2_KG_PER_KWH    = 0.82        // CEA India 2023

// POST /api/simulate/grid-toggle  { account_id, status: "on"|"off" }
app.post('/api/simulate/grid-toggle', async (req, res) => {
  const { account_id = 'demo-msme-01', status } = req.body
  if (!['on', 'off'].includes(status)) {
    return res.status(400).json({ error: 'status must be "on" or "off"' })
  }
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  const now = new Date().toISOString()

  try {
    if (status === 'off') {
      // Grid going DOWN — genset auto-starts
      await supabase.from('power_state').upsert(
        { account_id, source: 'grid', status: 'off', updated_at: now },
        { onConflict: 'account_id,source' }
      )
      await supabase.from('power_state').upsert(
        { account_id, source: 'genset', status: 'on', updated_at: now },
        { onConflict: 'account_id,source' }
      )
      await supabase.from('events').insert([
        { account_id, event_type: 'grid_outage', started_at: now },
        { account_id, event_type: 'genset_on', started_at: now },
      ])

      return res.json({
        ok: true,
        message: 'Grid offline — genset auto-started',
        grid: 'off', genset: 'on', timestamp: now,
      })

    } else {
      // Grid coming BACK — close open events, compute diesel cost
      // 1. Close grid_outage
      const { data: openOutages } = await supabase.from('events')
        .select('*')
        .eq('account_id', account_id)
        .eq('event_type', 'grid_outage')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)

      if (openOutages?.length) {
        const dur = Math.round((new Date(now) - new Date(openOutages[0].started_at)) / 1000)
        await supabase.from('events')
          .update({ ended_at: now, duration_seconds: dur })
          .eq('id', openOutages[0].id)
      }

      // 2. Close genset_on — compute diesel + cost
      const { data: openGenset } = await supabase.from('events')
        .select('*')
        .eq('account_id', account_id)
        .eq('event_type', 'genset_on')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)

      let dieselUsed = 0, gensetCost = 0, gensetCo2 = 0, durationSec = 0
      if (openGenset?.length) {
        const evt = openGenset[0]
        durationSec = Math.round((new Date(now) - new Date(evt.started_at)) / 1000)
        const hours = durationSec / 3600
        dieselUsed = parseFloat((hours * DIESEL_RATE_L_PER_HOUR).toFixed(3))
        gensetCost = parseFloat((dieselUsed * DIESEL_COST_PER_LITRE).toFixed(2))
        gensetCo2  = parseFloat((dieselUsed * GENSET_CO2_KG_PER_L).toFixed(3))

        await supabase.from('events')
          .update({ ended_at: now, duration_seconds: durationSec, cost_incurred: gensetCost, diesel_litres: dieselUsed, co2_kg: gensetCo2 })
          .eq('id', evt.id)

        // Log consumption
        await supabase.from('consumption_log').insert({
          account_id, source: 'diesel', amount: dieselUsed, unit: 'litres', cost: gensetCost, co2_kg: gensetCo2, logged_at: now,
        })
      }

      // 3. Insert restore/off markers
      await supabase.from('events').insert([
        { account_id, event_type: 'grid_restored', started_at: now, ended_at: now, duration_seconds: 0 },
        { account_id, event_type: 'genset_off', started_at: now, ended_at: now, duration_seconds: 0 },
      ])

      // 4. Flip states
      await supabase.from('power_state').upsert(
        { account_id, source: 'grid', status: 'on', updated_at: now },
        { onConflict: 'account_id,source' }
      )
      await supabase.from('power_state').upsert(
        { account_id, source: 'genset', status: 'off', updated_at: now },
        { onConflict: 'account_id,source' }
      )

      return res.json({
        ok: true,
        message: `Grid restored — genset stopped (ran ${durationSec}s, used ${dieselUsed}L diesel, cost ₹${gensetCost})`,
        grid: 'on', genset: 'off',
        duration_seconds: durationSec, diesel_litres: dieselUsed, cost_incurred: gensetCost, co2_kg: gensetCo2,
        timestamp: now,
      })
    }
  } catch (err) {
    console.error('[grid-toggle error]:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/status/:account_id — live snapshot for dashboard polling
app.get('/api/status/:account_id', async (req, res) => {
  const { account_id } = req.params
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  try {
    // 1. Power states
    const { data: states } = await supabase.from('power_state')
      .select('source, status, updated_at')
      .eq('account_id', account_id)

    const stateMap = {}
    for (const s of (states || [])) stateMap[s.source] = s
    const gridStatus   = stateMap.grid?.status   || 'on'
    const gensetStatus = stateMap.genset?.status  || 'off'
    const solarStatus  = stateMap.solar?.status   || 'off'

    // 2. Completed genset events today
    const { data: todayEvents } = await supabase.from('events')
      .select('cost_incurred, diesel_litres, co2_kg, duration_seconds')
      .eq('account_id', account_id)
      .eq('event_type', 'genset_on')
      .not('ended_at', 'is', null)
      .gte('started_at', todayStart.toISOString())

    let gensetCost = 0, dieselLitres = 0, gensetCo2 = 0, gensetSeconds = 0
    for (const e of (todayEvents || [])) {
      gensetCost    += parseFloat(e.cost_incurred || 0)
      dieselLitres  += parseFloat(e.diesel_litres || 0)
      gensetCo2     += parseFloat(e.co2_kg || 0)
      gensetSeconds += parseInt(e.duration_seconds || 0)
    }

    // 3. Running genset cost if currently on
    let runningSeconds = 0, runningDiesel = 0, runningCost = 0, runningCo2 = 0
    if (gensetStatus === 'on') {
      const { data: openG } = await supabase.from('events')
        .select('started_at')
        .eq('account_id', account_id)
        .eq('event_type', 'genset_on')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)

      if (openG?.length) {
        runningSeconds = Math.round((now - new Date(openG[0].started_at)) / 1000)
        const hours = runningSeconds / 3600
        runningDiesel = parseFloat((hours * DIESEL_RATE_L_PER_HOUR).toFixed(3))
        runningCost   = parseFloat((runningDiesel * DIESEL_COST_PER_LITRE).toFixed(2))
        runningCo2    = parseFloat((runningDiesel * GENSET_CO2_KG_PER_L).toFixed(3))
      }
    }

    // 4. Grid cost estimate
    const elapsedToday = Math.round((now - todayStart) / 1000)
    const totalGensetSec = gensetSeconds + runningSeconds
    const gridSeconds = Math.max(0, elapsedToday - totalGensetSec)
    const gridKwh  = parseFloat((gridSeconds / 3600 * GRID_LOAD_KW).toFixed(3))
    const gridCost = parseFloat((gridKwh * GRID_COST_PER_KWH).toFixed(2))
    const gridCo2  = parseFloat((gridKwh * GRID_CO2_KG_PER_KWH).toFixed(3))

    const totalGensetCost = gensetCost + runningCost
    const totalDiesel     = dieselLitres + runningDiesel
    const totalGensetCo2  = gensetCo2 + runningCo2

    // 5. Latest event
    const { data: latestArr } = await supabase.from('events')
      .select('*')
      .eq('account_id', account_id)
      .order('started_at', { ascending: false })
      .limit(1)

    return res.json({
      timestamp: now.toISOString(),
      grid:   { status: gridStatus,   since: stateMap.grid?.updated_at },
      genset: { status: gensetStatus, since: stateMap.genset?.updated_at },
      solar:  { status: solarStatus,  since: stateMap.solar?.updated_at },
      today: {
        total_cost:    parseFloat((gridCost + totalGensetCost).toFixed(2)),
        grid_cost:     gridCost,
        genset_cost:   parseFloat(totalGensetCost.toFixed(2)),
        diesel_litres: parseFloat(totalDiesel.toFixed(3)),
        grid_kwh:      gridKwh,
        co2_kg:        parseFloat((gridCo2 + totalGensetCo2).toFixed(3)),
        grid_co2_kg:   gridCo2,
        genset_co2_kg: parseFloat(totalGensetCo2.toFixed(3)),
      },
      genset_running: gensetStatus === 'on' ? {
        running_seconds: runningSeconds,
        diesel_so_far:   runningDiesel,
        cost_so_far:     runningCost,
      } : null,
      latest_event: latestArr?.[0] || null,
      constants: {
        diesel_rate_l_per_hour: DIESEL_RATE_L_PER_HOUR,
        diesel_cost_per_litre:  DIESEL_COST_PER_LITRE,
        grid_load_kw:           GRID_LOAD_KW,
        grid_cost_per_kwh:      GRID_COST_PER_KWH,
      },
    })
  } catch (err) {
    console.error('[status error]:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/events/:account_id — recent event history
app.get('/api/events/:account_id', async (req, res) => {
  const { account_id } = req.params
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  const limit = Math.min(parseInt(req.query.limit) || 50, 200)
  try {
    const { data, error } = await supabase.from('events')
      .select('*')
      .eq('account_id', account_id)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return res.json({ events: data || [], count: (data || []).length })
  } catch (err) {
    console.error('[events error]:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/simulate/reset — clear demo data for re-demo
app.post('/api/simulate/reset', async (req, res) => {
  const { account_id = 'demo-msme-01' } = req.body
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  try {
    await supabase.from('events').delete().eq('account_id', account_id)
    await supabase.from('consumption_log').delete().eq('account_id', account_id)
    await supabase.from('power_state').upsert([
      { account_id, source: 'grid',   status: 'on',  updated_at: new Date().toISOString() },
      { account_id, source: 'genset', status: 'off', updated_at: new Date().toISOString() },
      { account_id, source: 'solar',  status: 'off', updated_at: new Date().toISOString() },
    ], { onConflict: 'account_id,source' })

    return res.json({ ok: true, message: 'Demo data reset' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[Energize U Backend] Running on http://localhost:${PORT}`)
  console.log(`[Energize U Backend] Groq OCR ready: ${Boolean(groqApiKey)}`)
  console.log(`[Energize U Backend] OpenRouter Advisor ready: ${Boolean(openRouterApiKey)}`)
})


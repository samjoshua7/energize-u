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
const aiReasoningModel = process.env.AI_REASONING_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

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

    if (!openRouterApiKey) {
      return res.status(500).json({
        error: 'OPENROUTER_API_KEY is not configured in supabase/.env. Please check your credentials.',
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

app.listen(PORT, () => {
  console.log(`[Energize U Backend] Running on http://localhost:${PORT}`)
  console.log(`[Energize U Backend] Groq OCR ready: ${Boolean(groqApiKey)}`)
  console.log(`[Energize U Backend] OpenRouter Advisor ready: ${Boolean(openRouterApiKey)}`)
})

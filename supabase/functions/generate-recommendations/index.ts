// Supabase Edge Function: generate-recommendations
// OpenRouter-powered MSME energy optimization advisor

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!openRouterApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY is not set on the server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { businessId } = await req.json()
    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'Missing businessId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // 1. Fetch business context
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('business_id', businessId)
      .single()

    // 2. Fetch machines
    const { data: machines } = await supabase
      .from('machines')
      .select('*')
      .eq('business_id', businessId)

    // 3. Fetch energy ledger summary
    const { data: entries } = await supabase
      .from('energy_entries')
      .select('*')
      .eq('business_id', businessId)
      .order('period_end', { ascending: false })
      .limit(20)

    // 4. Fetch matched benchmark
    const { data: benchmark } = await supabase
      .from('sector_benchmarks')
      .select('*')
      .eq('sector', business?.sector || 'printing')
      .maybeSingle()

    const modelName = Deno.env.get('AI_REASONING_MODEL') || 'meta-llama/llama-3.3-70b-instruct:free'

    const promptContext = {
      business: {
        name: business?.name,
        sector: business?.sector,
        state: business?.location_state,
        shift_pattern: business?.shift_pattern,
        has_solar: business?.has_solar,
      },
      machines: machines || [],
      recent_ledger_entries: entries || [],
      sector_benchmark: benchmark || null,
    }

    const systemPrompt = `You are an expert Indian MSME Energy Consultant.
Analyze the business's actual energy ledger, fuel sources, machine inventory, and sector benchmarks.
Generate 2 to 4 realistic, actionable, and mathematically grounded energy-saving recommendations.
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
        model: modelName,
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
      console.error('OpenRouter error:', errText)
      return new Response(
        JSON.stringify({ error: `OpenRouter call failed: ${openRouterResponse.statusText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openRouterJson = await openRouterResponse.json()
    const content = openRouterJson.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: parsed.recommendations || [],
        model: modelName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Edge Function exception:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error during recommendation generation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

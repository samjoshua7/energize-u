// Supabase Edge Function: extract-bill
// Multimodal Groq OCR for Electricity Bills

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY is not set on the server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { imageBase64, businessId } = await req.json()
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const modelName = Deno.env.get('AI_VISION_MODEL') || 'meta-llama/llama-4-scout-17b-16e-instruct'

    const systemPrompt = `You are a specialized electricity bill OCR and data extraction agent for Indian MSMEs.
Extract the following information from the provided electricity bill image and return ONLY a valid JSON object:
{
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "quantity": <number of total kWh / units consumed>,
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

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract electricity bill data into strict JSON.' },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
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
      console.error('Groq API error:', errText)
      return new Response(
        JSON.stringify({ error: `Groq OCR failed: ${groqResponse.statusText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqJson = await groqResponse.json()
    const content = groqJson.choices?.[0]?.message?.content || '{}'
    const extraction = JSON.parse(content)

    return new Response(
      JSON.stringify({
        success: true,
        extraction,
        model: modelName,
        businessId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Edge Function exception:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error during OCR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

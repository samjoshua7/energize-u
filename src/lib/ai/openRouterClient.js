import { supabase } from '../supabaseClient'
import { validateRecommendationOutput } from './schemas'

/**
 * Triggers recommendation reasoning via Node.js backend (/api/generate-recommendations)
 * with Supabase Edge Function fallback
 * 
 * @param {string} businessId
 * @returns {Promise<{ success: boolean, recommendations?: Array, error?: string }>}
 */
export async function generateRecommendations(businessId) {
  try {
    let recsData = null

    // 1. Try local Node backend API
    try {
      const apiRes = await fetch('/api/generate-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })

      if (apiRes.ok) {
        recsData = await apiRes.json()
      }
    } catch (err) {
      console.warn('[AI/Reasoning] Local backend /api/generate-recommendations unreachable, trying Edge Function:', err)
    }

    // 2. Fallback to Supabase Edge Function
    if (!recsData) {
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: { businessId },
      })
      if (!error && data) {
        recsData = data
      }
    }

    if (!recsData) {
      return {
        success: false,
        error: 'Recommendation engine service unavailable.',
      }
    }

    const recsList = Array.isArray(recsData?.recommendations) ? recsData.recommendations : [recsData]
    const validatedRecs = []

    for (const item of recsList) {
      const validation = validateRecommendationOutput(item)
      if (validation.valid) {
        validatedRecs.push({
          ...validation.data,
          business_id: businessId,
          ai_model_used: recsData?.model || 'meta-llama/llama-3.3-70b-instruct:free',
          status: 'open',
        })
      } else {
        console.warn('[AI/Reasoning] Dropping invalid recommendation:', validation.error, item)
      }
    }

    if (validatedRecs.length === 0) {
      return {
        success: false,
        error: 'No actionable recommendations could be validated from current energy ledger data.',
      }
    }

    return {
      success: true,
      recommendations: validatedRecs,
    }
  } catch (err) {
    console.error('[AI/Reasoning] Unexpected error:', err)
    return {
      success: false,
      error: 'Recommendation engine error. Please try again shortly.',
    }
  }
}

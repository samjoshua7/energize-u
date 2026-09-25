import { supabase } from '../supabaseClient'
import { validateBillExtraction } from './schemas'

/**
 * Extracts structured billing details from a bill photo
 * Calls the Node.js backend (/api/extract-bill) with Supabase Edge Function fallback
 * 
 * @param {File | Blob | string} imageFile - File or base64 data string
 * @param {string} businessId
 * @returns {Promise<{ success: boolean, data?: object, rawResponse?: object, error?: string }>}
 */
export async function extractBillData(imageFile, businessId) {
  try {
    let base64Image = ''

    if (typeof imageFile === 'string') {
      base64Image = imageFile
    } else if (imageFile instanceof Blob || imageFile instanceof File) {
      base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
    } else {
      throw new Error('Invalid image payload provided')
    }

    let extraction = null
    let rawResponse = null
    let modelUsed = 'meta-llama/llama-4-scout-17b-16e-instruct'

    // 1. Try local Node backend API
    try {
      const apiRes = await fetch('/api/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, businessId }),
      })

      if (apiRes.ok) {
        const json = await apiRes.json()
        extraction = json.extraction
        rawResponse = json
        modelUsed = json.model || modelUsed
      }
    } catch (err) {
      console.warn('[AI/OCR] Local backend /api/extract-bill unreachable, trying Edge Function:', err)
    }

    // 2. Fallback to Supabase Edge Function if backend was not reachable
    if (!extraction) {
      const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke('extract-bill', {
        body: { imageBase64: base64Image, businessId },
      })

      if (!edgeError && edgeResponse) {
        extraction = edgeResponse.extraction || edgeResponse
        rawResponse = edgeResponse
        modelUsed = edgeResponse.model || modelUsed
      } else if (edgeError) {
        console.warn('[AI/OCR] Edge function error:', edgeError)
      }
    }

    if (!extraction) {
      return {
        success: false,
        error: 'OCR service unavailable. Please enter details manually.',
      }
    }

    const validation = validateBillExtraction(extraction)

    if (!validation.valid) {
      console.warn('[AI/OCR] Schema validation failed:', validation.error, extraction)
      return {
        success: false,
        rawResponse,
        error: `Could not verify extracted bill data (${validation.error}). Please enter details manually.`,
      }
    }

    return {
      success: true,
      data: validation.data,
      rawResponse,
      modelUsed,
    }
  } catch (err) {
    console.error('[AI/OCR] Unexpected error:', err)
    return {
      success: false,
      error: 'Bill OCR service error. Please enter details manually.',
    }
  }
}

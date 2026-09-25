export async function askEnergyAssistant({ businessId, message, history = [] }) {
  try {
    const response = await fetch('/api/energy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, message, history }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, error: payload.error || 'The energy assistant could not respond.' }
    }

    return { success: true, reply: payload.reply, model: payload.model }
  } catch (error) {
    console.error('[AI/Chat] Request failed:', error)
    return { success: false, error: 'The energy assistant is unavailable. Check the backend and try again.' }
  }
}
/**
 * Live Demo API — talks to the existing Express backend (server/index.js)
 * Locally: Vite proxy forwards /api/* to port 5000
 * Production: VITE_BACKEND_URL points to Render deployment
 */

const BASE = import.meta.env.VITE_BACKEND_URL || ''
const ACCOUNT_ID = 'demo-msme-01'

async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API ${res.status}`)
  }
  return res.json()
}

// ── Grid simulation ──────────────────────────────────────────────────
export const toggleGrid = (status) =>
  apiFetch('/api/simulate/grid-toggle', {
    method: 'POST',
    body: JSON.stringify({ account_id: ACCOUNT_ID, status }),
  })

export const fetchStatus = () =>
  apiFetch(`/api/status/${ACCOUNT_ID}`)

export const fetchEvents = (limit = 50) =>
  apiFetch(`/api/events/${ACCOUNT_ID}?limit=${limit}`)

export const resetDemo = () =>
  apiFetch('/api/simulate/reset', {
    method: 'POST',
    body: JSON.stringify({ account_id: ACCOUNT_ID }),
  })

export const healthCheck = () =>
  apiFetch('/api/health')

// ── Per-machine simulation ───────────────────────────────────────────
export const fetchMachines = () =>
  apiFetch(`/api/machines/${ACCOUNT_ID}`)

export const adjustMachine = (machineId, { load_percent, status }) =>
  apiFetch(`/api/machines/${machineId}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ load_percent, status }),
  })

export const fetchMachineHistory = (machineId, minutes = 5) =>
  apiFetch(`/api/machines/${machineId}/history?minutes=${minutes}`)

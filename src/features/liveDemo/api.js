/**
 * Live Demo API — talks to the Express backend on Render.
 * All functions are plain fetch calls; no Supabase involved.
 */

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ACCOUNT_ID = 'demo-msme-01';

async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}`);
  }
  return res.json();
}

/** Toggle grid on/off — returns new state snapshot */
export function toggleGrid(status) {
  return apiFetch('/api/simulate/grid-toggle', {
    method: 'POST',
    body: JSON.stringify({ account_id: ACCOUNT_ID, status }),
  });
}

/** Get current live status snapshot */
export function fetchStatus() {
  return apiFetch(`/api/status/${ACCOUNT_ID}`);
}

/** Get recent event history */
export function fetchEvents(limit = 50) {
  return apiFetch(`/api/events/${ACCOUNT_ID}?limit=${limit}`);
}

/** Reset all demo data */
export function resetDemo() {
  return apiFetch('/api/simulate/reset', {
    method: 'POST',
    body: JSON.stringify({ account_id: ACCOUNT_ID }),
  });
}

/** Health check (for cold-start detection) */
export function healthCheck() {
  return apiFetch('/api/health');
}

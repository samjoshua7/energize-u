import { supabase } from '../../lib/supabaseClient'

const STORAGE_KEY = 'energize_u_demo_machines'

const DEFAULT_SAMPLE_MACHINES = [
  {
    machine_id: 'mac_press_1',
    business_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Heidelberg Speedmaster 4-Color Press',
    machine_type: 'offset_press',
    primary_fuel: 'grid',
    power_rating_kw: 38,
    age_years: 6,
  },
  {
    machine_id: 'mac_genset_1',
    business_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Kirloskar 62.5 kVA Diesel Generator',
    machine_type: 'genset',
    primary_fuel: 'diesel',
    power_rating_kw: 50,
    age_years: 4,
  },
]

function getLocalMachines() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_MACHINES))
      return DEFAULT_SAMPLE_MACHINES
    }
    return JSON.parse(raw)
  } catch {
    return DEFAULT_SAMPLE_MACHINES
  }
}

function saveLocalMachines(machines) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines))
  } catch (err) {
    console.warn('Local storage write failed:', err)
  }
}

export async function getMachines(businessId) {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('Supabase getMachines fallback to local storage:', err.message)
  }

  return getLocalMachines()
}

export async function createMachine(machineData) {
  const localMachine = {
    machine_id: `mac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...machineData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('machines')
      .insert([machineData])
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase createMachine bypassed due to RLS/Demo:', err.message)
  }

  const machines = getLocalMachines()
  machines.unshift(localMachine)
  saveLocalMachines(machines)
  return localMachine
}

export async function updateMachine(machineId, updates) {
  try {
    const { data, error } = await supabase
      .from('machines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('machine_id', machineId)
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase updateMachine fallback:', err.message)
  }

  const machines = getLocalMachines().map((m) =>
    m.machine_id === machineId ? { ...m, ...updates } : m
  )
  saveLocalMachines(machines)
  return { machine_id: machineId, ...updates }
}

export async function deleteMachine(machineId) {
  try {
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('machine_id', machineId)

    if (!error) return true
  } catch (err) {
    console.warn('Supabase deleteMachine fallback:', err.message)
  }

  const machines = getLocalMachines().filter((m) => m.machine_id !== machineId)
  saveLocalMachines(machines)
  return true
}

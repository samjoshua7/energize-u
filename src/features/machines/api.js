import { supabase } from '../../lib/supabaseClient'

function getLocalMachines(businessId) {
  try {
    const key = `energize_u_machines_${businessId || 'default'}`
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)

    return []
  } catch {
    return []
  }
}

function saveLocalMachines(businessId, machines) {
  try {
    const key = `energize_u_machines_${businessId || 'default'}`
    localStorage.setItem(key, JSON.stringify(machines))
  } catch (err) {
    console.warn('Local storage write failed for machines:', err)
  }
}

export async function getMachines(businessId) {
  if (!businessId) return []

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

  return getLocalMachines(businessId)
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
    console.warn('Supabase createMachine fallback to local storage:', err.message)
  }

  const machines = getLocalMachines(machineData.business_id)
  machines.unshift(localMachine)
  saveLocalMachines(machineData.business_id, machines)
  return localMachine
}

export async function updateMachine(machineId, updates, businessId) {
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

  const machines = getLocalMachines(businessId).map((m) =>
    m.machine_id === machineId ? { ...m, ...updates } : m
  )
  saveLocalMachines(businessId, machines)
  return { machine_id: machineId, ...updates }
}

export async function deleteMachine(machineId, businessId) {
  try {
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('machine_id', machineId)

    if (!error) return true
  } catch (err) {
    console.warn('Supabase deleteMachine fallback:', err.message)
  }

  const machines = getLocalMachines(businessId).filter((m) => m.machine_id !== machineId)
  saveLocalMachines(businessId, machines)
  return true
}

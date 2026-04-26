import { supabase } from './supabase.js'

export const state = {
  currentTab: 'Planning',
  selectedDate: new Date().toISOString().split('T')[0],
  masterKegiatan: [],
  masterBahan: [],
  reports: [],
  loading: false,
  editingId: null,
  toast: null,
}

let listeners = []

export function subscribe(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

export function setState(partial) {
  Object.assign(state, partial)
  listeners.forEach(fn => fn(state))
}

export async function loadMasterKegiatan() {
  const { data } = await supabase.from('master_kegiatan').select('*').order('name')
  setState({ masterKegiatan: data || [] })
}

export async function loadMasterBahan() {
  const { data } = await supabase.from('master_bahan').select('*').order('name')
  setState({ masterBahan: data || [] })
}

export async function addMasterKegiatan(name) {
  const { error } = await supabase.from('master_kegiatan').insert({ name })
  if (error) throw error
  await loadMasterKegiatan()
}

export async function deleteMasterKegiatan(id) {
  const { error } = await supabase.from('master_kegiatan').delete().eq('id', id)
  if (error) throw error
  await loadMasterKegiatan()
}

export async function addMasterBahan(name) {
  const { error } = await supabase.from('master_bahan').insert({ name })
  if (error) throw error
  await loadMasterBahan()
}

export async function deleteMasterBahan(id) {
  const { error } = await supabase.from('master_bahan').delete().eq('id', id)
  if (error) throw error
  await loadMasterBahan()
}

export async function loadReports(tgl, type) {
  setState({ loading: true })
  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('tgl', tgl)
    .eq('type', type)
    .order('created_at')
  setState({ reports: data || [], loading: false })
}

export async function saveReport(payload) {
  const { error } = await supabase.from('reports').insert({ ...payload, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function updateReport(id, payload) {
  const { error } = await supabase.from('reports').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteReport(id) {
  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) throw error
}

export async function deleteAllReports(tgl, type) {
  const { error } = await supabase.from('reports').delete().eq('tgl', tgl).eq('type', type)
  if (error) throw error
}

export async function getReportById(id) {
  const { data } = await supabase.from('reports').select('*').eq('id', id).maybeSingle()
  return data
}

export async function copyPlanningToHasil(tgl) {
  const { data: plans } = await supabase.from('reports').select('*').eq('tgl', tgl).eq('type', 'Planning')
  if (!plans || plans.length === 0) throw new Error('Tidak ada data Planning.')
  const toInsert = plans.map(({ id, created_at, updated_at, ...rest }) => ({
    ...rest,
    type: 'Hasil',
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('reports').insert(toInsert)
  if (error) throw error
}

export async function copyReportToDate(id, targetDate) {
  const data = await getReportById(id)
  if (!data) throw new Error('Data tidak ditemukan.')
  const { id: _, created_at, updated_at, ...rest } = data
  const { error } = await supabase.from('reports').insert({ ...rest, tgl: targetDate, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function getHistoryReports(startDate, endDate, type) {
  let query = supabase.from('reports').select('*').gte('tgl', startDate).lte('tgl', endDate).order('tgl', { ascending: false })
  if (type !== 'SEMUA') query = query.eq('type', type)
  const { data } = await query
  return data || []
}

export async function getDashboardData(tgl) {
  const { data: plans } = await supabase.from('reports').select('*').eq('tgl', tgl).eq('type', 'Planning')
  const { data: hasil } = await supabase.from('reports').select('*').eq('tgl', tgl).eq('type', 'Hasil')
  return { plans: plans || [], hasil: hasil || [] }
}

export function showToast(message, type = 'success') {
  setState({ toast: { message, type } })
  setTimeout(() => setState({ toast: null }), 3000)
}

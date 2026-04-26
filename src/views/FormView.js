import {
  state, setState, loadReports, saveReport, updateReport,
  deleteReport, deleteAllReports, getReportById, copyPlanningToHasil,
  copyReportToDate, showToast
} from '../lib/store.js'
import { sumLuas, cleanSatuan, buildWAText, buildCSV, downloadFile, syncToPipedream, formatTglIndo } from '../lib/utils.js'

const PIPEDREAM_URL = 'https://eom472exw7rrgtv.m.pipedream.net'

let paddockCount = 0
let bahanCount = 0

function calcAllBahan() {
  let totalLuas = 0
  document.querySelectorAll('.p-luas').forEach(el => totalLuas += parseFloat(el.value) || 0)
  document.querySelectorAll('.bahan-item').forEach(item => {
    const dosis = parseFloat(item.querySelector('.b-dosis').value) || 0
    const sat = cleanSatuan(item.querySelector('.b-satuan').value)
    const total = (totalLuas * dosis).toFixed(2)
    item.querySelector('.b-total').value = `${total} ${sat}`
  })
}

function updateBahanOptions(select, selected = '') {
  select.innerHTML = `<option value="">-- Pilih Bahan --</option>` +
    state.masterBahan.map(b => `<option value="${b.name}" ${b.name === selected ? 'selected' : ''}>${b.name}</option>`).join('')
}

function addPaddock(name = '', luas = '') {
  paddockCount++
  const id = `pdk-${paddockCount}`
  const wrap = document.getElementById('paddock-container')
  const div = document.createElement('div')
  div.className = 'dynamic-item paddock-item'
  div.id = id
  div.innerHTML = `
    <div class="dynamic-item-header">
      <span class="dynamic-item-label">Paddock / Area</span>
      <button class="btn-remove" onclick="document.getElementById('${id}').remove(); calcBahan()">&#x2715;</button>
    </div>
    <div class="form-row form-row-2">
      <input class="form-control p-name" type="text" value="${name}" placeholder="Nama Paddock">
      <input class="form-control p-luas" type="number" value="${luas}" placeholder="Luas (Ha)" step="0.01" oninput="calcBahan()">
    </div>`
  wrap.appendChild(div)
}

function addBahan(name = '', dosis = '', satuan = 'L/Ha') {
  bahanCount++
  const id = `bhn-${bahanCount}`
  const wrap = document.getElementById('bahan-container')
  const div = document.createElement('div')
  div.className = 'dynamic-item bahan-item'
  div.id = id
  div.innerHTML = `
    <div class="dynamic-item-header">
      <span class="dynamic-item-label">Bahan & Dosis</span>
      <button class="btn-remove" onclick="document.getElementById('${id}').remove(); calcBahan()">&#x2715;</button>
    </div>
    <select class="form-control b-name" style="margin-bottom:8px;"></select>
    <div class="form-row form-row-3">
      <input class="form-control b-dosis" type="number" value="${dosis}" placeholder="Dosis" step="0.01" oninput="calcBahan()">
      <select class="form-control b-satuan" onchange="calcBahan()">
        <option value="L/Ha" ${satuan==='L/Ha'?'selected':''}>L/Ha</option>
        <option value="mL/Ha" ${satuan==='mL/Ha'?'selected':''}>mL/Ha</option>
        <option value="Kg/Ha" ${satuan==='Kg/Ha'?'selected':''}>Kg/Ha</option>
        <option value="Gram/Ha" ${satuan==='Gram/Ha'?'selected':''}>Gram/Ha</option>
        <option value="Pcs/Ha" ${satuan==='Pcs/Ha'?'selected':''}>Pcs/Ha</option>
      </select>
      <input class="form-control b-total" type="text" placeholder="Total" readonly style="background:var(--neutral-100); font-weight:700;">
    </div>`
  wrap.appendChild(div)
  updateBahanOptions(div.querySelector('.b-name'), name)
}

function clearForm() {
  setState({ editingId: null })
  document.getElementById('kegiatan-select').value = ''
  document.getElementById('hk-input').value = ''
  document.getElementById('unit-input').value = ''
  document.getElementById('jln-input').value = '0'
  document.getElementById('rsk-input').value = '0'
  document.getElementById('std-input').value = '0'
  document.getElementById('ket-input').value = ''
  document.getElementById('paddock-container').innerHTML = ''
  document.getElementById('bahan-container').innerHTML = ''
  addPaddock(); addBahan()
  document.getElementById('btn-update').style.display = 'none'
  document.getElementById('btn-save').style.display = 'block'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function getFormPayload() {
  const paddocks = Array.from(document.querySelectorAll('.paddock-item')).map(el => ({
    name: el.querySelector('.p-name').value,
    luas: parseFloat(el.querySelector('.p-luas').value) || 0
  })).filter(p => p.name.trim() !== '')

  const bahans = Array.from(document.querySelectorAll('.bahan-item')).map(el => ({
    name: el.querySelector('.b-name').value,
    dosis: parseFloat(el.querySelector('.b-dosis').value) || 0,
    satuan: el.querySelector('.b-satuan').value,
    total: parseFloat(el.querySelector('.b-total').value) || 0
  })).filter(b => b.name !== '')

  return {
    tgl: state.selectedDate,
    type: state.currentTab,
    kegiatan: document.getElementById('kegiatan-select').value,
    paddocks, bahans,
    hk: parseInt(document.getElementById('hk-input').value) || 0,
    unit: document.getElementById('unit-input').value,
    jln: parseInt(document.getElementById('jln-input').value) || 0,
    rsk: parseInt(document.getElementById('rsk-input').value) || 0,
    std: parseInt(document.getElementById('std-input').value) || 0,
    ket: document.getElementById('ket-input').value
  }
}

function updateHKFooter() {
  const total = state.reports.reduce((sum, r) => sum + (r.hk || 0), 0)
  const footer = document.getElementById('hk-footer')
  if (footer) footer.innerHTML = `<span>TOTAL HK</span> <span style="font-size:18px;">${total}</span> <span>Orang</span>`
}

function renderReportList() {
  const list = document.getElementById('report-list')
  if (!list) return

  if (state.loading) {
    list.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Memuat data...</span></div>`
    return
  }

  if (state.reports.length === 0) {
    const typeLabel = state.currentTab
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${typeLabel === 'Planning' ? '📋' : '✅'}</div>
        <div class="empty-text">Belum ada data ${typeLabel}</div>
        <div class="empty-sub">Tambahkan data menggunakan form di atas</div>
      </div>`
    return
  }

  list.innerHTML = state.reports.map(r => {
    const luas = sumLuas(r.paddocks)
    const pdkText = (r.paddocks || []).map(p => `${p.name} (${p.luas} Ha)`).join(', ')
    const bahanHTML = (r.bahans || []).map(b => {
      if (typeof b !== 'object') return `<span class="bahan-chip">${b}</span>`
      const sat = cleanSatuan(b.satuan)
      return `<span class="bahan-chip">${b.name}: ${b.dosis}${sat}/Ha</span>`
    }).join('')

    return `
    <div class="report-card">
      <div class="report-card-header">
        <div style="flex:1; min-width:0;">
          <div class="report-card-title">${r.kegiatan}</div>
          <div class="report-card-sub">${pdkText || '-'}</div>
        </div>
        <div class="report-card-actions">
          <button class="btn btn-ghost btn-xs" onclick="formEdit('${r.id}')">Edit</button>
          <button class="btn btn-ghost btn-xs" onclick="formCopy('${r.id}')">Salin</button>
          <button class="btn btn-danger btn-xs" onclick="formDelete('${r.id}')">Hapus</button>
        </div>
      </div>
      <div class="report-card-body">
        <div class="stats-row">
          <div class="stat-chip"><div class="stat-value">${luas.toFixed(2)}</div><div class="stat-label">Ha</div></div>
          <div class="stat-chip"><div class="stat-value">${r.hk || 0}</div><div class="stat-label">HK</div></div>
          <div class="stat-chip"><div class="stat-value" style="font-size:13px;">${r.unit || '-'}</div><div class="stat-label">Unit</div></div>
        </div>
        <div style="display:flex; gap:6px; margin-bottom:8px;">
          <span style="flex:1; text-align:center; padding:5px; background:var(--success-100); color:var(--success-600); border-radius:6px; font-size:11px; font-weight:700;">Rdy: ${r.jln || 0}</span>
          <span style="flex:1; text-align:center; padding:5px; background:var(--danger-100); color:var(--danger-600); border-radius:6px; font-size:11px; font-weight:700;">Bdn: ${r.rsk || 0}</span>
          <span style="flex:1; text-align:center; padding:5px; background:var(--warning-100); color:var(--warning-600); border-radius:6px; font-size:11px; font-weight:700;">Sby: ${r.std || 0}</span>
        </div>
        ${bahanHTML ? `<div style="margin-top:4px;">${bahanHTML}</div>` : ''}
        ${r.ket ? `<div class="report-detail-row" style="margin-top:8px;"><span class="detail-icon">&#8505;</span><span>${r.ket}</span></div>` : ''}
      </div>
    </div>`
  }).join('')

  updateHKFooter()
}

// Global handlers exposed for inline events
window.calcBahan = calcAllBahan
window.formEdit = async (id) => {
  const r = await getReportById(id)
  if (!r) return showToast('Data tidak ditemukan', 'error')
  setState({ editingId: id })
  document.getElementById('kegiatan-select').value = r.kegiatan
  document.getElementById('hk-input').value = r.hk
  document.getElementById('unit-input').value = r.unit || ''
  document.getElementById('jln-input').value = r.jln || 0
  document.getElementById('rsk-input').value = r.rsk || 0
  document.getElementById('std-input').value = r.std || 0
  document.getElementById('ket-input').value = r.ket || ''
  document.getElementById('paddock-container').innerHTML = ''
  ;(r.paddocks || []).forEach(p => addPaddock(p.name, p.luas))
  document.getElementById('bahan-container').innerHTML = ''
  ;(r.bahans || []).forEach(b => {
    if (typeof b === 'object') addBahan(b.name, b.dosis, b.satuan)
    else addBahan(b, '', 'L/Ha')
  })
  document.getElementById('btn-save').style.display = 'none'
  document.getElementById('btn-update').style.display = 'block'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

window.formCopy = async (id) => {
  const tgl = prompt('Salin kegiatan ini ke tanggal? (YYYY-MM-DD)', state.selectedDate)
  if (!tgl) return
  try {
    await copyReportToDate(id, tgl)
    showToast('Berhasil disalin!')
    if (tgl === state.selectedDate) await loadReports(state.selectedDate, state.currentTab)
  } catch (e) { showToast('Gagal menyalin.', 'error') }
}

window.formDelete = async (id) => {
  if (!confirm('Hapus kegiatan ini?')) return
  try {
    await deleteReport(id)
    await loadReports(state.selectedDate, state.currentTab)
    renderReportList()
    showToast('Data dihapus.')
  } catch (e) { showToast('Gagal menghapus.', 'error') }
}

export function renderFormView(container) {
  const tab = state.currentTab
  const kegiatanOptions = state.masterKegiatan.map(k => `<option value="${k.name}">${k.name}</option>`).join('')

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Input ${tab}</span>
        <button class="btn btn-danger btn-sm" id="btn-hapus-semua">Hapus Semua</button>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Kegiatan</label>
          <select class="form-control" id="kegiatan-select">
            <option value="">-- Pilih Kegiatan --</option>
            ${kegiatanOptions}
          </select>
        </div>

        <div class="section-label">Area Paddock</div>
        <div id="paddock-container"></div>
        <button class="btn btn-dashed" onclick="window.addPdk()">+ Tambah Paddock</button>

        <div class="divider"></div>

        <div class="form-group">
          <label class="form-label">Tenaga Kerja & Alat</label>
          <div class="form-row form-row-2">
            <input class="form-control" type="number" id="hk-input" placeholder="Jumlah HK">
            <input class="form-control" type="text" id="unit-input" placeholder="Alat / Unit">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Status Alat</label>
          <div class="equip-row">
            <div class="equip-pill ready">
              <input type="number" id="jln-input" value="0" min="0">
              <div class="equip-pill-label">Ready</div>
            </div>
            <div class="equip-pill breakdown">
              <input type="number" id="rsk-input" value="0" min="0">
              <div class="equip-pill-label">Breakdown</div>
            </div>
            <div class="equip-pill standby">
              <input type="number" id="std-input" value="0" min="0">
              <div class="equip-pill-label">Standby</div>
            </div>
          </div>
        </div>

        <div class="section-label">Bahan & Dosis</div>
        <div id="bahan-container"></div>
        <button class="btn btn-dashed" style="margin-bottom:12px;" onclick="window.addBhn()">+ Tambah Bahan</button>

        <div class="form-group">
          <label class="form-label">Keterangan</label>
          <textarea class="form-control" id="ket-input" rows="2" placeholder="Keterangan tambahan..."></textarea>
        </div>

        <button class="btn btn-primary btn-full" id="btn-save" onclick="window.doSave()">Simpan Data</button>
        <button class="btn btn-info btn-full" id="btn-update" style="display:none; margin-top:8px;" onclick="window.doUpdate()">Update Data</button>
        <button class="btn btn-ghost btn-full btn-sm" style="margin-top:8px;" id="btn-cancel" onclick="window.doCancel()">Batal / Reset Form</button>
      </div>
    </div>

    <div class="section-label">Daftar ${tab} — ${formatTglIndo(state.selectedDate)}</div>

    <div class="action-bar">
      <button class="btn btn-success btn-sm" onclick="window.doSalinWA()">Salin WA</button>
      <button class="btn btn-ghost btn-sm" onclick="window.doKeSalin()">
        ${tab === 'Planning' ? 'Ke Hasil' : 'Ke Planning'}
      </button>
      <button class="btn btn-info btn-sm" onclick="window.doCSV()">CSV</button>
    </div>
    <button class="btn btn-warning btn-full btn-sm" style="margin-bottom:12px;" onclick="window.doSync()">Sinkron ke Spreadsheet</button>

    <div id="report-list"></div>
  `

  // expose add functions
  window.addPdk = () => addPaddock()
  window.addBhn = () => addBahan()

  window.doSave = async () => {
    const payload = getFormPayload()
    if (!payload.kegiatan) return showToast('Pilih kegiatan terlebih dahulu!', 'error')
    try {
      await saveReport(payload)
      showToast('Data berhasil disimpan!')
      clearForm()
      await loadReports(state.selectedDate, state.currentTab)
      renderReportList()
    } catch (e) { showToast('Gagal menyimpan.', 'error') }
  }

  window.doUpdate = async () => {
    if (!state.editingId) return
    const payload = getFormPayload()
    if (!payload.kegiatan) return showToast('Pilih kegiatan!', 'error')
    try {
      await updateReport(state.editingId, payload)
      showToast('Data berhasil diupdate!')
      clearForm()
      await loadReports(state.selectedDate, state.currentTab)
      renderReportList()
    } catch (e) { showToast('Gagal update.', 'error') }
  }

  window.doCancel = () => clearForm()

  window.doSalinWA = async () => {
    if (state.reports.length === 0) return showToast('Tidak ada data.', 'info')
    const text = buildWAText(state.currentTab, state.selectedDate, state.reports)
    try {
      await navigator.clipboard.writeText(text)
      showToast('Laporan WA disalin!')
    } catch { showToast('Gagal menyalin.', 'error') }
  }

  window.doKeSalin = async () => {
    const src = state.currentTab === 'Planning' ? 'Planning' : 'Hasil'
    const dest = state.currentTab === 'Planning' ? 'Hasil' : 'Planning'
    if (!confirm(`Salin semua ${src} tanggal ${formatTglIndo(state.selectedDate)} ke ${dest}?`)) return
    try {
      await copyPlanningToHasil(state.selectedDate)
      showToast(`Berhasil disalin ke ${dest}!`)
    } catch (e) { showToast(e.message, 'error') }
  }

  window.doCSV = () => {
    if (state.reports.length === 0) return showToast('Tidak ada data.', 'info')
    const csv = buildCSV(state.reports, state.selectedDate, state.currentTab)
    downloadFile(csv, `Upkeep_${state.selectedDate}.csv`, 'text/csv')
  }

  window.doSync = async () => {
    if (!confirm(`Sinkron data tanggal ${formatTglIndo(state.selectedDate)} ke Spreadsheet?`)) return
    const btn = document.querySelector('[onclick="window.doSync()"]')
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...' }
    try {
      const count = await syncToPipedream(state.selectedDate, state.reports, PIPEDREAM_URL)
      showToast(`Sinkronisasi berhasil! ${count} baris terkirim.`)
    } catch (e) { showToast('Gagal sinkronisasi. Cek koneksi.', 'error') }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Sinkron ke Spreadsheet' } }
  }

  document.getElementById('btn-hapus-semua').addEventListener('click', async () => {
    if (!confirm(`Hapus SEMUA data ${state.currentTab} tanggal ${formatTglIndo(state.selectedDate)}?`)) return
    try {
      await deleteAllReports(state.selectedDate, state.currentTab)
      await loadReports(state.selectedDate, state.currentTab)
      renderReportList()
      showToast('Semua data dihapus.')
    } catch (e) { showToast('Gagal menghapus.', 'error') }
  })

  // Initial rows
  addPaddock(); addBahan()

  // Refresh bahan dropdowns when master loads
  const refreshBahanDropdowns = () => {
    document.querySelectorAll('.b-name').forEach(sel => updateBahanOptions(sel, sel.value))
  }
  refreshBahanDropdowns()

  renderReportList()
  loadReports(state.selectedDate, state.currentTab).then(() => renderReportList())
}

export function refreshFormList() {
  renderReportList()
}

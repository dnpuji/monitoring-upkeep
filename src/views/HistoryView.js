import { getHistoryReports } from '../lib/store.js'
import { sumLuas, buildCSV, downloadFile, formatTglIndo } from '../lib/utils.js'

let cachedHistory = []

export function renderHistoryView(container) {
  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">History Kerja</span>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Rentang Tanggal</label>
          <div class="form-row form-row-2">
            <input class="form-control" type="date" id="hist-start" value="${monthAgo}">
            <input class="form-control" type="date" id="hist-end" value="${today}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Tipe Data</label>
          <div style="display:flex; gap:8px;">
            <label style="flex:1; display:flex; align-items:center; gap:6px; padding:10px 12px; border:1.5px solid var(--neutral-200); border-radius:var(--radius-md); cursor:pointer; font-size:13px; font-weight:600;">
              <input type="radio" name="filter-tipe" value="SEMUA" checked> Semua
            </label>
            <label style="flex:1; display:flex; align-items:center; gap:6px; padding:10px 12px; border:1.5px solid var(--neutral-200); border-radius:var(--radius-md); cursor:pointer; font-size:13px; font-weight:600;">
              <input type="radio" name="filter-tipe" value="Planning"> Planning
            </label>
            <label style="flex:1; display:flex; align-items:center; gap:6px; padding:10px 12px; border:1.5px solid var(--neutral-200); border-radius:var(--radius-md); cursor:pointer; font-size:13px; font-weight:600;">
              <input type="radio" name="filter-tipe" value="Hasil"> Hasil
            </label>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="btn-cari">Cari Data History</button>
        <button class="btn btn-info btn-full btn-sm" id="btn-download-hist" style="display:none; margin-top:8px;">Download CSV</button>
      </div>
    </div>

    <div id="history-results"></div>
  `

  container.querySelector('#btn-cari').addEventListener('click', async () => {
    const start = container.querySelector('#hist-start').value
    const end = container.querySelector('#hist-end').value
    const type = container.querySelector('input[name="filter-tipe"]:checked').value
    if (!start || !end) return

    const results = container.querySelector('#history-results')
    results.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Mencari data...</span></div>`

    cachedHistory = await getHistoryReports(start, end, type)

    if (cachedHistory.length === 0) {
      results.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">Data tidak ditemukan</div>
          <div class="empty-sub">Coba ubah rentang tanggal atau filter tipe</div>
        </div>`
      container.querySelector('#btn-download-hist').style.display = 'none'
      return
    }

    container.querySelector('#btn-download-hist').style.display = 'block'

    const grouped = {}
    cachedHistory.forEach(d => {
      if (!grouped[d.tgl]) grouped[d.tgl] = []
      grouped[d.tgl].push(d)
    })

    let html = ''
    for (const tgl in grouped) {
      html += `<div class="section-label">${formatTglIndo(tgl)}</div>`
      grouped[tgl].forEach(d => {
        const luas = sumLuas(d.paddocks)
        const typeClass = d.type === 'Planning' ? 'type-planning' : 'type-hasil'
        const badgeClass = d.type === 'Planning' ? 'planning' : 'hasil'
        html += `
          <div class="history-item ${typeClass}">
            <div class="history-item-header">
              <span class="history-date">${(d.paddocks || []).map(p => p.name).join(', ')}</span>
              <span class="history-type-badge ${badgeClass}">${d.type}</span>
            </div>
            <div class="history-title">${d.kegiatan}</div>
            <div class="history-meta">Luas: ${luas.toFixed(2)} Ha &nbsp;|&nbsp; HK: ${d.hk || 0} &nbsp;|&nbsp; Alat: ${d.unit || '-'}</div>
          </div>`
      })
    }

    results.innerHTML = html
  })

  container.querySelector('#btn-download-hist').addEventListener('click', () => {
    if (!cachedHistory.length) return
    const csv = buildCSV(cachedHistory, '', 'History')
    downloadFile(csv, `History_Upkeep_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
  })
}

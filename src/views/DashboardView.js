import { getDashboardData } from '../lib/store.js'
import { sumLuas, formatTglIndo } from '../lib/utils.js'

let html2canvasLoaded = false

async function loadHtml2canvas() {
  if (html2canvasLoaded || window.html2canvas) return
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    s.onload = () => { html2canvasLoaded = true; resolve() }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function getBadgeClass(pct) {
  if (pct >= 100) return 'badge-success'
  if (pct >= 80) return 'badge-warning'
  return 'badge-danger'
}

function getBadgeText(pct) {
  if (pct >= 100) return 'Tercapai'
  if (pct >= 80) return 'Mendekati'
  return 'Belum'
}

function getBadgeColor(pct) {
  if (pct >= 100) return 'var(--success-600)'
  if (pct >= 80) return 'var(--warning-600)'
  return 'var(--danger-600)'
}

async function renderDashboard(tgl, container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Memuat dashboard...</span></div>`

  const { plans, hasil } = await getDashboardData(tgl)

  if (plans.length === 0 && hasil.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-text">Tidak ada data pada tanggal ini</div>
        <div class="empty-sub">Tambahkan data Planning atau Hasil terlebih dahulu</div>
      </div>`
    return
  }

  const mapData = {}
  plans.forEach(d => {
    if (!mapData[d.kegiatan]) mapData[d.kegiatan] = { pLuas: 0, pHK: 0, hLuas: 0, hHK: 0 }
    mapData[d.kegiatan].pLuas += sumLuas(d.paddocks)
    mapData[d.kegiatan].pHK += d.hk || 0
  })
  hasil.forEach(d => {
    if (!mapData[d.kegiatan]) mapData[d.kegiatan] = { pLuas: 0, pHK: 0, hLuas: 0, hHK: 0 }
    mapData[d.kegiatan].hLuas += sumLuas(d.paddocks)
    mapData[d.kegiatan].hHK += d.hk || 0
  })

  const totalPlanHK = plans.reduce((s, d) => s + (d.hk || 0), 0)
  const totalHasilHK = hasil.reduce((s, d) => s + (d.hk || 0), 0)
  const totalPlanLuas = plans.reduce((s, d) => s + sumLuas(d.paddocks), 0)
  const totalHasilLuas = hasil.reduce((s, d) => s + sumLuas(d.paddocks), 0)
  const pctTotalLuas = totalPlanLuas > 0 ? Math.round((totalHasilLuas / totalPlanLuas) * 100) : 0
  const pctTotalHK = totalPlanHK > 0 ? Math.round((totalHasilHK / totalPlanHK) * 100) : 0

  let html = `
    <div style="background:var(--primary-800); border-radius:var(--radius-lg); padding:16px; margin-bottom:16px; color:white;">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:var(--primary-300); margin-bottom:12px;">Ringkasan ${formatTglIndo(tgl)}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px;">
        <div style="text-align:center;">
          <div style="font-size:18px; font-weight:800;">${totalPlanLuas.toFixed(1)}</div>
          <div style="font-size:10px; color:var(--primary-300);">Plan Ha</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px; font-weight:800;">${totalHasilLuas.toFixed(1)}</div>
          <div style="font-size:10px; color:var(--primary-300);">Hasil Ha</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px; font-weight:800;">${totalPlanHK}</div>
          <div style="font-size:10px; color:var(--primary-300);">Plan HK</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px; font-weight:800;">${totalHasilHK}</div>
          <div style="font-size:10px; color:var(--primary-300);">Hasil HK</div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px;">
        <div style="background:rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:10px; text-align:center;">
          <div style="font-size:22px; font-weight:800; color:${getBadgeColor(pctTotalLuas)};">${pctTotalLuas}%</div>
          <div style="font-size:10px; color:var(--primary-300);">Realisasi Luas</div>
        </div>
        <div style="background:rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:10px; text-align:center;">
          <div style="font-size:22px; font-weight:800; color:${getBadgeColor(pctTotalHK)};">${pctTotalHK}%</div>
          <div style="font-size:10px; color:var(--primary-300);">Realisasi HK</div>
        </div>
      </div>
    </div>`

  for (const keg in mapData) {
    const d = mapData[keg]
    const pctLuas = d.pLuas > 0 ? Math.round((d.hLuas / d.pLuas) * 100) : 0
    const hkPerHaPlan = d.pLuas > 0 ? (d.pHK / d.pLuas).toFixed(2) : '0'
    const hkPerHaHasil = d.hLuas > 0 ? (d.hHK / d.hLuas).toFixed(2) : '0'
    const pctHKPerHa = parseFloat(hkPerHaPlan) > 0 ? Math.round((parseFloat(hkPerHaHasil) / parseFloat(hkPerHaPlan)) * 100) : 0

    html += `
    <div class="flow-card">
      <div class="flow-card-title">${keg}</div>
      <div class="flow-body">
        <div class="flow-compare">
          <div class="flow-box">
            <div class="flow-box-label plan">Planning</div>
            <div class="flow-metric"><span class="val">${d.pLuas.toFixed(2)}</span> Ha</div>
            <div class="flow-metric"><span class="val">${d.pHK}</span> HK</div>
            <div class="flow-metric"><span class="val">${hkPerHaPlan}</span> HK/Ha</div>
          </div>
          <div class="flow-arrow">&#8594;</div>
          <div class="flow-box">
            <div class="flow-box-label hasil">Hasil</div>
            <div class="flow-metric"><span class="val">${d.hLuas.toFixed(2)}</span> Ha</div>
            <div class="flow-metric"><span class="val">${d.hHK}</span> HK</div>
            <div class="flow-metric"><span class="val">${hkPerHaHasil}</span> HK/Ha</div>
          </div>
        </div>
        <div class="flow-status-grid">
          <div class="status-item">
            <div class="status-label">Realisasi Luas</div>
            <div class="status-pct" style="color:${getBadgeColor(pctLuas)};">${pctLuas}%</div>
            <div class="status-badge ${getBadgeClass(pctLuas)}">${getBadgeText(pctLuas)}</div>
          </div>
          <div class="status-item">
            <div class="status-label">Efisiensi HK/Ha</div>
            <div class="status-pct" style="color:${getBadgeColor(pctHKPerHa)};">${pctHKPerHa}%</div>
            <div class="status-badge ${getBadgeClass(pctHKPerHa)}">${getBadgeText(pctHKPerHa)}</div>
          </div>
        </div>
      </div>
    </div>`
  }

  container.innerHTML = html
}

export function renderDashboardView(container) {
  const today = new Date().toISOString().split('T')[0]

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Dashboard Harian</span>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Tanggal</label>
          <input class="form-control" type="date" id="dash-date" value="${today}">
        </div>
        <button class="btn btn-primary btn-full" id="btn-dash-load">Tampilkan Dashboard</button>
        <button class="btn btn-ghost btn-full btn-sm" style="margin-top:8px;" id="btn-dash-download">Download JPG</button>
      </div>
    </div>
    <div id="dash-content"></div>
  `

  const dashContent = container.querySelector('#dash-content')

  container.querySelector('#btn-dash-load').addEventListener('click', () => {
    const tgl = container.querySelector('#dash-date').value
    renderDashboard(tgl, dashContent)
  })

  container.querySelector('#btn-dash-download').addEventListener('click', async () => {
    if (!dashContent.children.length) return
    await loadHtml2canvas()
    window.html2canvas(dashContent, { scale: 2, backgroundColor: '#f1f5f9' }).then(canvas => {
      const link = document.createElement('a')
      link.download = `Dashboard_${container.querySelector('#dash-date').value}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.9)
      link.click()
    })
  })

  renderDashboard(today, dashContent)
}

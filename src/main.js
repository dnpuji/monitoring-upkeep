import './styles/main.css'
import { state, setState, subscribe, loadMasterKegiatan, loadMasterBahan, loadReports, showToast } from './lib/store.js'
import { renderFormView } from './views/FormView.js'
import { renderDashboardView } from './views/DashboardView.js'
import { renderHistoryView } from './views/HistoryView.js'
import { renderMasterView } from './views/MasterView.js'
import { formatTglIndo } from './lib/utils.js'

const TABS = [
  { id: 'Planning', icon: '📋', label: 'Plan' },
  { id: 'Hasil',    icon: '✅', label: 'Hasil' },
  { id: 'Dashboard', icon: '📈', label: 'Dashboard' },
  { id: 'History',  icon: '📊', label: 'History' },
  { id: 'Master',   icon: '⚙️', label: 'Master' },
]

function buildShell() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <header class="app-header">
      <div class="logo">🌿</div>
      <div class="header-text">
        <div class="header-title">Monitoring Upkeep</div>
        <div class="header-sub">Daily Work Plan</div>
      </div>
      <button class="date-pill" id="date-pill">${formatTglIndo(state.selectedDate)}</button>
    </header>

    <div class="app-content" id="main-content"></div>

    <div class="hk-footer" id="hk-footer">
      <span>TOTAL HK</span> <span style="font-size:18px;">0</span> <span>Orang</span>
    </div>

    <nav class="bottom-nav" id="bottom-nav">
      ${TABS.map(t => `
        <button class="nav-item ${t.id === state.currentTab ? 'active' : ''}" data-tab="${t.id}">
          <span class="nav-icon">${t.icon}</span>
          <span class="nav-label">${t.label}</span>
        </button>
      `).join('')}
    </nav>

    <div id="date-modal" style="display:none;" class="modal-overlay">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Pilih Tanggal</div>
        <input class="form-control" type="date" id="date-picker" value="${state.selectedDate}" style="margin-bottom:16px;">
        <button class="btn btn-primary btn-full" id="btn-date-ok">Terapkan</button>
        <button class="btn btn-ghost btn-full btn-sm" style="margin-top:8px;" id="btn-date-cancel">Batal</button>
      </div>
    </div>

    <div class="toast-container" id="toast-container"></div>
  `

  // Date pill
  document.getElementById('date-pill').addEventListener('click', () => {
    document.getElementById('date-modal').style.display = 'flex'
  })
  document.getElementById('btn-date-cancel').addEventListener('click', () => {
    document.getElementById('date-modal').style.display = 'none'
  })
  document.getElementById('btn-date-ok').addEventListener('click', () => {
    const newDate = document.getElementById('date-picker').value
    setState({ selectedDate: newDate })
    document.getElementById('date-pill').textContent = formatTglIndo(newDate)
    document.getElementById('date-modal').style.display = 'none'
    navigateTo(state.currentTab)
  })
  document.getElementById('date-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('date-modal')) {
      document.getElementById('date-modal').style.display = 'none'
    }
  })

  // Nav
  document.getElementById('bottom-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]')
    if (!btn) return
    navigateTo(btn.dataset.tab)
  })

  // Hide HK footer on non-form tabs
  toggleHKFooter()
}

function toggleHKFooter() {
  const footer = document.getElementById('hk-footer')
  if (!footer) return
  const showFooter = state.currentTab === 'Planning' || state.currentTab === 'Hasil'
  footer.style.display = showFooter ? 'flex' : 'none'

  // Adjust content padding
  const content = document.getElementById('main-content')
  if (content) {
    content.style.paddingBottom = showFooter
      ? 'calc(var(--nav-h) + 48px + 24px)'
      : 'calc(var(--nav-h) + 24px)'
  }
}

function setActiveNav(tab) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab)
  })
}

async function navigateTo(tab) {
  setState({ currentTab: tab })
  setActiveNav(tab)
  toggleHKFooter()

  const content = document.getElementById('main-content')
  content.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Memuat...</span></div>`

  if (tab === 'Planning' || tab === 'Hasil') {
    await loadReports(state.selectedDate, tab)
    renderFormView(content)
  } else if (tab === 'Dashboard') {
    renderDashboardView(content)
  } else if (tab === 'History') {
    renderHistoryView(content)
  } else if (tab === 'Master') {
    await renderMasterView(content)
  }
}

// Toast subscription
subscribe(({ toast }) => {
  const container = document.getElementById('toast-container')
  if (!container) return
  if (toast) {
    container.innerHTML = `<div class="toast ${toast.type || 'success'}">${toast.message}</div>`
  } else {
    container.innerHTML = ''
  }
})

async function init() {
  buildShell()
  await Promise.all([loadMasterKegiatan(), loadMasterBahan()])
  await navigateTo(state.currentTab)
}

init()
